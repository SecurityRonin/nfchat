"""Train CLI command - trains HMM model on parquet data."""

import argparse
import numpy as np
import pandas as pd
import joblib

from hmm.data.loader import load_parquet
from hmm.data.session_builder import SessionBuilder
from hmm.features.extractor import FlowFeatureExtractor
from hmm.model.hmm import AttackPhaseHMM
from hmm.config import DEFAULT_N_STATES, MIN_STATES, MAX_STATES


def train_model(
    data_path: str,
    output_path: str,
    n_states: int = DEFAULT_N_STATES,
    select_k: bool = False,
    min_states: int = MIN_STATES,
    max_states: int = MAX_STATES,
    max_session_size: int = 1000,  # Cap session size for training
) -> dict:
    """
    Train HMM model on flow data.

    Args:
        data_path: Path to parquet file with flow data
        output_path: Path to save trained model
        n_states: Number of hidden states (ignored if select_k=True)
        select_k: If True, use BIC to select optimal n_states
        min_states: Minimum states for BIC selection
        max_states: Maximum states for BIC selection
        max_session_size: Cap session size to prevent memory issues

    Returns:
        Training summary dict
    """
    # Load data
    print(f"Loading data from {data_path}...")
    flows = load_parquet(data_path)
    print(f"  Loaded {len(flows):,} flows")

    # Build sessions
    print("Building sessions...")
    builder = SessionBuilder()
    sessions = builder.build_sessions(flows)
    print(f"  Found {len(sessions)} sessions")

    if not sessions:
        raise ValueError("No valid sessions found in data")

    # Extract features from each session
    print("Extracting features...")
    extractor = FlowFeatureExtractor()

    all_features = []
    lengths = []

    for session in sessions:
        # Cap session size to prevent very long sequences
        if len(session) > max_session_size:
            session = session.head(max_session_size)

        features = extractor.transform(session, normalize=False)
        all_features.append(features)
        lengths.append(len(features))

    # Stack and normalize
    X = np.vstack(all_features)
    print(f"  Total observations: {len(X):,}")

    # Fit scaler and normalize
    X_normalized = extractor.scaler.fit_transform(X)
    extractor._is_fitted = True

    # Select n_states if requested
    if select_k:
        print(f"Selecting optimal states ({min_states}-{max_states})...")
        n_states = AttackPhaseHMM.select_n_states(
            X_normalized, lengths, min_states=min_states, max_states=max_states
        )
        print(f"  Selected {n_states} states")

    # Train model
    print(f"Training HMM with {n_states} states...")
    model = AttackPhaseHMM(n_states=n_states)
    model.fit(X_normalized, lengths)

    # Save model
    model.save(output_path)

    # Also save extractor alongside
    extractor_path = output_path.replace('.pkl', '_extractor.pkl')
    joblib.dump(extractor, extractor_path)

    log_likelihood = model.score(X_normalized, lengths)

    # Return summary
    return {
        'n_states': n_states,
        'n_sessions': len(sessions),
        'n_flows': sum(lengths),
        'log_likelihood': log_likelihood,
    }


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description='Train HMM attack phase model')
    parser.add_argument('data', help='Path to parquet file')
    parser.add_argument('--output', '-o', required=True, help='Path to save model')
    parser.add_argument('--n-states', '-n', type=int, default=DEFAULT_N_STATES,
                        help=f'Number of hidden states (default: {DEFAULT_N_STATES})')
    parser.add_argument('--select-k', action='store_true',
                        help='Use BIC to select optimal n_states')
    parser.add_argument('--min-states', type=int, default=MIN_STATES,
                        help=f'Min states for BIC selection (default: {MIN_STATES})')
    parser.add_argument('--max-states', type=int, default=MAX_STATES,
                        help=f'Max states for BIC selection (default: {MAX_STATES})')

    args = parser.parse_args()

    summary = train_model(
        args.data,
        args.output,
        n_states=args.n_states,
        select_k=args.select_k,
        min_states=args.min_states,
        max_states=args.max_states,
    )

    print(f"\nTraining complete!")
    print(f"  States: {summary['n_states']}")
    print(f"  Sessions: {summary['n_sessions']}")
    print(f"  Flows: {summary['n_flows']}")
    print(f"  Log-likelihood: {summary['log_likelihood']:.2f}")
    print(f"  Model saved to: {args.output}")


if __name__ == '__main__':
    main()
