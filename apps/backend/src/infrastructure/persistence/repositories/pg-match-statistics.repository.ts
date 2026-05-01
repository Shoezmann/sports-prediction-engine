import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchStatisticsEntity } from '../entities/match-statistics.orm-entity';

@Injectable()
export class PgMatchStatisticsRepository {
  constructor(
    @InjectRepository(MatchStatisticsEntity)
    private readonly repo: Repository<MatchStatisticsEntity>,
  ) {}

  async save(statistics: Partial<MatchStatisticsEntity>): Promise<MatchStatisticsEntity> {
    return this.repo.save(statistics);
  }

  async findByGameId(gameId: string): Promise<MatchStatisticsEntity | null> {
    return this.repo.findOne({ where: { gameId } });
  }

  async findManyByGameIds(gameIds: string[]): Promise<MatchStatisticsEntity[]> {
    return this.repo.find({ where: gameIds.map(id => ({ gameId: id })) });
  }

  async update(gameId: string, data: Partial<MatchStatisticsEntity>): Promise<void> {
    await this.repo.update({ gameId }, data);
  }

  async deleteByGameId(gameId: string): Promise<void> {
    await this.repo.delete({ gameId });
  }
}
