import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AuthLoginRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  identifier?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  email?: string;

  @IsString()
  @MaxLength(72)
  password!: string;

  getIdentifier(): string | null {
    return this.identifier ?? this.username ?? this.email ?? null;
  }
}
