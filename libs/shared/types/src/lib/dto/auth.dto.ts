export class RegisterDto {
    email!: string;
    password!: string;
    firstName?: string;
    favoriteSports?: string[];
}

export class LoginDto {
    email!: string;
    password!: string;
}

export class AuthResponseDto {
    accessToken!: string;
    user!: {
        id: string;
        email: string;
        firstName?: string;
        favoriteSports?: string[];
    };
}
