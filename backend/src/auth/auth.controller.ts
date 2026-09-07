import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./auth.dto";
import { User } from "@prisma/client";

@Controller("api/v1/auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  async register(@Body() payload: RegisterDto) {
    return this.auth.register(payload);
  }

  @Post("login")
  async login(@Body() payload: LoginDto) {
    return this.auth.login(payload);
  }

  @Get("me")
  @UseGuards(AuthGuard("jwt"))
  me(@Req() req: { user: User }) {
    return this.auth.toRead(req.user);
  }
}
