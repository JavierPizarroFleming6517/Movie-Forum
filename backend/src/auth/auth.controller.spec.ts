import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { User } from "@prisma/client";

describe("AuthController", () => {
  const auth = {
    register: jest.fn().mockResolvedValue({ access_token: "a" }),
    login: jest.fn().mockResolvedValue({ access_token: "b" }),
    toRead: jest.fn().mockReturnValue({ id: 1, username: "ana" }),
    listMyReviews: jest.fn().mockResolvedValue([]),
  };
  const controller = new AuthController(auth as unknown as AuthService);
  const user = { id: 1, username: "ana" } as User;

  it("delegates register", async () => {
    const payload = { email: "a@b.c", username: "ana", password: "secret1" };
    await expect(controller.register(payload)).resolves.toEqual({ access_token: "a" });
    expect(auth.register).toHaveBeenCalledWith(payload);
  });

  it("delegates login", async () => {
    const payload = { username: "ana", password: "secret1" };
    await expect(controller.login(payload)).resolves.toEqual({ access_token: "b" });
  });

  it("returns the current user", () => {
    expect(controller.me({ user })).toEqual({ id: 1, username: "ana" });
    expect(auth.toRead).toHaveBeenCalledWith(user);
  });

  it("lists the current user's reviews", async () => {
    await expect(controller.reviews({ user })).resolves.toEqual([]);
    expect(auth.listMyReviews).toHaveBeenCalledWith(user);
  });
});
