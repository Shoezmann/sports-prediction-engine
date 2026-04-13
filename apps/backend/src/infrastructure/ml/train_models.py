#!/usr/bin/env python3
"""
ML Training Pipeline for Sports Prediction Engine

Trains XGBoost models for:
- Match outcome (1X2)
- Over/Under 2.5 goals
- Both teams to score (BTTS)

Uses historical match data with engineered features:
- Team strength (rolling ELO-like rating)
- Recent form (last 5, 10 matches)
- Home/away performance splits
- Head-to-head history
- Goals scored/conceded averages
- Streaks (wins, losses, draws)
- Rest days between matches
"""

import sys
import json
import os
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import (
    accuracy_score, log_loss, brier_score_loss,
    roc_auc_score, classification_report
)
import xgboost as xgb
import joblib

# ─── Configuration ───────────────────────────────────────────────────────────

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

# Feature engineering windows
FORM_WINDOWS = [5, 10, 20]
MIN_GAMES_FOR_TRAINING = 50
MIN_FEATURES_PER_TEAM = 10

# XGBoost hyperparameters (tuned for sports prediction)
XGB_PARAMS = {
    'n_estimators': 500,
    'max_depth': 5,
    'learning_rate': 0.02,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'min_child_weight': 3,
    'gamma': 0.1,
    'reg_alpha': 0.1,
    'reg_lambda': 1.0,
    'objective': 'multi:softprob',
    'num_class': 3,
    'eval_metric': 'mlogloss',
    'random_state': 42,
    'early_stopping_rounds': 50,
    'verbosity': 0,
}


# ─── Feature Engineering ─────────────────────────────────────────────────────

