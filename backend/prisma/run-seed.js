const fs = require("fs");
const path = require("path");

const compiled = path.join(__dirname, "..", "dist-seed", "seed.js");

if (fs.existsSync(compiled)) {
  require(compiled);
} else {
  require("ts-node").register({ transpileOnly: true });
  require("./seed.ts");
}