import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./auth.dto";
import { User } from "@prisma/client";

@ApiTags("auth")
@Controller("api/v1/auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @ApiOperation({
    summary: "Registrar un nuevo usuario",
    description:
      "Crea una cuenta y devuelve directamente un token JWT, por lo que no hace falta " +
      "hacer login después. El correo debe ser único.",
  })
  @ApiCreatedResponse({ description: "Usuario creado y token emitido." })
  @ApiConflictResponse({ description: "El correo ya está registrado.", example: { message: "El correo ya está registrado" } })
  async register(@Body() payload: RegisterDto) {
    return this.auth.register(payload);
  }

  @Post("login")
  @ApiOperation({
    summary: "Iniciar sesión",
    description:
      "Autentica al usuario por nombre de usuario **o** correo y emite un JWT " +
      "(`Authorization: Bearer <token>`) con la expiración definida en ACCESS_TOKEN_EXPIRE_MINUTES.",
  })
  @ApiOkResponse({ description: "Credenciales válidas. Incluye `access_token`." })
  @ApiUnauthorizedResponse({
    description: "Credenciales incorrectas o usuario inactivo.",
    example: { message: "Credenciales incorrectas" },
  })
  async login(@Body() payload: LoginDto) {
    return this.auth.login(payload);
  }

  @Get("me")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth("bearer")
  @ApiOperation({
    summary: "Perfil del usuario autenticado",
    description: "Devuelve los datos del usuario del token, incluido `is_admin` derivado del rol.",
  })
  @ApiOkResponse({ description: "Perfil del usuario autenticado." })
  @ApiUnauthorizedResponse({ description: "Token ausente, inválido o expirado." })
  me(@Req() req: { user: User }) {
    return this.auth.toRead(req.user);
  }

  @Get("reviews")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth("bearer")
  @ApiOperation({
    summary: "Mis reseñas",
    description: "Lista las reseñas escritas por el usuario autenticado, sin exponer contraseñas hasheadas.",
  })
  @ApiOkResponse({ description: "Reseñas del usuario autenticado." })
  @ApiUnauthorizedResponse({ description: "Token ausente, inválido o expirado." })
  reviews(@Req() req: { user: User }) {
    return this.auth.listMyReviews(req.user);
  }
}