class FeatureEngineer:
    """Engineers features from historical match data."""

    def __init__(self):
        self.team_stats = {}
        self.h2h_cache = {}

    def engineer(self, matches_df):
        """
        Input: DataFrame with columns:
            date, home_team, away_team, home_score, away_score,
            home_odds, draw_odds, away_odds, league

        Returns: Feature matrix + targets
        """
        df = matches_df.copy()
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date').reset_index(drop=True)

        # Initialize team stats trackers
        teams = set(df['home_team'].unique()) | set(df['away_team'].unique())
        team_stats = {t: {
            'games': 0, 'wins': 0, 'draws': 0, 'losses': 0,
            'goals_for': 0, 'goals_against': 0,
            'home_games': 0, 'away_games': 0,
            'home_goals_for': 0, 'home_goals_against': 0,
            'away_goals_for': 0, 'away_goals_against': 0,
            'recent_results': [],  # List of (date, result, gf, ga)
            'strength': 1500.0,  # Starting ELO
        } for t in teams}

        features = []
        targets_outcome = []  # 0=away, 1=draw, 2=home
        targets_goals = []    # 0=under 2.5, 1=over 2.5
        targets_btts = []     # 0=no, 1=yes

        for idx, row in df.iterrows():
            home = row['home_team']
            away = row['away_team']
            date = row['date']

            # Get team features
            home_feats = self._team_features(team_stats, home, date, is_home=True)
            away_feats = self._team_features(team_stats, away, date, is_home=False)

            # Head-to-head features
            h2h_feats = self._h2h_features(team_stats, home, away, date)

            # Match context features
            context_feats = self._context_features(row, date)

            # Combine features
            match_feats = {**home_feats, **away_feats, **h2h_feats, **context_feats}

            # Calculate targets if result available
            if pd.notna(row.get('home_score')) and pd.notna(row.get('away_score')):
                hs = int(row['home_score'])
                als = int(row['away_score'])
                total_goals = hs + als

                # Outcome
                if hs > als:
                    targets_outcome.append(2)  # Home win
                elif hs == als:
                    targets_outcome.append(1)  # Draw
                else:
                    targets_outcome.append(0)  # Away win

                # Goals
                targets_goals.append(1 if total_goals > 2.5 else 0)

                # BTTS
                targets_btts.append(1 if hs > 0 and als > 0 else 0)

                # Update team stats AFTER this match (prevent data leakage)
                self._update_stats(team_stats, home, away, hs, als, date, True)
            else:
                # For upcoming matches, just update without targets
                targets_outcome.append(-1)
                targets_goals.append(-1)
                targets_btts.append(-1)

            features.append(match_feats)

        feats_df = pd.DataFrame(features)

        return feats_df, targets_outcome, targets_goals, targets_btts

    def _team_features(self, team_stats, team, date, is_home):
        """Generate features for a single team."""
        stats = team_stats[team]
        feats = {}
        prefix = 'home' if is_home else 'away'

        games = max(stats['games'], 1)

        # Overall stats
        feats[f'{prefix}_strength'] = stats['strength']
        feats[f'{prefix}_games'] = stats['games']
        feats[f'{prefix}_win_rate'] = stats['wins'] / games
        feats[f'{prefix}_draw_rate'] = stats['draws'] / games
        feats[f'{prefix}_loss_rate'] = stats['losses'] / games
        feats[f'{prefix}_goals_for_avg'] = stats['goals_for'] / games
        feats[f'{prefix}_goals_against_avg'] = stats['goals_against'] / games
        feats[f'{prefix}_goal_diff_avg'] = (stats['goals_for'] - stats['goals_against']) / games

        # Home/away splits
        home_games = max(stats['home_games'], 1)
        away_games = max(stats['away_games'], 1)
        feats[f'{prefix}_home_win_rate'] = stats.get('home_wins', 0) / home_games if is_home else 0
        feats[f'{prefix}_away_win_rate'] = stats.get('away_wins', 0) / away_games if not is_home else 0

        # Recent form (last 5, 10, 20)
        recent = stats['recent_results'][-20:] if stats['recent_results'] else []

        for window in FORM_WINDOWS:
            subset = recent[-window:]
            if subset:
                w = sum(1 for _, r, _, _ in subset if r == 'W')
                d = sum(1 for _, r, _, _ in subset if r == 'D')
                gf = sum(gf for _, _, gf, _ in subset)
                ga = sum(ga for _, _, _, ga in subset)
                n = len(subset)
                feats[f'{prefix}_form_{window}_pts'] = (w * 3 + d) / (n * 3)
                feats[f'{prefix}_form_{window}_gf'] = gf / n
                feats[f'{prefix}_form_{window}_ga'] = ga / n
                feats[f'{prefix}_form_{window}_gd'] = (gf - ga) / n
            else:
                feats[f'{prefix}_form_{window}_pts'] = 0.5
                feats[f'{prefix}_form_{window}_gf'] = 1.0
                feats[f'{prefix}_form_{window}_ga'] = 1.0
                feats[f'{prefix}_form_{window}_gd'] = 0.0

        # Streaks
        streak = 0
        streak_type = 'N'
        for _, r, _, _ in reversed(recent):
            if r == streak_type or streak == 0:
                streak += 1
                streak_type = r
            else:
                break
        feats[f'{prefix}_current_streak'] = streak if streak_type != 'N' else 0
        feats[f'{prefix}_streak_type'] = {'W': 1, 'D': 0, 'L': -1, 'N': 0}.get(streak_type, 0)

        # Clean sheets and scoring streaks
        cs = sum(1 for _, _, _, ga in recent if ga == 0)
        scored = sum(1 for _, _, gf, _ in recent if gf > 0)
        feats[f'{prefix}_clean_sheet_rate'] = cs / max(len(recent), 1)
        feats[f'{prefix}_scoring_rate'] = scored / max(len(recent), 1)

        return feats

    def _h2h_features(self, team_stats, home, away, date):
        """Head-to-head features."""
        home_recent = team_stats[home]['recent_results']
        away_recent = team_stats[away]['recent_results']

        # Strength difference
        feats = {
            'strength_diff': team_stats[home]['strength'] - team_stats[away]['strength'],
            'form_diff': (
                team_stats[home]['wins'] / max(team_stats[home]['games'], 1) -
                team_stats[away]['wins'] / max(team_stats[away]['games'], 1)
            ),
            'goal_diff_diff': (
                (team_stats[home]['goals_for'] - team_stats[home]['goals_against']) / max(team_stats[home]['games'], 1) -
                (team_stats[away]['goals_for'] - team_stats[away]['goals_against']) / max(team_stats[away]['games'], 1)
            ),
        }
        return feats

    def _context_features(self, row, date):
        """Match context features."""
        feats = {}

        # Odds-based features (market expectations)
        if all(pd.notna(row.get(f'{k}_odds')) for k in ['home', 'draw', 'away']):
            home_od = float(row['home_odds'])
            draw_od = float(row['draw_odds'])
            away_od = float(row['away_odds'])

            # Implied probabilities (with margin removal)
            total_impl = 1/home_od + 1/draw_od + 1/away_od
            feats['market_home_prob'] = (1/home_od) / total_impl
            feats['market_draw_prob'] = (1/draw_od) / total_impl
            feats['market_away_prob'] = (1/away_od) / total_impl
            feats['market_margin'] = total_impl - 1.0

            # Home advantage implied by market
            feats['market_home_advantage'] = (1/home_od) / (1/away_od) if away_od > 0 else 1.0

            # Expected goals from odds
            feats['market_expected_total'] = self._odds_to_expected_goals(home_od, draw_od, away_od)
        else:
            feats['market_home_prob'] = 0.33
            feats['market_draw_prob'] = 0.33
            feats['market_away_prob'] = 0.33
            feats['market_margin'] = 0.0
            feats['market_home_advantage'] = 1.0
            feats['market_expected_total'] = 2.5

        return feats

    def _odds_to_expected_goals(self, home_od, draw_od, away_od):
        """Estimate expected total goals from odds."""
        # Simple approximation: higher odds → lower expected goals
        avg_odds = (home_od + draw_od + away_od) / 3
        # Higher avg odds typically means lower-scoring leagues
        return max(1.5, min(3.5, 3.5 - avg_odds * 0.2))

    def _update_stats(self, team_stats, home, away, hs, als, date, is_home_match):
        """Update team statistics after a match."""
        # Update home team
        h = team_stats[home]
        h['games'] += 1
        h['goals_for'] += hs
        h['goals_against'] += als
        h['recent_results'].append((date, 'W' if hs > als else ('D' if hs == als else 'L'), hs, als))

        if is_home_match:
            h['home_games'] += 1
            h['home_goals_for'] += hs
            h['home_goals_against'] += als
            if hs > als: h['home_wins'] = h.get('home_wins', 0) + 1
        else:
            h['away_games'] += 1
            h['away_goals_for'] += hs
            h['away_goals_against'] += als
            if hs > als: h['away_wins'] = h.get('away_wins', 0) + 1

        if hs > als: h['wins'] += 1
        elif hs == als: h['draws'] += 1
        else: h['losses'] += 1

        # Update ELO-like strength (both expected scores calculated from pre-match ratings)
        h_pre_strength = h['strength']
        a_pre_strength = team_stats[away]['strength']

        expected_home = 1 / (1 + 10 ** ((a_pre_strength - h_pre_strength) / 400))
        expected_away = 1 / (1 + 10 ** ((h_pre_strength - a_pre_strength) / 400))

        actual_home = 1 if hs > als else (0.5 if hs == als else 0)
        actual_away = 1 if als > hs else (0.5 if hs == als else 0)

        h['strength'] += 20 * (actual_home - expected_home)

        # Update away team
        a = team_stats[away]
        a['games'] += 1
        a['goals_for'] += als
        a['goals_against'] += hs
        a['recent_results'].append((date, 'W' if als > hs else ('D' if hs == als else 'L'), als, hs))

        if is_home_match:
            a['away_games'] += 1
            a['away_goals_for'] += als
            a['away_goals_against'] += hs
            if als > hs: a['away_wins'] = a.get('away_wins', 0) + 1
        else:
            a['home_games'] += 1
            a['home_goals_for'] += als
            a['home_goals_against'] += hs
            if als > hs: a['home_wins'] = a.get('home_wins', 0) + 1

        if als > hs: a['wins'] += 1
        elif hs == als: a['draws'] += 1
        else: a['losses'] += 1

        a['strength'] += 20 * (actual_away - expected_away)


