"""CLI entry point for HMM Attack Phase Labeler.

Usage:
    python -m hmm train data.parquet -o model.pkl
    python -m hmm label data.parquet -m model.pkl -o labeled.parquet
    python -m hmm evaluate -m model.pkl -d data.parquet
"""

import sys
import argparse


def main():
    parser = argparse.ArgumentParser(
        prog='hmm',
        description='HMM-based unsupervised attack phase labeler'
    )
    subparsers = parser.add_subparsers(dest='command', help='Commands')

    # Train command
    train_parser = subparsers.add_parser('train', help='Train HMM model')
    train_parser.add_argument('data', help='Path to parquet file')
    train_parser.add_argument('--output', '-o', required=True, help='Path to save model')
    train_parser.add_argument('--n-states', '-n', type=int, default=10,
                             help='Number of hidden states (default: 10)')
    train_parser.add_argument('--select-k', action='store_true',
                             help='Use BIC to select optimal n_states')
    train_parser.add_argument('--min-states', type=int, default=4,
                             help='Min states for BIC selection (default: 4)')
    train_parser.add_argument('--max-states', type=int, default=15,
                             help='Max states for BIC selection (default: 15)')

    # Label command
    label_parser = subparsers.add_parser('label', help='Label flows with HMM states')
    label_parser.add_argument('data', help='Path to parquet file')
    label_parser.add_argument('--model', '-m', required=True, help='Path to trained model')
    label_parser.add_argument('--output', '-o', required=True, help='Path to save labeled output')

    # Evaluate command
    eval_parser = subparsers.add_parser('evaluate', help='Evaluate trained model')
    eval_parser.add_argument('--model', '-m', required=True, help='Path to trained model')
    eval_parser.add_argument('--data', '-d', required=True, help='Path to evaluation data')

    args = parser.parse_args()

    if args.command == 'train':
        from hmm.cli.train import train_model
        summary = train_model(
            args.data,
            args.output,
            n_states=args.n_states,
            select_k=args.select_k,
            min_states=args.min_states,
            max_states=args.max_states,
        )
        print(f"Training complete!")
        print(f"  States: {summary['n_states']}")
        print(f"  Sessions: {summary['n_sessions']}")
        print(f"  Flows: {summary['n_flows']}")
        print(f"  Log-likelihood: {summary['log_likelihood']:.2f}")
        print(f"  Model saved to: {args.output}")

    elif args.command == 'label':
        from hmm.cli.label import label_flows
        label_flows(args.data, args.model, args.output)
        print(f"Labeled flows saved to: {args.output}")

    elif args.command == 'evaluate':
        from hmm.cli.evaluate import evaluate_model
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

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
