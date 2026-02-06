"""Tests for AttackPhaseHMM - Gaussian HMM for attack phase detection."""

import pytest
import numpy as np
import tempfile
import os

from hmm.model.hmm import AttackPhaseHMM
from hmm.config import DEFAULT_N_STATES, N_ITER


class TestAttackPhaseHMM:
    """Test suite for AttackPhaseHMM."""

    @pytest.fixture
    def hmm(self):
        """Create a default HMM."""
        return AttackPhaseHMM(n_states=5)

    @pytest.fixture
    def sample_sequences(self):
        """Create sample sequences for training."""
        np.random.seed(42)
        # 10 sequences, each 20-50 flows, 12 features
        sequences = []
        lengths = []
        for _ in range(10):
            seq_len = np.random.randint(20, 50)
            seq = np.random.randn(seq_len, 12)
            sequences.append(seq)
            lengths.append(seq_len)
        return np.vstack(sequences), lengths

    def test_init_with_default_states(self):
        """HMM should use DEFAULT_N_STATES by default."""
        hmm = AttackPhaseHMM()
        assert hmm.n_states == DEFAULT_N_STATES

    def test_init_with_custom_states(self):
        """HMM should accept custom number of states."""
        hmm = AttackPhaseHMM(n_states=15)
        assert hmm.n_states == 15

    def test_fit_returns_self(self, hmm, sample_sequences):
        """fit should return self for chaining."""
        X, lengths = sample_sequences
        result = hmm.fit(X, lengths)
        assert result is hmm

    def test_fit_sets_model(self, hmm, sample_sequences):
        """fit should create the underlying HMM model."""
        X, lengths = sample_sequences
        hmm.fit(X, lengths)
        assert hmm.model is not None

    def test_predict_states_returns_array(self, hmm, sample_sequences):
        """predict_states should return numpy array of state labels."""
        X, lengths = sample_sequences
        hmm.fit(X, lengths)
        states = hmm.predict_states(X, lengths)
        assert isinstance(states, np.ndarray)

    def test_predict_states_shape(self, hmm, sample_sequences):
        """predict_states should return one state per observation."""
        X, lengths = sample_sequences
        hmm.fit(X, lengths)
        states = hmm.predict_states(X, lengths)
        assert len(states) == len(X)

    def test_predict_states_values(self, hmm, sample_sequences):
        """States should be integers in [0, n_states)."""
        X, lengths = sample_sequences
        hmm.fit(X, lengths)
        states = hmm.predict_states(X, lengths)
        assert states.min() >= 0
        assert states.max() < hmm.n_states

    def test_score_returns_float(self, hmm, sample_sequences):
        """score should return log-likelihood as float."""
        X, lengths = sample_sequences
        hmm.fit(X, lengths)
        score = hmm.score(X, lengths)
        assert isinstance(score, (int, float))

    def test_transition_matrix_shape(self, hmm, sample_sequences):
        """Transition matrix should be (n_states, n_states)."""
        X, lengths = sample_sequences
        hmm.fit(X, lengths)
        trans = hmm.get_transition_matrix()
        assert trans.shape == (hmm.n_states, hmm.n_states)

    def test_transition_matrix_is_stochastic(self, hmm, sample_sequences):
        """Transition matrix rows should sum to 1."""
        X, lengths = sample_sequences
        hmm.fit(X, lengths)
        trans = hmm.get_transition_matrix()
        row_sums = trans.sum(axis=1)
        np.testing.assert_array_almost_equal(row_sums, np.ones(hmm.n_states))

    def test_emission_means_shape(self, hmm, sample_sequences):
        """Emission means should be (n_states, n_features)."""
        X, lengths = sample_sequences
        hmm.fit(X, lengths)
        means = hmm.get_emission_means()
        assert means.shape == (hmm.n_states, X.shape[1])

    def test_convergence_improves_score(self, sample_sequences):
        """More iterations should improve or maintain log-likelihood."""
        X, lengths = sample_sequences

        hmm1 = AttackPhaseHMM(n_states=5, n_iter=5, random_state=42)
        hmm1.fit(X, lengths)
        score1 = hmm1.score(X, lengths)

        hmm2 = AttackPhaseHMM(n_states=5, n_iter=50, random_state=42)
        hmm2.fit(X, lengths)
        score2 = hmm2.score(X, lengths)

        assert score2 >= score1 - 0.1  # Allow small numerical tolerance


