import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { AdminGuard } from "./admin.guard";
import { AuthService } from "./auth.service";
import { User } from "@prisma/client";

function contextWith(user?: Partial<User>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as ExecutionContext;
}

describe("AdminGuard", () => {
  const auth = { isAdmin: jest.fn() };
  const guard = new AdminGuard(auth as unknown as AuthService);

  it("allows an admin user", () => {
    auth.isAdmin.mockReturnValue(true);
    expect(guard.canActivate(contextWith({ username: "chino" }))).toBe(true);
  });

  it("rejects a missing user", () => {
    auth.isAdmin.mockReturnValue(false);
    expect(() => guard.canActivate(contextWith())).toThrow(ForbiddenException);
  });

  it("rejects a regular member", () => {
    auth.isAdmin.mockReturnValue(false);
    expect(() => guard.canActivate(contextWith({ username: "ana" }))).toThrow(ForbiddenException);
  });
});
