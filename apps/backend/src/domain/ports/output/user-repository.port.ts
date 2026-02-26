import { User } from '../../entities/user.entity';

export interface UserRepositoryPort {
    save(user: User): Promise<User>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    update(user: User): Promise<User>;
}

export const USER_REPOSITORY_PORT = Symbol('UserRepositoryPort');
