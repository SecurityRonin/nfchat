"""State analyzer - computes signatures for learned HMM states."""

from dataclasses import dataclass
import pandas as pd
import numpy as np

from hmm.config import PROTO_TCP, PROTO_UDP, PROTO_ICMP


@dataclass
class StateSignature:
    """
    Signature describing a learned HMM state.

    Captures the statistical profile of flows assigned to this state,
    enabling interpretation and MITRE tactic mapping.
    """
    state_id: int
    avg_in_bytes: float
    avg_out_bytes: float
    bytes_ratio: float
    avg_duration_ms: float
    avg_pkts_per_sec: float
    protocol_dist: dict[str, float]
    port_category_dist: dict[int, float]
    flow_count: int


class StateAnalyzer:
    """
    Analyzes HMM states to compute behavioral signatures.

    Each state's signature captures average volume, timing, protocol usage,
    and port distribution to enable MITRE tactic mapping.
    """

    def analyze(self, flows: pd.DataFrame) -> list[StateSignature]:
        """
        Compute signatures for each HMM state in the flows.

        Args:
            flows: DataFrame with HMM_STATE column and flow features

        Returns:
            List of StateSignature, one per unique state
        """
        signatures = []

        for state_id, group in flows.groupby('HMM_STATE'):
            sig = self._compute_signature(int(state_id), group)
            signatures.append(sig)

        return sorted(signatures, key=lambda s: s.state_id)

    def _compute_signature(self, state_id: int, flows: pd.DataFrame) -> StateSignature:
        """Compute signature for a single state."""
        n = len(flows)

        # Volume averages
        avg_in_bytes = flows['IN_BYTES'].mean()
        avg_out_bytes = flows['OUT_BYTES'].mean()
        bytes_ratio = avg_in_bytes / (avg_out_bytes + 1)

        # Timing
        avg_duration_ms = flows['FLOW_DURATION_MILLISECONDS'].mean()

        # Packets per second
        total_pkts = flows['IN_PKTS'] + flows['OUT_PKTS']
        duration_s = np.maximum(flows['FLOW_DURATION_MILLISECONDS'], 1) / 1000.0
        avg_pkts_per_sec = (total_pkts / duration_s).mean()

        # Protocol distribution
        protocol_dist = self._compute_protocol_dist(flows['PROTOCOL'])

        # Port category distribution
        port_category_dist = self._compute_port_category_dist(flows['L4_DST_PORT'])

        return StateSignature(
            state_id=state_id,
            avg_in_bytes=avg_in_bytes,
            avg_out_bytes=avg_out_bytes,
            bytes_ratio=bytes_ratio,
            avg_duration_ms=avg_duration_ms,
            avg_pkts_per_sec=avg_pkts_per_sec,
            protocol_dist=protocol_dist,
            port_category_dist=port_category_dist,
            flow_count=n,
        )

    def _compute_protocol_dist(self, protocols: pd.Series) -> dict[str, float]:
        """Compute protocol distribution."""
        n = len(protocols)
        if n == 0:
            return {'tcp': 0.0, 'udp': 0.0, 'icmp': 0.0}

        tcp_count = (protocols == PROTO_TCP).sum()
        udp_count = (protocols == PROTO_UDP).sum()
        icmp_count = (protocols == PROTO_ICMP).sum()

        return {
            'tcp': tcp_count / n,
            'udp': udp_count / n,
            'icmp': icmp_count / n,
        }

    def _compute_port_category_dist(self, ports: pd.Series) -> dict[int, float]:
        """
        Compute port category distribution.

        Categories:
            0: Well-known (0-1023)
            1: Registered (1024-49151)
            2: Ephemeral (49152-65535)
        """
        n = len(ports)
        if n == 0:
            return {0: 0.0, 1: 0.0, 2: 0.0}

        well_known = ((ports >= 0) & (ports <= 1023)).sum()
        registered = ((ports >= 1024) & (ports <= 49151)).sum()
        ephemeral = (ports >= 49152).sum()

        return {
            0: well_known / n,
            1: registered / n,
            2: ephemeral / n,
        }
