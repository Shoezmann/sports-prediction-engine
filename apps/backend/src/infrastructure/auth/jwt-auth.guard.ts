import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Authentication Guard
 *
 * Use this guard to protect routes that require authentication.
 * When applied, the request must include a valid JWT token in the
 * Authorization header (Bearer token).
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard)
 *   async someEndpoint(@Request() req) {
 *     const userId = req.user.userId;
 *   }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
