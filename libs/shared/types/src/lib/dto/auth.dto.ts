/**
 * Pure type DTOs for auth — no class-validator or NestJS dependencies.
 * These are safe to import in frontend code.
 */

export interface RegisterDto {
    email: string;
    password: string;
    firstName?: string;
    favoriteSports?: string[];
}

export interface LoginDto {
    email: string;
    password: string;
}

export interface AuthResponseDto {
    accessToken: string;
    user: {
        id: string;
        email: string;
        firstName?: string;
        favoriteSports?: string[];
    };
}

export interface ForgotPasswordDto {
    email: string;
}

export interface ResetPasswordDto {
    token: string;
    newPassword: string;
}
