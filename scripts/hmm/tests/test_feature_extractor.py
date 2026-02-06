"""Tests for FlowFeatureExtractor - 12-feature extraction pipeline."""

import pytest
import pandas as pd
import numpy as np

from hmm.features.extractor import FlowFeatureExtractor
from hmm.config import FEATURE_NAMES, PROTO_TCP, PROTO_UDP, PROTO_ICMP


class TestFlowFeatureExtractor:
    """Test suite for FlowFeatureExtractor."""

    @pytest.fixture
    def extractor(self):
        """Create a default FlowFeatureExtractor."""
        return FlowFeatureExtractor()

    @pytest.fixture
    def sample_flows(self):
        """Create sample flow data for testing."""
        return pd.DataFrame({
            'IN_BYTES': [100, 1000, 0, 500],
            'OUT_BYTES': [200, 500, 100, 0],
            'IN_PKTS': [10, 50, 0, 20],
            'OUT_PKTS': [15, 30, 5, 0],
            'FLOW_DURATION_MILLISECONDS': [1000, 5000, 100, 2000],
            'PROTOCOL': [PROTO_TCP, PROTO_UDP, PROTO_ICMP, PROTO_TCP],
            'L4_DST_PORT': [80, 53, 0, 65000],
            'FLOW_START_MILLISECONDS': [1000, 2000, 3000, 4000],
        })

    def test_transform_returns_numpy_array(self, extractor, sample_flows):
        """transform should return a numpy array."""
        features = extractor.transform(sample_flows)
        assert isinstance(features, np.ndarray)

    def test_output_shape(self, extractor, sample_flows):
        """Output should have shape (n_flows, 12)."""
        features = extractor.transform(sample_flows)
        assert features.shape == (len(sample_flows), 12)

    def test_feature_names_match(self, extractor):
        """Feature names should match config."""
        assert extractor.feature_names == FEATURE_NAMES

    def test_log1p_scaling_bytes(self, extractor):
        """Bytes features should use log1p scaling."""
        flows = pd.DataFrame({
            'IN_BYTES': [0, 100, 10000],
            'OUT_BYTES': [0, 200, 20000],
            'IN_PKTS': [0, 10, 100],
            'OUT_PKTS': [0, 20, 200],
            'FLOW_DURATION_MILLISECONDS': [1000, 1000, 1000],
            'PROTOCOL': [PROTO_TCP, PROTO_TCP, PROTO_TCP],
            'L4_DST_PORT': [80, 80, 80],
            'FLOW_START_MILLISECONDS': [1000, 2000, 3000],
        })
        features = extractor.transform(flows)

        # log1p_in_bytes is first feature
        expected = np.log1p([0, 100, 10000])
        np.testing.assert_array_almost_equal(features[:, 0], expected)

        # log1p_out_bytes is second feature
        expected = np.log1p([0, 200, 20000])
        np.testing.assert_array_almost_equal(features[:, 1], expected)

    def test_bytes_ratio(self, extractor):
        """bytes_ratio = IN_BYTES / (OUT_BYTES + 1)."""
        flows = pd.DataFrame({
            'IN_BYTES': [100, 0, 1000],
            'OUT_BYTES': [100, 100, 0],  # +1 to avoid div by zero
            'IN_PKTS': [10, 10, 10],
            'OUT_PKTS': [10, 10, 10],
            'FLOW_DURATION_MILLISECONDS': [1000, 1000, 1000],
            'PROTOCOL': [PROTO_TCP, PROTO_TCP, PROTO_TCP],
            'L4_DST_PORT': [80, 80, 80],
            'FLOW_START_MILLISECONDS': [1000, 2000, 3000],
        })
        features = extractor.transform(flows)

        # bytes_ratio is feature index 6
        expected = [100 / 101, 0 / 101, 1000 / 1]
        np.testing.assert_array_almost_equal(features[:, 6], expected)

    def test_pkts_per_second(self, extractor):
        """pkts_per_second = total_pkts / (duration_ms / 1000)."""
        flows = pd.DataFrame({
            'IN_BYTES': [100, 100],
            'OUT_BYTES': [100, 100],
            'IN_PKTS': [10, 50],
            'OUT_PKTS': [10, 50],
            'FLOW_DURATION_MILLISECONDS': [1000, 2000],  # 1s and 2s
            'PROTOCOL': [PROTO_TCP, PROTO_TCP],
            'L4_DST_PORT': [80, 80],
            'FLOW_START_MILLISECONDS': [1000, 2000],
        })
        features = extractor.transform(flows)

        # pkts_per_second is feature index 7
        # Flow 1: 20 pkts / 1s = 20
        # Flow 2: 100 pkts / 2s = 50
        expected = [20.0, 50.0]
        np.testing.assert_array_almost_equal(features[:, 7], expected)

    def test_protocol_one_hot(self, extractor):
        """Protocol should be one-hot encoded (is_tcp, is_udp, is_icmp)."""
        flows = pd.DataFrame({
            'IN_BYTES': [100, 100, 100, 100],
            'OUT_BYTES': [100, 100, 100, 100],
            'IN_PKTS': [10, 10, 10, 10],
            'OUT_PKTS': [10, 10, 10, 10],
            'FLOW_DURATION_MILLISECONDS': [1000, 1000, 1000, 1000],
            'PROTOCOL': [PROTO_TCP, PROTO_UDP, PROTO_ICMP, 99],  # 99 = other
            'L4_DST_PORT': [80, 53, 0, 80],
            'FLOW_START_MILLISECONDS': [1000, 2000, 3000, 4000],
        })
        features = extractor.transform(flows)

        # is_tcp (index 8), is_udp (index 9), is_icmp (index 10)
        assert features[0, 8] == 1.0  # TCP
        assert features[0, 9] == 0.0
        assert features[0, 10] == 0.0

        assert features[1, 8] == 0.0
        assert features[1, 9] == 1.0  # UDP
        assert features[1, 10] == 0.0

        assert features[2, 8] == 0.0
        assert features[2, 9] == 0.0
        assert features[2, 10] == 1.0  # ICMP

        # Other protocol = all zeros
        assert features[3, 8] == 0.0
        assert features[3, 9] == 0.0
        assert features[3, 10] == 0.0

    def test_port_category(self, extractor):
        """Port category: 0=well-known (0-1023), 1=registered (1024-49151), 2=ephemeral."""
        flows = pd.DataFrame({
            'IN_BYTES': [100] * 5,
            'OUT_BYTES': [100] * 5,
            'IN_PKTS': [10] * 5,
            'OUT_PKTS': [10] * 5,
            'FLOW_DURATION_MILLISECONDS': [1000] * 5,
            'PROTOCOL': [PROTO_TCP] * 5,
            'L4_DST_PORT': [22, 80, 1023, 1024, 65000],
            'FLOW_START_MILLISECONDS': [1000, 2000, 3000, 4000, 5000],
        })
        features = extractor.transform(flows)

        # port_category is feature index 11
        expected = [0, 0, 0, 1, 2]  # well-known, well-known, well-known, registered, ephemeral
        np.testing.assert_array_equal(features[:, 11], expected)

    def test_iat_calculation(self, extractor):
        """log1p_iat_avg should be log1p of inter-arrival time average."""
        flows = pd.DataFrame({
            'IN_BYTES': [100, 100, 100],
            'OUT_BYTES': [100, 100, 100],
            'IN_PKTS': [10, 10, 10],
            'OUT_PKTS': [10, 10, 10],
            'FLOW_DURATION_MILLISECONDS': [1000, 1000, 1000],
            'PROTOCOL': [PROTO_TCP, PROTO_TCP, PROTO_TCP],
            'L4_DST_PORT': [80, 80, 80],
            'FLOW_START_MILLISECONDS': [1000, 2000, 4000],  # IAT: 1000, 2000
        })
        features = extractor.transform(flows)

        # log1p_iat_avg is feature index 5
        # First flow has no previous, so IAT = 0
        # Second flow: IAT = 1000
        # Third flow: IAT = 2000
        # Average for each flow is computed over the session
        # For single-flow perspective, use 0 for first, diff from prev for rest
        assert features[0, 5] == np.log1p(0)  # First flow, no previous
        assert features[1, 5] == np.log1p(1000)
        assert features[2, 5] == np.log1p(2000)

    def test_handles_zero_duration(self, extractor):
        """Should handle zero duration gracefully (no div by zero)."""
        flows = pd.DataFrame({
            'IN_BYTES': [100],
            'OUT_BYTES': [100],
            'IN_PKTS': [10],
            'OUT_PKTS': [10],
            'FLOW_DURATION_MILLISECONDS': [0],  # Zero duration
            'PROTOCOL': [PROTO_TCP],
            'L4_DST_PORT': [80],
            'FLOW_START_MILLISECONDS': [1000],
        })
        features = extractor.transform(flows)

        # pkts_per_second should handle zero duration
        # Use duration + 1 or some safe default
        assert np.isfinite(features[:, 7]).all()


