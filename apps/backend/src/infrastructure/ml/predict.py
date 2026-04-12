#!/usr/bin/env python3
"""
ML Inference Pipeline for Sports Prediction Engine

Loads trained XGBoost models and generates predictions for upcoming matches.
Uses the same feature engineering as training to ensure consistency.
"""

import sys
import json
import os

import numpy as np
import pandas as pd
import xgboost as xgb

# Reuse feature engineering from training
sys.path.insert(0, os.path.dirname(__file__))
from train_models import FeatureEngineer

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'models')


def load_model(sport_key, task_type):
    """Load trained model from disk."""
    model_path = os.path.join(MODEL_DIR, f'{sport_key}_{task_type}.json')
    if not os.path.exists(model_path):
        return None

    model = xgb.XGBClassifier()
    model.load_model(model_path)
    return model


def load_feature_columns(sport_key):
    """Load expected feature columns."""
    features_path = os.path.join(MODEL_DIR, f'{sport_key}_features.json')
    if not os.path.exists(features_path):
        return None

    with open(features_path) as f:
        return json.load(f)


def predict_match(features, sport_key):
    """
    Generate predictions for a single match.

    Returns:
    {
        "outcome": {"home_win": 0.45, "draw": 0.28, "away_win": 0.27},
        "goals": {"over_2_5": 0.52, "under_2_5": 0.48},
        "btts": {"yes": 0.55, "no": 0.45},
        "expected_goals": 2.65,
        "confidence": 0.45,
    }
    """
    result = {}

    # Load feature columns
    expected_cols = load_feature_columns(sport_key)
    if expected_cols is None:
        return None

    # Ensure features match expected columns
    X = pd.DataFrame([features])
    missing_cols = set(expected_cols) - set(X.columns)
    for col in missing_cols:
        X[col] = 0.0
    X = X[expected_cols]
    X = X.replace([np.inf, -np.inf], np.nan).fillna(0.0)

    # Outcome prediction (1X2)
    outcome_model = load_model(sport_key, 'outcome')
    if outcome_model:
        probs = outcome_model.predict_proba(X)[0]
        result['outcome'] = {
            'away_win': float(probs[0]),
            'draw': float(probs[1]),
            'home_win': float(probs[2]),
        }
        result['confidence'] = float(max(probs))
        result['predicted_outcome'] = ['away_win', 'draw', 'home_win'][int(np.argmax(probs))]
    else:
        # Default: uniform
        result['outcome'] = {'home_win': 0.35, 'draw': 0.30, 'away_win': 0.35}
        result['confidence'] = 0.35
        result['predicted_outcome'] = 'home_win'

    # Goals prediction (Over/Under 2.5)
    goals_model = load_model(sport_key, 'goals')
    if goals_model:
        probs = goals_model.predict_proba(X)[0]
        result['goals'] = {
            'under_2_5': float(probs[0]),
            'over_2_5': float(probs[1]),
        }
    else:
        result['goals'] = {'over_2_5': 0.50, 'under_2_5': 0.50}

    # BTTS prediction
    btts_model = load_model(sport_key, 'btts')
    if btts_model:
        probs = btts_model.predict_proba(X)[0]
        result['btts'] = {
            'no': float(probs[0]),
            'yes': float(probs[1]),
        }
    else:
        result['btts'] = {'yes': 0.50, 'no': 0.50}

    # Expected goals (derived from probabilities)
    result['expected_goals'] = _calculate_expected_goals(
        result['outcome'], result['goals'], result['btts']
    )

    return result


def _calculate_expected_goals(outcome, goals, btts):
    """Estimate expected total goals from model probabilities."""
    # Use goals model as primary, outcome as secondary
    over_prob = goals.get('over_2_5', 0.5)
    btts_prob = btts.get('yes', 0.5)
    home_win = outcome.get('home_win', 0.33)
    away_win = outcome.get('away_win', 0.33)

    # Base expected goals
    eg = 2.0 + over_prob * 1.5  # Higher over prob → more goals

    # Adjust for dominance
    dominance = abs(home_win - away_win)
    eg -= dominance * 0.3  # Dominant favorite → fewer goals typically

    # BTTS adjustment
    eg += btts_prob * 0.5

    return round(max(1.0, min(5.0, eg)), 2)


def main():
    """
    Inference entry point.

    Expects JSON input on stdin:
    {
        "historical_matches": [...],  // For feature engineering
        "upcoming_matches": [
            {
                "date": "2024-01-20T15:00:00Z",
                "home_team": "Arsenal",
                "away_team": "Chelsea",
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
    historical = input_data.get('historical_matches', [])
    upcoming = input_data.get('upcoming_matches', [])
    sport_key = input_data.get('sport_key', 'unknown')

    # Engineer features using historical data
    fe = FeatureEngineer()

    # Process historical first to build team stats
    if historical:
        hist_df = pd.DataFrame(historical)
        fe.engineer(hist_df)

    # Generate predictions for upcoming matches
    predictions = []
    for match in upcoming:
        # Generate features for this match using current team stats
        match_feats = {}

        # Extract features from team stats
        for team in [match['home_team'], match['away_team']]:
            if team in fe.team_stats:
                is_home = team == match['home_team']
                prefix = 'home' if is_home else 'away'
                team_feats = fe._team_features(fe.team_stats, team, pd.to_datetime(match['date']), is_home)
                match_feats.update(team_feats)

        # H2H features
        h2h_feats = fe._h2h_features(
            fe.team_stats, match['home_team'], match['away_team'], pd.to_datetime(match['date'])
        )
        match_feats.update(h2h_feats)

        # Context features
        ctx_feats = fe._context_features(pd.Series(match), pd.to_datetime(match['date']))
        match_feats.update(ctx_feats)

        # Generate predictions
        pred = predict_match(match_feats, sport_key)
        if pred:
            pred['home_team'] = match['home_team']
            pred['away_team'] = match['away_team']
            pred['date'] = match['date']
            predictions.append(pred)

    print(json.dumps({'predictions': predictions, 'sport_key': sport_key}, indent=2))


if __name__ == '__main__':
    main()
