import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

const user = {
  id: 7,
  email: "ana@foro.test",
  username: "ana",
  hashedPassword: "",
  isActive: true,
  createdAt: new Date("2026-01-01"),
};

describe("AuthService", () => {
  let prisma: { user: { findFirst: jest.Mock; create: jest.Mock }; review: { findMany: jest.Mock } };
  let jwt: { sign: jest.Mock };
  let config: { get: jest.Mock };
  let service: AuthService;

  beforeEach(async () => {
    prisma = { user: { findFirst: jest.fn(), create: jest.fn() }, review: { findMany: jest.fn() } };
    jwt = { sign: jest.fn().mockReturnValue("tok") };
    config = { get: jest.fn().mockReturnValue("60") };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
    );
    user.hashedPassword = await bcrypt.hash("secret1", 4);
  });

  it("registers a new user and issues a token", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(user);
    const result = await service.register({
      email: user.email,
      username: user.username,
      password: "secret1",
    });
    expect(result.access_token).toBe("tok");
    expect(result.token_type).toBe("bearer");
    expect(result.user.username).toBe("ana");
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it("rejects a duplicate email or username", async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    await expect(
      service.register({ email: user.email, username: "otro", password: "secret1" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("logs in with username and password", async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    const result = await service.login({ username: "ana", password: "secret1" });
    expect(result.user.email).toBe(user.email);
    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: "7", username: "ana" },
      { expiresIn: "60m" },
    );
  });

  it("rejects a wrong password", async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    await expect(service.login({ username: "ana", password: "nope" })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects a missing user", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.login({ username: "x", password: "secret1" })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects an inactive user", async () => {
    prisma.user.findFirst.mockResolvedValue({ ...user, isActive: false });
    await expect(service.login({ username: "ana", password: "secret1" })).rejects.toMatchObject({
      message: "Usuario inactivo",
    });
  });

  it("uses the default token lifetime when config is empty", async () => {
    config.get.mockReturnValue(undefined);
    prisma.user.findFirst.mockResolvedValue(user);
    await service.login({ username: "ana", password: "secret1" });
    expect(jwt.sign).toHaveBeenCalledWith(expect.any(Object), { expiresIn: "1440m" });
  });

  it("maps a user to the public read model", () => {
    expect(service.toRead(user)).toEqual({
      id: 7,
      email: user.email,
      username: "ana",
      created_at: user.createdAt,
    });
  });

  it("lists the current user's reviews with movie data", async () => {
    prisma.review.findMany.mockResolvedValue([
      {
        id: 1,
        rating: 4,
        comment: "Buena",
        createdAt: new Date("2026-02-01"),
        peliculaId: 550,
        pelicula: { titulo: "El club de la lucha", posterUrl: "/p.jpg" },
      },
    ]);
    await expect(service.listMyReviews(user)).resolves.toEqual([
      {
        id: 1,
        rating: 4,
        comment: "Buena",
        created_at: new Date("2026-02-01"),
        pelicula_id: 550,
        titulo: "El club de la lucha",
        poster_url: "/p.jpg",
      },
    ]);
  });
});
