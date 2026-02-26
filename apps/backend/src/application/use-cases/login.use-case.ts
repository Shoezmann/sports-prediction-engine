import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { USER_REPOSITORY_PORT } from '../../domain/ports/output';
import type { UserRepositoryPort } from '../../domain/ports/output';
import { LoginDto, AuthResponseDto } from '@sports-prediction-engine/shared-types';

@Injectable()
export class LoginUseCase {
    constructor(
        @Inject(USER_REPOSITORY_PORT)
        private readonly userRepository: UserRepositoryPort,
        private readonly jwtService: JwtService,
    ) { }

    async execute(dto: LoginDto): Promise<AuthResponseDto> {
        const user = await this.userRepository.findByEmail(dto.email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials');
        }

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
