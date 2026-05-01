import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like } from 'typeorm';
import { PlayerEntity } from '../entities/player.orm-entity';

@Injectable()
export class PgPlayerRepository {
  constructor(
    @InjectRepository(PlayerEntity)
    private readonly repo: Repository<PlayerEntity>,
  ) {}

  async save(player: Partial<PlayerEntity>): Promise<PlayerEntity> {
    return this.repo.save(player);
  }

  async saveMany(players: Partial<PlayerEntity>[]): Promise<PlayerEntity[]> {
    return this.repo.save(players);
  }

  async findById(id: string): Promise<PlayerEntity | null> {
    return this.repo.findOneBy({ id });
  }

  async findByName(name: string): Promise<PlayerEntity | null> {
    return this.repo.findOne({ where: { name } });
  }

  async findByTeam(teamId: string): Promise<PlayerEntity[]> {
    return this.repo.find({ where: { currentTeamId: teamId } });
  }

  async findByNationality(nationality: string): Promise<PlayerEntity[]> {
    return this.repo.find({ where: { nationality } });
  }

  async findByPosition(position: string): Promise<PlayerEntity[]> {
    return this.repo.find({ where: { position } });
  }

  async search(name: string): Promise<PlayerEntity[]> {
    return this.repo.find({
      where: [{ name: Like(`%${name}%`) }, { fullName: Like(`%${name}%`) }],
      take: 20,
    });
  }

  async findAll(options?: FindManyOptions<PlayerEntity>): Promise<PlayerEntity[]> {
    return this.repo.find(options);
  }

  async count(): Promise<number> {
    return this.repo.count();
  }

  async update(id: string, data: Partial<PlayerEntity>): Promise<void> {
    await this.repo.update({ id }, data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
