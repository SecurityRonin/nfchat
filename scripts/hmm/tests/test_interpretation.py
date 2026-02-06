"""Tests for state interpretation - StateAnalyzer and MitreMapper."""

import pytest
import numpy as np
import pandas as pd

from hmm.interpretation.state_analyzer import StateAnalyzer, StateSignature
from hmm.interpretation.mitre_mapper import MitreMapper, TacticProfile
from hmm.model.hmm import AttackPhaseHMM


class TestStateSignature:
    """Test StateSignature dataclass."""

    def test_create_signature(self):
        """Should create signature with all fields."""
        sig = StateSignature(
            state_id=0,
            avg_in_bytes=1000.0,
            avg_out_bytes=500.0,
            bytes_ratio=2.0,
            avg_duration_ms=5000.0,
            avg_pkts_per_sec=10.0,
            protocol_dist={'tcp': 0.8, 'udp': 0.2, 'icmp': 0.0},
            port_category_dist={0: 0.5, 1: 0.3, 2: 0.2},
            flow_count=100,
        )
        assert sig.state_id == 0
        assert sig.bytes_ratio == 2.0


class TestStateAnalyzer:
    """Test StateAnalyzer."""

    @pytest.fixture
    def sample_flows_with_states(self):
        """Create sample flows with HMM state predictions."""
        np.random.seed(42)
        n = 100
        return pd.DataFrame({
            'IN_BYTES': np.random.randint(100, 10000, n),
            'OUT_BYTES': np.random.randint(100, 10000, n),
            'IN_PKTS': np.random.randint(1, 100, n),
            'OUT_PKTS': np.random.randint(1, 100, n),
            'FLOW_DURATION_MILLISECONDS': np.random.randint(100, 10000, n),
            'PROTOCOL': np.random.choice([6, 17, 1], n),  # TCP, UDP, ICMP
            'L4_DST_PORT': np.random.randint(0, 65535, n),
            'HMM_STATE': np.random.randint(0, 5, n),  # 5 states
        })

    @pytest.fixture
    def analyzer(self):
        return StateAnalyzer()

    def test_analyze_returns_signatures(self, analyzer, sample_flows_with_states):
        """analyze should return list of StateSignatures."""
        signatures = analyzer.analyze(sample_flows_with_states)
        assert isinstance(signatures, list)
        assert all(isinstance(s, StateSignature) for s in signatures)

    def test_signature_per_state(self, analyzer, sample_flows_with_states):
        """Should return one signature per unique state."""
        signatures = analyzer.analyze(sample_flows_with_states)
        unique_states = sample_flows_with_states['HMM_STATE'].nunique()
        assert len(signatures) == unique_states

    def test_signature_state_ids_unique(self, analyzer, sample_flows_with_states):
        """Each signature should have a unique state_id."""
        signatures = analyzer.analyze(sample_flows_with_states)
        state_ids = [s.state_id for s in signatures]
        assert len(state_ids) == len(set(state_ids))

    def test_signature_flow_count_correct(self, analyzer, sample_flows_with_states):
        """flow_count should match actual flows in that state."""
        signatures = analyzer.analyze(sample_flows_with_states)
        for sig in signatures:
            expected = (sample_flows_with_states['HMM_STATE'] == sig.state_id).sum()
            assert sig.flow_count == expected

    def test_bytes_ratio_calculation(self, analyzer):
        """bytes_ratio should be avg(IN_BYTES) / (avg(OUT_BYTES) + 1)."""
        flows = pd.DataFrame({
            'IN_BYTES': [1000, 2000],
            'OUT_BYTES': [500, 500],
            'IN_PKTS': [10, 20],
            'OUT_PKTS': [5, 10],
            'FLOW_DURATION_MILLISECONDS': [1000, 1000],
            'PROTOCOL': [6, 6],
            'L4_DST_PORT': [80, 80],
            'HMM_STATE': [0, 0],
        })
        signatures = analyzer.analyze(flows)
        # avg_in = 1500, avg_out = 500
        expected_ratio = 1500 / (500 + 1)
        assert abs(signatures[0].bytes_ratio - expected_ratio) < 0.01

    def test_protocol_distribution(self, analyzer):
        """protocol_dist should sum to 1."""
        flows = pd.DataFrame({
            'IN_BYTES': [100] * 10,
            'OUT_BYTES': [100] * 10,
            'IN_PKTS': [10] * 10,
            'OUT_PKTS': [10] * 10,
            'FLOW_DURATION_MILLISECONDS': [1000] * 10,
            'PROTOCOL': [6, 6, 6, 6, 17, 17, 17, 1, 1, 1],  # 4 TCP, 3 UDP, 3 ICMP
            'L4_DST_PORT': [80] * 10,
            'HMM_STATE': [0] * 10,
        })
        signatures = analyzer.analyze(flows)
        dist = signatures[0].protocol_dist
        assert abs(sum(dist.values()) - 1.0) < 0.01
        assert abs(dist['tcp'] - 0.4) < 0.01
        assert abs(dist['udp'] - 0.3) < 0.01
        assert abs(dist['icmp'] - 0.3) < 0.01


