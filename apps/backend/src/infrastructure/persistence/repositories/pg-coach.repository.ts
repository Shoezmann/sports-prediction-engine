import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like } from 'typeorm';
import { CoachEntity } from '../entities/coach.orm-entity';

@Injectable()
export class PgCoachRepository {
  constructor(
    @InjectRepository(CoachEntity)
    private readonly repo: Repository<CoachEntity>,
  ) {}

  async save(coach: Partial<CoachEntity>): Promise<CoachEntity> {
    return this.repo.save(coach);
  }

  async saveMany(coaches: Partial<CoachEntity>[]): Promise<CoachEntity[]> {
    return this.repo.save(coaches);
  }

  async findById(id: string): Promise<CoachEntity | null> {
    return this.repo.findOneBy({ id });
  }

  async findByName(name: string): Promise<CoachEntity | null> {
    return this.repo.findOne({ where: { name } });
  }

  async findByTeam(teamName: string): Promise<CoachEntity | null> {
    return this.repo.findOne({ where: { currentTeamName: teamName } });
  }

  async findByNationality(nationality: string): Promise<CoachEntity[]> {
    return this.repo.find({ where: { nationality } });
  }

  async search(name: string): Promise<CoachEntity[]> {
    return this.repo.find({
      where: [{ name: Like(`%${name}%`) }, { fullName: Like(`%${name}%`) }],
      take: 20,
    });
  }

  async findAll(options?: FindManyOptions<CoachEntity>): Promise<CoachEntity[]> {
    return this.repo.find(options);
  }

  async count(): Promise<number> {
    return this.repo.count();
  }

  async update(id: string, data: Partial<CoachEntity>): Promise<void> {
    await this.repo.update({ id }, data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