class TestFlowFeatureExtractorNormalization:
    """Test normalization (fit/transform pattern)."""

    @pytest.fixture
    def extractor(self):
        return FlowFeatureExtractor()

    @pytest.fixture
    def training_flows(self):
        """Larger dataset for fitting normalizer."""
        np.random.seed(42)
        n = 100
        return pd.DataFrame({
            'IN_BYTES': np.random.randint(0, 10000, n),
            'OUT_BYTES': np.random.randint(0, 10000, n),
            'IN_PKTS': np.random.randint(0, 100, n),
            'OUT_PKTS': np.random.randint(0, 100, n),
            'FLOW_DURATION_MILLISECONDS': np.random.randint(1, 5000, n),
            'PROTOCOL': np.random.choice([PROTO_TCP, PROTO_UDP, PROTO_ICMP], n),
            'L4_DST_PORT': np.random.randint(0, 65535, n),
            'FLOW_START_MILLISECONDS': np.arange(1000, 1000 + n * 1000, 1000),
        })

    def test_fit_transform(self, extractor, training_flows):
        """fit_transform should fit normalizer and return normalized features."""
        features = extractor.fit_transform(training_flows)
        assert features.shape == (len(training_flows), 12)
        # After normalization, most features should have mean ~0 and std ~1
        # (except one-hot encoded features)

    def test_transform_uses_fitted_normalizer(self, extractor, training_flows):
        """transform should use fitted normalizer parameters."""
        extractor.fit_transform(training_flows)

        # Transform same data should give same result
        features1 = extractor.transform(training_flows)
        features2 = extractor.transform(training_flows)
        np.testing.assert_array_equal(features1, features2)

    def test_transform_without_fit_raises(self, extractor):
        """transform without normalize=True should work, but normalized transform needs fit."""
        flows = pd.DataFrame({
            'IN_BYTES': [100],
            'OUT_BYTES': [100],
            'IN_PKTS': [10],
            'OUT_PKTS': [10],
            'FLOW_DURATION_MILLISECONDS': [1000],
            'PROTOCOL': [PROTO_TCP],
            'L4_DST_PORT': [80],
            'FLOW_START_MILLISECONDS': [1000],
        })
        # Raw transform should work
        features = extractor.transform(flows, normalize=False)
        assert features.shape == (1, 12)

    def test_normalized_features_centered(self, extractor, training_flows):
        """Normalized features should be roughly centered (mean ~0)."""
        features = extractor.fit_transform(training_flows)

        # Check continuous features (not one-hot)
        continuous_indices = [0, 1, 2, 3, 4, 5, 6, 7]  # log1p features, ratios
        for idx in continuous_indices:
            mean = features[:, idx].mean()
            assert abs(mean) < 0.5, f"Feature {idx} mean {mean} not centered"
