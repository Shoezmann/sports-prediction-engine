// Value Objects
export { Probability, Confidence, EloRating, ProbabilitySet } from './value-objects';

// Entities
export { Sport, Team, Game, Prediction } from './entities';
export type { ModelBreakdown } from './entities';

// Domain Services
export { EnsemblePredictor, EloCalculator } from './services';

// Exceptions
export {
    DomainException,
    GameNotFoundException,
    SportNotFoundException,
    PredictionAlreadyExistsException,
    InvalidProbabilityException,
} from './exceptions';

// Port interfaces (type-only)
export type {
    SportsDataPort,
    GameRepositoryPort,
    PredictionRepositoryPort,
    SportRepositoryPort,
    TeamRepositoryPort,
    PredictionModelPort,
    RawGameData,
    RawScoreData,
    RawOddsData,
    RawBookmakerData,
    RawMarketData,
    RawOutcomeData,
} from './ports/output';

// Port tokens (values)
export {
    SPORTS_DATA_PORT,
    GAME_REPOSITORY_PORT,
    PREDICTION_REPOSITORY_PORT,
    SPORT_REPOSITORY_PORT,
    TEAM_REPOSITORY_PORT,
    PREDICTION_MODEL_PORT,
} from './ports/output';
