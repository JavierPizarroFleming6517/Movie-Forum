import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtStrategy } from "./jwt.strategy";
import { PrismaService } from "../prisma/prisma.service";

describe("JwtStrategy", () => {
  const prisma = { user: { findUnique: jest.fn() } };
  const config = { get: jest.fn().mockReturnValue("secret") };

  const strategy = new JwtStrategy(
    config as unknown as ConfigService,
    prisma as unknown as PrismaService,
  );

  const active = {
    id: 3,
    email: "a@b.c",
    username: "ana",
    hashedPassword: "x",
    isActive: true,
    createdAt: new Date(),
  };

  it("returns the user when the token subject is active", async () => {
    prisma.user.findUnique.mockResolvedValue(active);
    await expect(strategy.validate({ sub: "3" })).resolves.toEqual(active);
  });

  it("rejects a missing user", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(strategy.validate({ sub: "9" })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects an inactive user", async () => {
    prisma.user.findUnique.mockResolvedValue({ ...active, isActive: false });
    await expect(strategy.validate({ sub: "3" })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
