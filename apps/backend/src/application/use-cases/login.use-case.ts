import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../../domain/entities';
import { USER_REPOSITORY_PORT } from '../../domain/ports/output';
import type { UserRepositoryPort } from '../../domain/ports/output';
import { LoginDto, AuthResponseDto } from '@sports-prediction-engine/shared-types';
import { EmailService } from '../../infrastructure/email/email.service';

@Injectable()
export class LoginUseCase {
    constructor(
        @Inject(USER_REPOSITORY_PORT)
        private readonly userRepository: UserRepositoryPort,
        private readonly jwtService: JwtService,
        private readonly emailService: EmailService,
    ) { }

    async execute(dto: LoginDto): Promise<AuthResponseDto> {
        const user = await this.userRepository.findByEmail(dto.email);
        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // Send login notification email (non-blocking)
        const loginTime = new Date().toLocaleString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
        });
        this.emailService.sendLoginAlertEmail(
            user.email,
            user.firstName || '',
            loginTime,
            'Unknown', // IP would be extracted from request headers in production
        ).catch(() => {});

        const payload = { sub: user.id, email: user.email };
        const accessToken = this.jwtService.sign(payload);

        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                favoriteSports: user.favoriteSports,
            },
        };
    }
}