class TestMitreMapper:
    """Test MitreMapper."""

    @pytest.fixture
    def mapper(self):
        return MitreMapper()

    @pytest.fixture
    def reconnaissance_signature(self):
        """Signature resembling reconnaissance activity."""
        return StateSignature(
            state_id=0,
            avg_in_bytes=50.0,      # Low bytes
            avg_out_bytes=100.0,
            bytes_ratio=0.5,
            avg_duration_ms=100.0,   # Short duration
            avg_pkts_per_sec=20.0,   # High packet rate
            protocol_dist={'tcp': 0.9, 'udp': 0.1, 'icmp': 0.0},
            port_category_dist={0: 0.8, 1: 0.1, 2: 0.1},  # Many well-known ports
            flow_count=1000,
        )

    @pytest.fixture
    def exfiltration_signature(self):
        """Signature resembling exfiltration activity."""
        return StateSignature(
            state_id=1,
            avg_in_bytes=100.0,
            avg_out_bytes=100000.0,   # Very high outbound
            bytes_ratio=0.001,        # Low ratio (out >> in)
            avg_duration_ms=30000.0,  # Long duration
            avg_pkts_per_sec=5.0,
            protocol_dist={'tcp': 0.95, 'udp': 0.05, 'icmp': 0.0},
            port_category_dist={2: 0.7, 1: 0.2, 0: 0.1},  # Ephemeral ports
            flow_count=50,
        )

    def test_map_returns_mapping(self, mapper, reconnaissance_signature):
        """map should return tactic name and confidence."""
        tactic, confidence = mapper.map(reconnaissance_signature)
        assert isinstance(tactic, str)
        assert 0.0 <= confidence <= 1.0

    def test_map_all_returns_dict(self, mapper, reconnaissance_signature, exfiltration_signature):
        """map_all should return mapping for all signatures."""
        signatures = [reconnaissance_signature, exfiltration_signature]
        mappings = mapper.map_all(signatures)
        assert isinstance(mappings, dict)
        assert len(mappings) == 2
        assert 0 in mappings and 1 in mappings

    def test_reconnaissance_mapped_correctly(self, mapper, reconnaissance_signature):
        """Reconnaissance signature should map to Reconnaissance or Discovery."""
        tactic, confidence = mapper.map(reconnaissance_signature)
        assert tactic in ['Reconnaissance', 'Discovery'], f"Got {tactic}"
        assert confidence > 0.3

    def test_exfiltration_mapped_correctly(self, mapper, exfiltration_signature):
        """Exfiltration signature should map to Exfiltration."""
        tactic, confidence = mapper.map(exfiltration_signature)
        assert tactic == 'Exfiltration', f"Got {tactic}"
        assert confidence > 0.3

    def test_benign_signature(self, mapper):
        """Normal traffic should map to Benign with high confidence."""
        benign_sig = StateSignature(
            state_id=2,
            avg_in_bytes=5000.0,
            avg_out_bytes=5000.0,
            bytes_ratio=1.0,          # Balanced traffic
            avg_duration_ms=2000.0,   # Moderate duration
            avg_pkts_per_sec=10.0,
            protocol_dist={'tcp': 0.6, 'udp': 0.3, 'icmp': 0.1},
            port_category_dist={0: 0.4, 1: 0.4, 2: 0.2},  # Mixed ports
            flow_count=10000,         # High volume
        )
        tactic, confidence = mapper.map(benign_sig)
        assert tactic == 'Benign', f"Got {tactic}"

    def test_c2_signature(self, mapper):
        """C2 signature should map to Command and Control."""
        c2_sig = StateSignature(
            state_id=3,
            avg_in_bytes=500.0,
            avg_out_bytes=500.0,
            bytes_ratio=1.0,
            avg_duration_ms=60000.0,  # Long duration (persistent connection)
            avg_pkts_per_sec=0.5,      # Low packet rate (heartbeat)
            protocol_dist={'tcp': 1.0, 'udp': 0.0, 'icmp': 0.0},
            port_category_dist={2: 0.9, 1: 0.1, 0: 0.0},  # High port
            flow_count=200,
        )
        tactic, confidence = mapper.map(c2_sig)
        assert tactic == 'Command and Control', f"Got {tactic}"


class TestMitreMapperProfiles:
    """Test tactic profile definitions."""

    @pytest.fixture
    def mapper(self):
        return MitreMapper()

    def test_profiles_exist(self, mapper):
        """Should have profiles for key tactics."""
        profile_tactics = [p.tactic for p in mapper.profiles]
        expected = ['Reconnaissance', 'Exfiltration', 'Command and Control', 'Benign']
        for tactic in expected:
            assert tactic in profile_tactics, f"Missing profile for {tactic}"

    def test_profile_scores_bounded(self, mapper):
        """Profile score function should return 0-1."""
        dummy_sig = StateSignature(
            state_id=0,
            avg_in_bytes=1000.0,
            avg_out_bytes=1000.0,
            bytes_ratio=1.0,
            avg_duration_ms=1000.0,
            avg_pkts_per_sec=10.0,
            protocol_dist={'tcp': 0.5, 'udp': 0.3, 'icmp': 0.2},
            port_category_dist={0: 0.33, 1: 0.33, 2: 0.34},
            flow_count=100,
        )
        for profile in mapper.profiles:
            score = profile.score_fn(dummy_sig)
            assert 0.0 <= score <= 1.0, f"{profile.tactic} score {score} out of bounds"
