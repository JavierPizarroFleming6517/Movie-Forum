const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const CONTAINER_NAME = "movie-forum-db";
const SQL_FILE = path.join(__dirname, "demo-metrics.sql");
const DEST_PATH = "/tmp/demo-metrics.sql";

function log(msg) {
  console.log(`[demo-metrics] ${msg}`);
}

function error(msg) {
  console.error(`[demo-metrics] ERROR: ${msg}`);
}

function run(cmd, args, opts = {}) {
  log(`$ ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (result.status !== 0) {
    error(`Command exited with code ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

if (!fs.existsSync(SQL_FILE)) {
  error(`SQL file not found: ${SQL_FILE}`);
  process.exit(1);
}

log("Checking database container...");
const ps = spawnSync("docker", ["ps", "--filter", `name=${CONTAINER_NAME}`, "--filter", "status=running", "-q"], { encoding: "utf8" });
if (!ps.stdout.trim()) {
  error(`Container "${CONTAINER_NAME}" is not running.`);
  error("Start it first with: docker compose up -d db");
  process.exit(1);
}
log(`Container ${CONTAINER_NAME} is running.`);

log("Copying SQL file to container...");
run("docker", ["cp", SQL_FILE, `${CONTAINER_NAME}:${DEST_PATH}`]);

log("Executing seed inside container...");
run("docker", ["exec", "-u", "root", CONTAINER_NAME, "psql", "-U", "foro", "-d", "foro_peliculas", "-v", "ON_ERROR_STOP=1", "-f", DEST_PATH]);

log("Demo metrics seed completed successfully.");