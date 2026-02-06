"""Feature extractor - extracts 12 features from network flows for HMM."""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

from hmm.config import FEATURE_NAMES, PROTO_TCP, PROTO_UDP, PROTO_ICMP


class FlowFeatureExtractor:
    """
    Extracts 12 features from network flows for HMM training.

    Features:
    - log1p_in_bytes, log1p_out_bytes: Log-scaled bytes (handles heavy tails)
    - log1p_in_pkts, log1p_out_pkts: Log-scaled packets
    - log1p_duration_ms: Log-scaled flow duration
    - log1p_iat_avg: Log-scaled inter-arrival time
    - bytes_ratio: IN_BYTES / (OUT_BYTES + 1)
    - pkts_per_second: Total packets / duration
    - is_tcp, is_udp, is_icmp: Protocol one-hot encoding
    - port_category: 0=well-known, 1=registered, 2=ephemeral
    """

    def __init__(self):
        self.feature_names = FEATURE_NAMES
        self.scaler = StandardScaler()
        self._is_fitted = False

    def fit_transform(self, flows: pd.DataFrame) -> np.ndarray:
        """
        Fit normalizer on flows and return normalized features.

        Args:
            flows: DataFrame with flow data

        Returns:
            Normalized feature array of shape (n_flows, 12)
        """
        raw_features = self._extract_features(flows)
        normalized = self.scaler.fit_transform(raw_features)
        self._is_fitted = True
        return normalized

    def transform(self, flows: pd.DataFrame, normalize: bool = True) -> np.ndarray:
        """
        Transform flows to features.

        Args:
            flows: DataFrame with flow data
            normalize: If True, apply fitted normalizer (requires prior fit)

        Returns:
            Feature array of shape (n_flows, 12)
        """
        raw_features = self._extract_features(flows)

        if normalize and self._is_fitted:
            return self.scaler.transform(raw_features)
        return raw_features

    def _extract_features(self, flows: pd.DataFrame) -> np.ndarray:
        """Extract raw features from flows."""
        n = len(flows)
        features = np.zeros((n, 12), dtype=np.float64)

        # Volume features (log-scaled)
        features[:, 0] = np.log1p(flows['IN_BYTES'].values)
        features[:, 1] = np.log1p(flows['OUT_BYTES'].values)
        features[:, 2] = np.log1p(flows['IN_PKTS'].values)
        features[:, 3] = np.log1p(flows['OUT_PKTS'].values)

        # Temporal features
        features[:, 4] = np.log1p(flows['FLOW_DURATION_MILLISECONDS'].values)

        # Inter-arrival time (computed from flow start times)
        times = flows['FLOW_START_MILLISECONDS'].values.astype(np.float64)
        iat = np.zeros(n)
        if n > 1:
            iat[1:] = times[1:] - times[:-1]
        # Clamp negative values (unsorted data) and cap extremely large values
        iat = np.clip(iat, 0, 1e10)
        features[:, 5] = np.log1p(iat)

        # Derived ratios
        in_bytes = flows['IN_BYTES'].values
        out_bytes = flows['OUT_BYTES'].values
        features[:, 6] = in_bytes / (out_bytes + 1)  # bytes_ratio

        # Packets per second (handle zero duration)
        duration_ms = flows['FLOW_DURATION_MILLISECONDS'].values
        total_pkts = flows['IN_PKTS'].values + flows['OUT_PKTS'].values
        # Use max(duration_ms, 1) to avoid division by zero
        duration_s = np.maximum(duration_ms, 1) / 1000.0
        features[:, 7] = total_pkts / duration_s

        # Protocol one-hot encoding
        protocol = flows['PROTOCOL'].values
        features[:, 8] = (protocol == PROTO_TCP).astype(float)
        features[:, 9] = (protocol == PROTO_UDP).astype(float)
        features[:, 10] = (protocol == PROTO_ICMP).astype(float)

        # Port category
        ports = flows['L4_DST_PORT'].values
        features[:, 11] = self._port_category(ports)

        return features

    def _port_category(self, ports: np.ndarray) -> np.ndarray:
        """
        Categorize ports.

        Returns:
            0 = well-known (0-1023)
            1 = registered (1024-49151)
            2 = ephemeral (49152-65535)
        """
        categories = np.zeros(len(ports), dtype=np.float64)
        categories[(ports >= 1024) & (ports <= 49151)] = 1
        categories[ports >= 49152] = 2
        return categories