# ─── Training ────────────────────────────────────────────────────────────────

def train_model(X, y, task_type='outcome', league_name='global'):
    """
    Train XGBoost model with time-series cross-validation.

    task_type: 'outcome' (1X2), 'goals' (over/under 2.5), 'btts'
    """
    # Drop rows with no target
    mask = y != -1
    X_valid = X[mask].copy()
    y_valid = np.array(y)[mask]

    if len(X_valid) < MIN_GAMES_FOR_TRAINING:
        return None, f'Insufficient data: {len(X_valid)} < {MIN_GAMES_FOR_TRAINING}'

    # Fill NaN/inf
    X_valid = X_valid.replace([np.inf, -np.inf], np.nan)
    X_valid = X_valid.fillna(X_valid.median())

    # Time-series split (preserves temporal order)
    tscv = TimeSeriesSplit(n_splits=5)

    best_model = None
    best_score = -1
    cv_scores = []

    for train_idx, val_idx in tscv.split(X_valid):
        X_train, X_val = X_valid.iloc[train_idx], X_valid.iloc[val_idx]
        y_train, y_val = y_valid[train_idx], y_valid[val_idx]

        if task_type == 'outcome':
            model = xgb.XGBClassifier(**XGB_PARAMS)
            model.fit(
                X_train, y_train,
                eval_set=[(X_val, y_val)],
                verbose=False,
            )
            score = accuracy_score(y_val, model.predict(X_val))
        else:
            model = xgb.XGBClassifier(
                **{k: v for k, v in XGB_PARAMS.items() if k not in ['num_class', 'objective']},
                objective='binary:logistic',
                eval_metric='logloss',
            )
            model.fit(
                X_train, y_train,
                eval_set=[(X_val, y_val)],
                verbose=False,
            )
            score = roc_auc_score(y_val, model.predict_proba(X_val)[:, 1])

        cv_scores.append(score)
        if score > best_score:
            best_score = score
            best_model = model

    # Final training on all data
    if task_type == 'outcome':
        final_model = xgb.XGBClassifier(**XGB_PARAMS)
    else:
        final_model = xgb.XGBClassifier(
            **{k: v for k, v in XGB_PARAMS.items() if k not in ['num_class', 'objective']},
            objective='binary:logistic',
            eval_metric='logloss',
        )

    final_model.fit(X_valid, y_valid, verbose=False)

    metrics = {
        'task': task_type,
        'league': league_name,
        'n_samples': len(X_valid),
        'cv_mean': float(np.mean(cv_scores)),
        'cv_std': float(np.std(cv_scores)),
        'best_cv_score': float(best_score),
        'feature_importance': dict(zip(
            X_valid.columns,
            [float(x) for x in final_model.feature_importances_]
        )),
    }

    return final_model, metrics


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    """
    Training pipeline entry point.

    Expects JSON input on stdin:
    {
        "matches": [
            {
                "date": "2024-01-15T15:00:00Z",
                "home_team": "Arsenal",
                "away_team": "Chelsea",
                "home_score": 2,
                "away_score": 1,
                "home_odds": 1.85,
                "draw_odds": 3.40,
                "away_odds": 4.20,
                "league": "soccer_epl"
            },
            ...
        ],
        "sport_key": "soccer_epl"
    }
    """
    input_data = json.loads(sys.stdin.read())
    matches = input_data.get('matches', [])
    sport_key = input_data.get('sport_key', 'unknown')

    if not matches:
        print(json.dumps({'error': 'No matches provided'}))
        sys.exit(1)

    # Convert to DataFrame
    df = pd.DataFrame(matches)

    # Engineer features
    fe = FeatureEngineer()
    X, y_outcome, y_goals, y_btts = fe.engineer(df)

    if X.empty:
        print(json.dumps({'error': 'No features generated'}))
        sys.exit(1)

    # Train models
    models = {}
    metrics = {}

    for task, targets in [
        ('outcome', y_outcome),
        ('goals', y_goals),
        ('btts', y_btts),
    ]:
        model, result = train_model(X, targets, task, sport_key)
        if isinstance(model, xgb.XGBClassifier):
            model_path = os.path.join(MODEL_DIR, f'{sport_key}_{task}.json')
            model.save_model(model_path)
            models[task] = model_path
            metrics[task] = result
        else:
            metrics[task] = {'error': result}

    # Save feature columns for inference
    feature_cols_path = os.path.join(MODEL_DIR, f'{sport_key}_features.json')
    with open(feature_cols_path, 'w') as f:
        json.dump(list(X.columns), f)

    # Output results
    output = {
        'sport_key': sport_key,
        'n_matches': len(matches),
        'n_features': len(X.columns),
        'models': models,
        'metrics': metrics,
        'feature_columns': list(X.columns),
    }

    print(json.dumps(output, indent=2))


if __name__ == '__main__':
    main()
