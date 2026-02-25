/**
 * Base domain exception.
 * All domain-specific errors should extend this class.
 */
export class DomainException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DomainException';
    }
}

export class GameNotFoundException extends DomainException {
    constructor(id: string) {
        super(`Game not found: ${id}`);
        this.name = 'GameNotFoundException';
    }
}

export class SportNotFoundException extends DomainException {
    constructor(key: string) {
        super(`Sport not found: ${key}`);
        this.name = 'SportNotFoundException';
    }
}

export class PredictionAlreadyExistsException extends DomainException {
    constructor(gameId: string) {
        super(`Prediction already exists for game: ${gameId}`);
        this.name = 'PredictionAlreadyExistsException';
    }
}

export class InvalidProbabilityException extends DomainException {
    constructor(message: string) {
        super(`Invalid probability: ${message}`);
        this.name = 'InvalidProbabilityException';
    }
}
