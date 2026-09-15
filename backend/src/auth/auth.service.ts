import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto, RegisterDto } from "./auth.dto";
import { User } from "@prisma/client";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(payload: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: payload.email }, { username: payload.username }] },
    });
    if (existing) {
      throw new ConflictException("El email o el nombre de usuario ya están registrados");
    }
    const hashedPassword = await bcrypt.hash(payload.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: payload.email,
        username: payload.username,
        hashedPassword,
      },
    });
    return this.issueToken(user);
  }

  async login(payload: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: payload.username }, { email: payload.username }],
      },
    });
    if (!user || !(await bcrypt.compare(payload.password, user.hashedPassword))) {
      throw new UnauthorizedException("Credenciales incorrectas");
    }
    if (!user.isActive) {
      throw new UnauthorizedException("Usuario inactivo");
    }
    return this.issueToken(user);
  }

  isAdmin(user: Pick<User, "role">) {
    return user.role === "admin";
  }

  toRead(user: User) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      created_at: user.createdAt,
      is_admin: this.isAdmin(user),
    };
  }

  async listMyReviews(user: User) {
    const reviews = await this.prisma.review.findMany({
      where: { userId: user.id },
      include: { pelicula: true },
      orderBy: { createdAt: "desc" },
    });
    return reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      created_at: review.createdAt,
      pelicula_id: review.peliculaId,
      titulo: review.pelicula.titulo,
      poster_url: review.pelicula.posterUrl,
    }));
  }

  private issueToken(user: User) {
    const minutes = Number(this.config.get("ACCESS_TOKEN_EXPIRE_MINUTES") || 1440);
    const access_token = this.jwt.sign(
      { sub: String(user.id), username: user.username },
      { expiresIn: `${minutes}m` },
    );
    return { access_token, token_type: "bearer", user: this.toRead(user) };
  }
}
