import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { BET_REPOSITORY_PORT, PREDICTION_REPOSITORY_PORT, USER_REPOSITORY_PORT } from '../../domain/ports/output';
import type { BetRepositoryPort, PredictionRepositoryPort, UserRepositoryPort } from '../../domain/ports/output';
import { PlaceBetDto, BetDto, BetStatus } from '@sports-prediction-engine/shared-types';
import { Bet } from '../../domain/entities';

@Injectable()
export class PlaceBetUseCase {
    constructor(
        @Inject(BET_REPOSITORY_PORT)
        private readonly betRepo: BetRepositoryPort,
        @Inject(PREDICTION_REPOSITORY_PORT)
        private readonly predictionRepo: PredictionRepositoryPort,
        @Inject(USER_REPOSITORY_PORT)
        private readonly userRepo: UserRepositoryPort,
    ) { }

    async execute(userId: string, dto: PlaceBetDto): Promise<BetDto> {
        const user = await this.userRepo.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        const prediction = await this.predictionRepo.findById(dto.predictionId);
        if (!prediction) throw new NotFoundException('Prediction not found');
        
        if (prediction.isResolved) {
             throw new BadRequestException('Cannot place a bet on an already resolved prediction');
        }

        const bet = new Bet(
            uuidv4(),
            userId,
            prediction.id,
            dto.stake,
            dto.customOdds ?? prediction.odds ?? 1.0,
            BetStatus.PENDING,
            new Date()
        );

        await this.betRepo.save(bet);

        return {
            id: bet.id,
            userId: bet.userId,
            predictionId: bet.predictionId,
            stake: bet.stake,
            lockedOdds: bet.lockedOdds,
            status: bet.status,
            potentialPayout: bet.potentialPayout,
            placedAt: bet.placedAt,
        };
    }
}
