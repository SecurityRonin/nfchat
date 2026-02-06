"""Tests for CLI commands - train, label, evaluate."""

import pytest
import tempfile
import os
import pandas as pd
import numpy as np

from hmm.cli.train import train_model
from hmm.cli.label import label_flows
from hmm.cli.evaluate import evaluate_model
from hmm.model.hmm import AttackPhaseHMM


@pytest.fixture
def sample_parquet(tmp_path):
    """Create a sample parquet file for testing."""
    np.random.seed(42)
    n = 500

    df = pd.DataFrame({
        'IPV4_SRC_ADDR': np.random.choice(['192.168.1.1', '192.168.1.2', '10.0.0.1'], n),
        'IPV4_DST_ADDR': np.random.choice(['10.0.0.100', '10.0.0.101'], n),
        'L4_SRC_PORT': np.random.randint(1024, 65535, n),
        'L4_DST_PORT': np.random.choice([22, 80, 443, 53, 3389], n),
        'PROTOCOL': np.random.choice([6, 17, 1], n),
        'IN_BYTES': np.random.randint(0, 10000, n),
        'OUT_BYTES': np.random.randint(0, 10000, n),
        'IN_PKTS': np.random.randint(1, 100, n),
        'OUT_PKTS': np.random.randint(1, 100, n),
        'FLOW_START_MILLISECONDS': np.sort(np.random.randint(0, 1000000, n)),
        'FLOW_DURATION_MILLISECONDS': np.random.randint(1, 10000, n),
    })

    path = tmp_path / 'test_flows.parquet'
    df.to_parquet(path)
    return str(path)


class TestTrainCommand:
    """Test train CLI command."""

    def test_train_creates_model_file(self, sample_parquet, tmp_path):
        """train should create a model file."""
        model_path = str(tmp_path / 'model.pkl')
        train_model(sample_parquet, model_path, n_states=5)
        assert os.path.exists(model_path)

    def test_train_model_is_loadable(self, sample_parquet, tmp_path):
        """Trained model should be loadable."""
        model_path = str(tmp_path / 'model.pkl')
        train_model(sample_parquet, model_path, n_states=5)
        loaded = AttackPhaseHMM.load(model_path)
        assert loaded.n_states == 5

    def test_train_with_select_k(self, sample_parquet, tmp_path):
        """train with select_k should find optimal states."""
        model_path = str(tmp_path / 'model.pkl')
        train_model(sample_parquet, model_path, select_k=True, min_states=3, max_states=6)
        loaded = AttackPhaseHMM.load(model_path)
        assert 3 <= loaded.n_states <= 6

    def test_train_returns_summary(self, sample_parquet, tmp_path):
        """train should return training summary."""
        model_path = str(tmp_path / 'model.pkl')
        summary = train_model(sample_parquet, model_path, n_states=5)
        assert 'n_states' in summary
        assert 'n_sessions' in summary
        assert 'n_flows' in summary


class TestLabelCommand:
    """Test label CLI command."""

    @pytest.fixture
    def trained_model(self, sample_parquet, tmp_path):
        """Train a model for labeling tests."""
        model_path = str(tmp_path / 'model.pkl')
        train_model(sample_parquet, model_path, n_states=5)
        return model_path

    def test_label_creates_output_file(self, sample_parquet, trained_model, tmp_path):
        """label should create an output parquet file."""
        output_path = str(tmp_path / 'labeled.parquet')
        label_flows(sample_parquet, trained_model, output_path)
        assert os.path.exists(output_path)

    def test_label_adds_hmm_columns(self, sample_parquet, trained_model, tmp_path):
        """Labeled output should have HMM_STATE and HMM_TACTIC columns."""
        output_path = str(tmp_path / 'labeled.parquet')
        label_flows(sample_parquet, trained_model, output_path)

        df = pd.read_parquet(output_path)
        assert 'HMM_STATE' in df.columns
        assert 'HMM_TACTIC' in df.columns
        assert 'HMM_CONFIDENCE' in df.columns

    def test_label_preserves_original_columns(self, sample_parquet, trained_model, tmp_path):
        """Labeled output should preserve all original columns."""
        output_path = str(tmp_path / 'labeled.parquet')
        label_flows(sample_parquet, trained_model, output_path)

        original = pd.read_parquet(sample_parquet)
        labeled = pd.read_parquet(output_path)

        for col in original.columns:
            assert col in labeled.columns

    def test_label_states_in_range(self, sample_parquet, trained_model, tmp_path):
        """HMM_STATE values should be in valid range."""
        output_path = str(tmp_path / 'labeled.parquet')
        label_flows(sample_parquet, trained_model, output_path)

        df = pd.read_parquet(output_path)
        model = AttackPhaseHMM.load(trained_model)
        assert df['HMM_STATE'].min() >= 0
        assert df['HMM_STATE'].max() < model.n_states


class TestEvaluateCommand:
    """Test evaluate CLI command."""

    @pytest.fixture
    def trained_model(self, sample_parquet, tmp_path):
        """Train a model for evaluation tests."""
        model_path = str(tmp_path / 'model.pkl')
        train_model(sample_parquet, model_path, n_states=5)
        return model_path

    def test_evaluate_returns_metrics(self, trained_model, sample_parquet):
        """evaluate should return evaluation metrics."""
        metrics = evaluate_model(trained_model, sample_parquet)
        assert isinstance(metrics, dict)

    def test_evaluate_includes_state_distribution(self, trained_model, sample_parquet):
        """Metrics should include state distribution."""
        metrics = evaluate_model(trained_model, sample_parquet)
        assert 'state_distribution' in metrics

    def test_evaluate_includes_tactic_mappings(self, trained_model, sample_parquet):
        """Metrics should include tactic mappings."""
        metrics = evaluate_model(trained_model, sample_parquet)
        assert 'tactic_mappings' in metrics

    def test_evaluate_includes_transition_matrix(self, trained_model, sample_parquet):
        """Metrics should include transition matrix."""
        metrics = evaluate_model(trained_model, sample_parquet)
        assert 'transition_matrix' in metrics

    def test_evaluate_includes_log_likelihood(self, trained_model, sample_parquet):
        """Metrics should include log-likelihood."""
        metrics = evaluate_model(trained_model, sample_parquet)
        assert 'log_likelihood' in metrics
