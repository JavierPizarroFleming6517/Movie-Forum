import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({
    example: "ada@example.com",
    description: "Correo electrónico único, se usa como identidad de acceso.",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: "ada",
    minLength: 3,
    maxLength: 80,
    description: "Nombre de usuario visible en reseñas y rankings.",
  })
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  username!: string;

  @ApiProperty({
    example: "ClaveSegura123",
    minLength: 6,
    maxLength: 128,
    description: "Contraseña en texto plano. Se almacena hasheada con bcrypt (10 rondas), nunca en texto plano.",
  })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;
}

export class LoginDto {
  @ApiProperty({ example: "admin", description: "Nombre de usuario o correo electrónico registrado." })
  @IsString()
  username!: string;

  @ApiProperty({ example: "foro1234", description: "Contraseña registrada." })
  @IsString()
  password!: string;
}