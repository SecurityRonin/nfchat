"""Evaluate CLI command - evaluates trained HMM model."""

import argparse
import pandas as pd
import numpy as np
import joblib

from hmm.data.loader import load_parquet
from hmm.data.session_builder import SessionBuilder
from hmm.features.extractor import FlowFeatureExtractor
from hmm.model.hmm import AttackPhaseHMM
from hmm.interpretation.state_analyzer import StateAnalyzer
from hmm.interpretation.mitre_mapper import MitreMapper


def evaluate_model(model_path: str, data_path: str) -> dict:
    """
    Evaluate trained HMM model.

    Args:
        model_path: Path to trained model
        data_path: Path to parquet file for evaluation

    Returns:
        Evaluation metrics dict
    """
    # Load model and extractor
    model = AttackPhaseHMM.load(model_path)
    extractor_path = model_path.replace('.pkl', '_extractor.pkl')
    try:
        extractor = joblib.load(extractor_path)
    except FileNotFoundError:
        extractor = FlowFeatureExtractor()

    # Load data
    flows = load_parquet(data_path)

    # Build sessions
    builder = SessionBuilder()
    sessions = builder.build_sessions(flows)

    if not sessions:
        return {
            'error': 'No valid sessions found',
            'n_flows': len(flows),
            'n_sessions': 0,
        }

    # Extract features and get predictions
    all_features = []
    lengths = []
    all_labeled = []

    for session in sessions:
        features = extractor.transform(session, normalize=extractor._is_fitted)
        all_features.append(features)
        lengths.append(len(features))

        # Predict states for this session
        states = model.predict_states(features, [len(features)])
        labeled = session.copy()
        labeled['HMM_STATE'] = states
        all_labeled.append(labeled)

    X = np.vstack(all_features)

    # Combine labeled sessions
    labeled_df = pd.concat(all_labeled, ignore_index=True)

    # Get state distribution
    state_counts = labeled_df['HMM_STATE'].value_counts().to_dict()
    state_distribution = {
        int(k): int(v) for k, v in state_counts.items()
    }

    # Analyze states and map to tactics
    analyzer = StateAnalyzer()
    signatures = analyzer.analyze(labeled_df)

    mapper = MitreMapper()
    mappings = mapper.map_all(signatures)

    # Format tactic mappings
    tactic_mappings = {
        int(state_id): {'tactic': tactic, 'confidence': float(conf)}
        for state_id, (tactic, conf) in mappings.items()
    }

    # Get transition matrix
    transition_matrix = model.get_transition_matrix().tolist()

    # Compute log-likelihood
    log_likelihood = model.score(X, lengths)

    return {
        'n_states': model.n_states,
        'n_sessions': len(sessions),
        'n_flows': sum(lengths),
        'log_likelihood': float(log_likelihood),
        'state_distribution': state_distribution,
        'tactic_mappings': tactic_mappings,
        'transition_matrix': transition_matrix,
    }


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description='Evaluate HMM model')
    parser.add_argument('--model', '-m', required=True, help='Path to trained model')
    parser.add_argument('--data', '-d', required=True, help='Path to evaluation data')

    args = parser.parse_args()

    metrics = evaluate_model(args.model, args.data)

    print("Evaluation Results")
    print("=" * 50)
    print(f"States: {metrics['n_states']}")
    print(f"Sessions: {metrics['n_sessions']}")
    print(f"Flows: {metrics['n_flows']}")
    print(f"Log-likelihood: {metrics['log_likelihood']:.2f}")

    print("\nState Distribution:")
    for state, count in sorted(metrics['state_distribution'].items()):
        mapping = metrics['tactic_mappings'].get(state, {})
        tactic = mapping.get('tactic', 'Unknown')
        conf = mapping.get('confidence', 0.0)
        print(f"  State {state}: {count} flows -> {tactic} (conf: {conf:.2f})")


if __name__ == '__main__':
    main()
