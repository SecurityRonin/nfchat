"""Label CLI command - labels flows with HMM states and MITRE tactics."""

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


def label_flows(data_path: str, model_path: str, output_path: str) -> None:
    """
    Label flows with HMM states and MITRE tactics.

    Args:
        data_path: Path to parquet file with flow data
        model_path: Path to trained model
        output_path: Path to save labeled parquet
    """
    # Load model and extractor
    model = AttackPhaseHMM.load(model_path)
    extractor_path = model_path.replace('.pkl', '_extractor.pkl')
    try:
        extractor = joblib.load(extractor_path)
    except FileNotFoundError:
        # Fallback: create new extractor (won't have fitted normalizer)
        extractor = FlowFeatureExtractor()

    # Load data
    flows = load_parquet(data_path)
    original_index = flows.index.copy()

    # Build sessions
    builder = SessionBuilder()
    sessions = builder.build_sessions(flows)

    if not sessions:
        # No valid sessions - add empty columns
        flows['HMM_STATE'] = -1
        flows['HMM_TACTIC'] = 'Unknown'
        flows['HMM_CONFIDENCE'] = 0.0
        flows.to_parquet(output_path)
        return

    # Label each session
    all_labeled = []

    for session in sessions:
        # Extract features
        features = extractor.transform(session, normalize=extractor._is_fitted)

        # Predict states
        states = model.predict_states(features, [len(features)])

        # Add state column
        labeled = session.copy()
        labeled['HMM_STATE'] = states
        all_labeled.append(labeled)

    # Combine all labeled sessions
    labeled_df = pd.concat(all_labeled, ignore_index=True)

    # Analyze states and map to tactics
    analyzer = StateAnalyzer()
    signatures = analyzer.analyze(labeled_df)

    mapper = MitreMapper()
    mappings = mapper.map_all(signatures)

    # Add tactic and confidence columns
    labeled_df['HMM_TACTIC'] = labeled_df['HMM_STATE'].map(
        lambda s: mappings.get(s, ('Unknown', 0.0))[0]
    )
    labeled_df['HMM_CONFIDENCE'] = labeled_df['HMM_STATE'].map(
        lambda s: mappings.get(s, ('Unknown', 0.0))[1]
    )

    # Handle flows that weren't in any session (too short, etc.)
    # Merge back with original flows
    labeled_df = labeled_df.drop(columns=['session_id'], errors='ignore')

    # Save
    labeled_df.to_parquet(output_path, index=False)


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description='Label flows with HMM states')
    parser.add_argument('data', help='Path to parquet file')
    parser.add_argument('--model', '-m', required=True, help='Path to trained model')
    parser.add_argument('--output', '-o', required=True, help='Path to save labeled output')

    args = parser.parse_args()

    label_flows(args.data, args.model, args.output)
    print(f"Labeled flows saved to: {args.output}")


if __name__ == '__main__':
    main()
