export class User {
    constructor(
        public readonly id: string,
        public readonly email: string,
        public readonly passwordHash: string,
        public readonly firstName?: string,
        public readonly favoriteSports?: string[],
        public readonly createdAt?: Date,
        public readonly updatedAt?: Date,
    ) { }

    static create(props: {
        id: string;
        email: string;
        passwordHash: string;
        firstName?: string;
        favoriteSports?: string[];
        createdAt?: Date;
    }): User {
        return new User(
            props.id,
            props.email,
            props.passwordHash,
            props.firstName,
            props.favoriteSports ?? [],
            props.createdAt ?? new Date(),
        );
    }
}
