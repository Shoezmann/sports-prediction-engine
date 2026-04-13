import { IsEmail, IsString, MinLength, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ example: 'user@example.com', description: 'User email address' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'SecurePass123!', description: 'User password (min 8 chars)' })
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    password!: string;

    @ApiProperty({ example: 'John', required: false })
    @IsOptional()
    @IsString()
    firstName?: string;

    @ApiProperty({ example: ['soccer_epl', 'basketball_nba'], required: false })
    @IsOptional()
    @IsArray()
    favoriteSports?: string[];
}

export class LoginDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'SecurePass123!' })
    @IsString()
    password!: string;
}

export class ForgotPasswordDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email!: string;
}

export class ResetPasswordDto {
    @ApiProperty({ description: 'Reset token from email' })
    @IsString()
    token!: string;

    @ApiProperty({ description: 'New password (min 8 chars)' })
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    newPassword!: string;
}
