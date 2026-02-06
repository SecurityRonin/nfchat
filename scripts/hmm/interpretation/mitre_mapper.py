"""MITRE mapper - maps HMM states to MITRE ATT&CK tactics."""

from dataclasses import dataclass
from typing import Callable

from hmm.interpretation.state_analyzer import StateSignature


@dataclass
class TacticProfile:
    """
    Profile for matching HMM states to MITRE ATT&CK tactics.

    Contains a scoring function that evaluates how well a state
    signature matches this tactic's expected behavior.
    """
    tactic: str
    score_fn: Callable[[StateSignature], float]


def _clamp(value: float, min_val: float = 0.0, max_val: float = 1.0) -> float:
    """Clamp value to [min_val, max_val]."""
    return max(min_val, min(max_val, value))


def _reconnaissance_score(sig: StateSignature) -> float:
    """
    Score for Reconnaissance/Discovery.

    Characteristics:
    - Low bytes (probing, not transferring data)
    - Short duration (quick scans)
    - High packet rate (scanning many ports/hosts)
    - Mostly well-known ports (scanning services)
    """
    score = 0.0

    # Low average bytes (< 500)
    if sig.avg_in_bytes < 500 and sig.avg_out_bytes < 500:
        score += 0.3

    # Short duration (< 1s)
    if sig.avg_duration_ms < 1000:
        score += 0.2

    # High packet rate (> 10 pps)
    if sig.avg_pkts_per_sec > 10:
        score += 0.2

    # Targeting well-known ports
    if sig.port_category_dist.get(0, 0) > 0.5:
        score += 0.3

    return _clamp(score)


def _exfiltration_score(sig: StateSignature) -> float:
    """
    Score for Exfiltration.

    Characteristics:
    - High outbound bytes (data leaving)
    - Low bytes ratio (out >> in)
    - Long duration (large transfers)
    - Ephemeral/high ports
    """
    score = 0.0

    # High outbound bytes (> 10KB)
    if sig.avg_out_bytes > 10000:
        score += 0.3

    # Low bytes ratio (out >> in)
    if sig.bytes_ratio < 0.1:
        score += 0.3

    # Long duration (> 10s)
    if sig.avg_duration_ms > 10000:
        score += 0.2

    # Ephemeral ports
    if sig.port_category_dist.get(2, 0) > 0.5:
        score += 0.2

    return _clamp(score)


def _c2_score(sig: StateSignature) -> float:
    """
    Score for Command and Control.

    Characteristics:
    - Balanced or low bytes (commands, not bulk data)
    - Long duration (persistent connection)
    - Low packet rate (periodic heartbeat)
    - High/ephemeral ports
    - Mostly TCP
    """
    score = 0.0

    # Long duration (> 30s)
    if sig.avg_duration_ms > 30000:
        score += 0.3

    # Low packet rate (< 2 pps - heartbeat)
    if sig.avg_pkts_per_sec < 2:
        score += 0.2

    # Balanced bytes (ratio near 1)
    if 0.5 < sig.bytes_ratio < 2.0:
        score += 0.1

    # Ephemeral ports
    if sig.port_category_dist.get(2, 0) > 0.5:
        score += 0.2

    # Mostly TCP
    if sig.protocol_dist.get('tcp', 0) > 0.8:
        score += 0.2

    return _clamp(score)


def _lateral_movement_score(sig: StateSignature) -> float:
    """
    Score for Lateral Movement.

    Characteristics:
    - Moderate bytes (transferring tools/data)
    - Mixed port usage (SMB, RDP, WinRM, etc.)
    - Moderate duration
    """
    score = 0.0

    # Moderate bytes (1KB - 100KB)
    if 1000 < sig.avg_in_bytes < 100000:
        score += 0.2

    # Mixed port categories
    dist = sig.port_category_dist
    if dist.get(0, 0) > 0.2 and dist.get(1, 0) > 0.2:
        score += 0.3

    # Moderate duration (1-30s)
    if 1000 < sig.avg_duration_ms < 30000:
        score += 0.2

    # Mostly TCP (admin protocols)
    if sig.protocol_dist.get('tcp', 0) > 0.7:
        score += 0.3

    return _clamp(score)


def _benign_score(sig: StateSignature) -> float:
    """
    Score for Benign traffic.

    Characteristics:
    - Balanced bytes ratio (~1)
    - Mixed protocols
    - High flow count (normal patterns have volume)
    - Mixed port distribution
    """
    score = 0.0

    # Balanced bytes ratio (0.5 - 2.0)
    if 0.5 < sig.bytes_ratio < 2.0:
        score += 0.3

    # Mixed protocols
    if sig.protocol_dist.get('tcp', 0) < 0.9 and sig.protocol_dist.get('udp', 0) > 0.1:
        score += 0.2

    # High flow count (> 1000)
    if sig.flow_count > 1000:
        score += 0.2

    # Mixed port distribution
    dist = sig.port_category_dist
    if dist.get(0, 0) > 0.2 and dist.get(1, 0) > 0.2:
        score += 0.3

    return _clamp(score)


def _credential_access_score(sig: StateSignature) -> float:
    """
    Score for Credential Access.

    Characteristics:
    - Low bytes (auth attempts, not data)
    - Well-known auth ports (22, 3389, etc.)
    - Short-medium duration
    - Multiple attempts (moderate packet rate)
    """
    score = 0.0

    # Low bytes
    if sig.avg_in_bytes < 1000 and sig.avg_out_bytes < 1000:
        score += 0.3

    # Well-known ports (SSH, RDP, etc.)
    if sig.port_category_dist.get(0, 0) > 0.6:
        score += 0.3

    # Short-medium duration
    if sig.avg_duration_ms < 5000:
        score += 0.2

    # Mostly TCP
    if sig.protocol_dist.get('tcp', 0) > 0.9:
        score += 0.2

    return _clamp(score)


class MitreMapper:
    """
    Maps HMM state signatures to MITRE ATT&CK tactics.

    Uses behavioral profiles to score each signature against known
    attack tactic patterns, returning the best match with confidence.
    """

    def __init__(self):
        """Initialize with tactic profiles."""
        self.profiles = [
            TacticProfile('Reconnaissance', _reconnaissance_score),
            TacticProfile('Discovery', _reconnaissance_score),  # Similar to recon
            TacticProfile('Credential Access', _credential_access_score),
            TacticProfile('Lateral Movement', _lateral_movement_score),
            TacticProfile('Command and Control', _c2_score),
            TacticProfile('Exfiltration', _exfiltration_score),
            TacticProfile('Benign', _benign_score),
        ]

    def map(self, signature: StateSignature) -> tuple[str, float]:
        """
        Map a state signature to a MITRE tactic.

        Args:
            signature: State signature to map

        Returns:
            Tuple of (tactic_name, confidence_score)
        """
        best_tactic = 'Unknown'
        best_score = 0.0

        for profile in self.profiles:
            score = profile.score_fn(signature)
            if score > best_score:
                best_score = score
                best_tactic = profile.tactic

        return best_tactic, best_score

    def map_all(self, signatures: list[StateSignature]) -> dict[int, tuple[str, float]]:
        """
        Map all signatures to tactics.

        Args:
            signatures: List of state signatures

        Returns:
            Dict mapping state_id to (tactic, confidence)
        """
        return {sig.state_id: self.map(sig) for sig in signatures}
