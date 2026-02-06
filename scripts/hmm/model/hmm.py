"""AttackPhaseHMM - Gaussian HMM for attack phase detection."""

import numpy as np
import joblib
from hmmlearn import hmm

from hmm.config import DEFAULT_N_STATES, N_ITER, RANDOM_STATE


class AttackPhaseHMM:
    """
    Gaussian Hidden Markov Model for unsupervised attack phase detection.

    Uses Baum-Welch algorithm for training and Viterbi algorithm for decoding.
    Each hidden state represents a potential attack phase or benign behavior.
    """

    def __init__(
        self,
        n_states: int = DEFAULT_N_STATES,
        n_iter: int = N_ITER,
        random_state: int | None = None
    ):
        """
        Initialize AttackPhaseHMM.

        Args:
            n_states: Number of hidden states
            n_iter: Maximum number of EM iterations
            random_state: Random seed for reproducibility
        """
        self.n_states = n_states
        self.n_iter = n_iter
        self.random_state = random_state if random_state is not None else RANDOM_STATE
        self.model: hmm.GaussianHMM | None = None

    def fit(self, X: np.ndarray, lengths: list[int]) -> 'AttackPhaseHMM':
        """
        Fit the HMM using Baum-Welch algorithm.

        Args:
            X: Feature array of shape (n_samples, n_features)
            lengths: List of sequence lengths

        Returns:
            self for method chaining
        """
        self.model = hmm.GaussianHMM(
            n_components=self.n_states,
            covariance_type='diag',
            n_iter=self.n_iter,
            random_state=self.random_state,
        )
        self.model.fit(X, lengths)
        return self

    def predict_states(self, X: np.ndarray, lengths: list[int]) -> np.ndarray:
        """
        Predict hidden states using Viterbi algorithm.

        Args:
            X: Feature array of shape (n_samples, n_features)
            lengths: List of sequence lengths

        Returns:
            Array of state labels of shape (n_samples,)
        """
        if self.model is None:
            raise RuntimeError("Model not fitted. Call fit() first.")
        return self.model.predict(X, lengths)

    def score(self, X: np.ndarray, lengths: list[int]) -> float:
        """
        Compute log-likelihood of sequences.

        Args:
            X: Feature array of shape (n_samples, n_features)
            lengths: List of sequence lengths

        Returns:
            Log-likelihood score
        """
        if self.model is None:
            raise RuntimeError("Model not fitted. Call fit() first.")
        return self.model.score(X, lengths)

    def get_transition_matrix(self) -> np.ndarray:
        """
        Get the state transition probability matrix.

        Returns:
            Transition matrix of shape (n_states, n_states)
        """
        if self.model is None:
            raise RuntimeError("Model not fitted. Call fit() first.")
        return self.model.transmat_

    def get_emission_means(self) -> np.ndarray:
        """
        Get the emission distribution means for each state.

        Returns:
            Means of shape (n_states, n_features)
        """
        if self.model is None:
            raise RuntimeError("Model not fitted. Call fit() first.")
        return self.model.means_

    def get_emission_covariances(self) -> np.ndarray:
        """
        Get the emission distribution covariances for each state.

        Returns:
            Covariances (diagonal) of shape (n_states, n_features)
        """
        if self.model is None:
            raise RuntimeError("Model not fitted. Call fit() first.")
        return self.model.covars_

    def compute_bic(self, X: np.ndarray, lengths: list[int]) -> float:
        """
        Compute Bayesian Information Criterion for model selection.

        BIC = -2 * log_likelihood + k * log(n)
        where k is number of parameters and n is number of samples.

        Lower BIC indicates better model.

        Args:
            X: Feature array
            lengths: Sequence lengths

        Returns:
            BIC score
        """
        if self.model is None:
            raise RuntimeError("Model not fitted. Call fit() first.")

        n_samples, n_features = X.shape
        log_likelihood = self.model.score(X, lengths)

        # Number of parameters:
        # - Initial state probs: n_states - 1 (sum to 1)
        # - Transition matrix: n_states * (n_states - 1) (rows sum to 1)
        # - Emission means: n_states * n_features
        # - Emission covariances (diagonal): n_states * n_features
        n_params = (
            (self.n_states - 1) +
            self.n_states * (self.n_states - 1) +
            self.n_states * n_features * 2  # means + diagonal covars
        )

        bic = -2 * log_likelihood + n_params * np.log(n_samples)
        return bic

    def save(self, path: str):
        """
        Save the model to disk.

        Args:
            path: File path for saving
        """
        data = {
            'n_states': self.n_states,
            'n_iter': self.n_iter,
            'random_state': self.random_state,
            'model': self.model,
        }
        joblib.dump(data, path)

    @classmethod
    def load(cls, path: str) -> 'AttackPhaseHMM':
        """
        Load a model from disk.

        Args:
            path: File path to load from

        Returns:
            Loaded AttackPhaseHMM instance
        """
        data = joblib.load(path)
        instance = cls(
            n_states=data['n_states'],
            n_iter=data['n_iter'],
            random_state=data['random_state'],
        )
        instance.model = data['model']
        return instance

    @classmethod
    def select_n_states(
        cls,
        X: np.ndarray,
        lengths: list[int],
        min_states: int = 4,
        max_states: int = 15,
        n_iter: int = 50,
        random_state: int = RANDOM_STATE
    ) -> int:
        """
        Select optimal number of states using BIC.

        Args:
            X: Feature array
            lengths: Sequence lengths
            min_states: Minimum states to try
            max_states: Maximum states to try
            n_iter: Iterations for each model
            random_state: Random seed

        Returns:
            Optimal number of states
        """
        best_bic = np.inf
        best_k = min_states

        for k in range(min_states, max_states + 1):
            try:
                model = cls(n_states=k, n_iter=n_iter, random_state=random_state)
                model.fit(X, lengths)
                bic = model.compute_bic(X, lengths)

                if bic < best_bic:
                    best_bic = bic
                    best_k = k
            except Exception:
                # Skip if model fails to converge for this k
                continue

        return best_k
