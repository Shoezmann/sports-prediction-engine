import { Inject, Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../domain/entities';
import { USER_REPOSITORY_PORT } from '../../domain/ports/output';
import type { UserRepositoryPort } from '../../domain/ports/output';
import { RegisterDto, AuthResponseDto } from '@sports-prediction-engine/shared-types';

@Injectable()
export class RegisterUseCase {
    constructor(
        @Inject(USER_REPOSITORY_PORT)
        private readonly userRepository: UserRepositoryPort,
        private readonly jwtService: JwtService,
    ) { }

    async execute(dto: RegisterDto): Promise<AuthResponseDto> {
        const existing = await this.userRepository.findByEmail(dto.email);
        if (existing) {
            throw new BadRequestException('User with this email already exists');
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(dto.password, saltRounds);

        const user = User.create({
            id: uuidv4(),
            email: dto.email,
            passwordHash,
            firstName: dto.firstName,
            favoriteSports: dto.favoriteSports,
        });

        const savedUser = await this.userRepository.save(user);

        const payload = { sub: savedUser.id, email: savedUser.email };
        const accessToken = this.jwtService.sign(payload);

        return {
            accessToken,
            user: {
                id: savedUser.id,
                email: savedUser.email,
                firstName: savedUser.firstName,
                favoriteSports: savedUser.favoriteSports,
            },
        };
    }
}
