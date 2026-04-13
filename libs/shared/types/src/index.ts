// Enums
export {
    SportCategory,
    SportGroup,
    PredictionOutcome,
    ConfidenceLevel,
    BetStatus,
} from './lib/enums';

// DTOs
export type {
    SportDto,
    TeamDto,
    GameDto,
    PredictionDto,
    ProbabilitySetDto,
    ModelBreakdownDto,
    GoalsPredictionDto,
    BttsPredictionDto,
    AccuracyDto,
    AccuracyBucketDto,
} from './lib/dto';

export type {
    RegisterDto,
    LoginDto,
    AuthResponseDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    BetDto,
    PlaceBetDto,
} from './lib/dto';

// Utils
export {
    SPORT_GROUP_CATEGORY_MAP,
    getSportCategory,
    getSportDurationConfig,
    formatSportMinute,
    getSportLiveStatus,
    clampSportMinutes,
    type SportDurationConfig,
    formatLocalTime,
    formatLocalTime12h,
    formatShortDate,
    formatWeekday,
    formatRelativeTime,
    getElapsedMinutes,
    isMatchLive,
    formatLastUpdated,
} from './lib/utils';
