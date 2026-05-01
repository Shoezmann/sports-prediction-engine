import pandas as pd
import numpy as np
import json

# Simulate feature engineer output
matches = [
    {'date': '2024-01-01', 'home_team': 'A', 'away_team': 'B', 'home_score': 2, 'away_score': 1},
    {'date': '2024-01-08', 'home_team': 'B', 'away_team': 'C', 'home_score': 1, 'away_score': 1},
    {'date': '2024-01-15', 'home_team': 'C', 'away_team': 'A', 'home_score': 0, 'away_score': 3},
]

# Build features (simplified)
features = []
targets_outcome = []

for m in matches:
    features.append({'home_goals': m['home_score'], 'away_goals': m['away_score']})
    
    if m['home_score'] > m['away_score']:
        targets_outcome.append(2)
    elif m['home_score'] == m['away_score']:
        targets_outcome.append(1)
    else:
        targets_outcome.append(0)

X = pd.DataFrame(features)
y = np.array(targets_outcome)

print("X:")
print(X)
print("y:", y)

# Test the train_model logic
mask = y != -1
print("\nmask:", mask)
print("X[mask]:")
print(X[mask])
