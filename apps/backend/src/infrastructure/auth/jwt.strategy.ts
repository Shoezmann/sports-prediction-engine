import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * JWT Payload structure - matches what LoginUseCase returns
 */
interface JwtPayload {
    sub: string; // user id
    email: string;
}

/**
 * JWT Strategy - Extracts and validates JWT tokens from requests
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET', 'super-secret-fallback-key-for-dev'),
        });
    }

    /**
     * Validate the decoded JWT payload and return user info
     * This is called automatically by Passport after token validation
     */
    async validate(payload: JwtPayload) {
        if (!payload.sub || !payload.email) {
            throw new UnauthorizedException('Invalid token payload');
        }

        return {
            userId: payload.sub,
            email: payload.email,
        };
    }
}