class TestAttackPhaseHMMPersistence:
    """Test model persistence (save/load)."""

    @pytest.fixture
    def trained_hmm(self):
        """Create and train an HMM."""
        np.random.seed(42)
        X = np.random.randn(100, 12)
        lengths = [20, 30, 25, 25]
        hmm = AttackPhaseHMM(n_states=5)
        hmm.fit(X, lengths)
        return hmm

    def test_save_creates_file(self, trained_hmm):
        """save should create a file at the specified path."""
        with tempfile.NamedTemporaryFile(suffix='.pkl', delete=False) as f:
            path = f.name
        try:
            trained_hmm.save(path)
            assert os.path.exists(path)
        finally:
            os.unlink(path)

    def test_load_restores_model(self, trained_hmm):
        """load should restore a model with same parameters."""
        with tempfile.NamedTemporaryFile(suffix='.pkl', delete=False) as f:
            path = f.name
        try:
            trained_hmm.save(path)
            loaded = AttackPhaseHMM.load(path)
            assert loaded.n_states == trained_hmm.n_states
        finally:
            os.unlink(path)

    def test_loaded_model_same_predictions(self, trained_hmm):
        """Loaded model should give same predictions as original."""
        np.random.seed(123)
        X = np.random.randn(50, 12)
        lengths = [25, 25]

        with tempfile.NamedTemporaryFile(suffix='.pkl', delete=False) as f:
            path = f.name
        try:
            trained_hmm.save(path)
            loaded = AttackPhaseHMM.load(path)

            states_orig = trained_hmm.predict_states(X, lengths)
            states_loaded = loaded.predict_states(X, lengths)
            np.testing.assert_array_equal(states_orig, states_loaded)
        finally:
            os.unlink(path)


class TestAttackPhaseHMMModelSelection:
    """Test BIC-based model selection."""

    @pytest.fixture
    def sample_sequences(self):
        """Create sample sequences for model selection."""
        np.random.seed(42)
        # Generate data with clear cluster structure (easier to fit)
        sequences = []
        lengths = []
        for _ in range(20):
            seq_len = np.random.randint(30, 50)
            # Create data with some structure
            state = np.random.randint(0, 3)
            mean = state * 2  # Different means for different "true" states
            seq = np.random.randn(seq_len, 12) + mean
            sequences.append(seq)
            lengths.append(seq_len)
        return np.vstack(sequences), lengths

    def test_compute_bic(self, sample_sequences):
        """compute_bic should return a float."""
        X, lengths = sample_sequences
        hmm = AttackPhaseHMM(n_states=5)
        hmm.fit(X, lengths)
        bic = hmm.compute_bic(X, lengths)
        assert isinstance(bic, float)
        assert np.isfinite(bic)

    def test_select_n_states(self, sample_sequences):
        """select_n_states should return optimal number of states."""
        X, lengths = sample_sequences
        best_k = AttackPhaseHMM.select_n_states(X, lengths, min_states=3, max_states=8)
        assert 3 <= best_k <= 8


class TestAttackPhaseHMMEdgeCases:
    """Edge case tests."""

    def test_single_sequence(self):
        """Should handle single sequence."""
        np.random.seed(42)
        X = np.random.randn(50, 12)
        lengths = [50]

        hmm = AttackPhaseHMM(n_states=3)
        hmm.fit(X, lengths)
        states = hmm.predict_states(X, lengths)
        assert len(states) == 50

    def test_short_sequences(self):
        """Should handle short sequences."""
        np.random.seed(42)
        X = np.random.randn(15, 12)
        lengths = [5, 5, 5]

        hmm = AttackPhaseHMM(n_states=3)
        hmm.fit(X, lengths)
        states = hmm.predict_states(X, lengths)
        assert len(states) == 15

    def test_many_sequences(self):
        """Should handle many sequences efficiently."""
        np.random.seed(42)
        X = np.random.randn(500, 12)
        lengths = [10] * 50  # 50 sequences of 10

        hmm = AttackPhaseHMM(n_states=5)
        hmm.fit(X, lengths)
        states = hmm.predict_states(X, lengths)
        assert len(states) == 500
