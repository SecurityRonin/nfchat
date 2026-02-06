"""Tests for SessionBuilder - flow sequence segmentation."""

import pytest
import pandas as pd
import numpy as np

from hmm.data.session_builder import SessionBuilder
from hmm.config import SESSION_GAP_MS, MIN_SESSION_LENGTH


class TestSessionBuilder:
    """Test suite for SessionBuilder."""

    @pytest.fixture
    def builder(self):
        """Create a default SessionBuilder."""
        return SessionBuilder()

    @pytest.fixture
    def sample_flows(self):
        """Create sample flow data for testing."""
        # Flows from two source IPs with gaps
        # Session 2 needs >= MIN_SESSION_LENGTH (3) flows
        return pd.DataFrame({
            'IPV4_SRC_ADDR': [
                '192.168.1.1', '192.168.1.1', '192.168.1.1',  # Session 1 (3 flows)
                '192.168.1.1', '192.168.1.1', '192.168.1.1',  # Session 2 after gap (3 flows)
                '10.0.0.1', '10.0.0.1', '10.0.0.1', '10.0.0.1',  # Session 3 (4 flows)
            ],
            'FLOW_START_MILLISECONDS': [
                1000, 2000, 3000,           # Session 1: 1s apart
                3000 + SESSION_GAP_MS + 1000, 3000 + SESSION_GAP_MS + 2000, 3000 + SESSION_GAP_MS + 3000,  # Session 2
                5000, 6000, 7000, 8000,     # Session 3: 1s apart
            ],
            'IPV4_DST_ADDR': ['10.0.0.1'] * 10,
            'L4_DST_PORT': [80] * 10,
            'IN_BYTES': [100] * 10,
            'OUT_BYTES': [200] * 10,
        })

    def test_build_sessions_returns_list(self, builder, sample_flows):
        """build_sessions should return a list of DataFrames."""
        sessions = builder.build_sessions(sample_flows)
        assert isinstance(sessions, list)
        assert all(isinstance(s, pd.DataFrame) for s in sessions)

    def test_sessions_grouped_by_src_ip(self, builder, sample_flows):
        """Each session should contain flows from a single source IP."""
        sessions = builder.build_sessions(sample_flows)
        for session in sessions:
            unique_ips = session['IPV4_SRC_ADDR'].unique()
            assert len(unique_ips) == 1

    def test_gap_detection_splits_sessions(self, builder, sample_flows):
        """Flows separated by > SESSION_GAP_MS should be in different sessions."""
        sessions = builder.build_sessions(sample_flows)

        # 192.168.1.1 should have 2 sessions (gap in middle)
        ip1_sessions = [s for s in sessions if s['IPV4_SRC_ADDR'].iloc[0] == '192.168.1.1']
        assert len(ip1_sessions) == 2

        # 10.0.0.1 should have 1 session (no gaps)
        ip2_sessions = [s for s in sessions if s['IPV4_SRC_ADDR'].iloc[0] == '10.0.0.1']
        assert len(ip2_sessions) == 1

    def test_sessions_sorted_by_time(self, builder, sample_flows):
        """Flows within each session should be sorted by start time."""
        sessions = builder.build_sessions(sample_flows)
        for session in sessions:
            times = session['FLOW_START_MILLISECONDS'].values
            assert np.all(times[:-1] <= times[1:]), "Flows should be time-ordered"

    def test_min_session_length_filter(self, builder):
        """Sessions with fewer than MIN_SESSION_LENGTH flows should be filtered."""
        # Create flows where one IP has only 2 flows (below threshold)
        flows = pd.DataFrame({
            'IPV4_SRC_ADDR': ['192.168.1.1', '192.168.1.1', '10.0.0.1', '10.0.0.1', '10.0.0.1'],
            'FLOW_START_MILLISECONDS': [1000, 2000, 3000, 4000, 5000],
            'IPV4_DST_ADDR': ['10.0.0.1'] * 5,
            'L4_DST_PORT': [80] * 5,
            'IN_BYTES': [100] * 5,
            'OUT_BYTES': [200] * 5,
        })

        sessions = builder.build_sessions(flows)

        # Only 10.0.0.1 session should remain (3 flows >= MIN_SESSION_LENGTH)
        assert len(sessions) == 1
        assert sessions[0]['IPV4_SRC_ADDR'].iloc[0] == '10.0.0.1'

    def test_custom_gap_threshold(self):
        """SessionBuilder should accept custom gap threshold."""
        custom_gap = 60_000  # 1 minute
        builder = SessionBuilder(gap_ms=custom_gap)

        flows = pd.DataFrame({
            'IPV4_SRC_ADDR': ['192.168.1.1'] * 6,
            'FLOW_START_MILLISECONDS': [
                1000, 2000, 3000,  # Session 1
                3000 + custom_gap + 1000, 3000 + custom_gap + 2000, 3000 + custom_gap + 3000,  # Session 2
            ],
            'IPV4_DST_ADDR': ['10.0.0.1'] * 6,
            'L4_DST_PORT': [80] * 6,
            'IN_BYTES': [100] * 6,
            'OUT_BYTES': [200] * 6,
        })

        sessions = builder.build_sessions(flows)
        assert len(sessions) == 2

    def test_custom_min_length(self):
        """SessionBuilder should accept custom minimum session length."""
        builder = SessionBuilder(min_length=5)

        flows = pd.DataFrame({
            'IPV4_SRC_ADDR': ['192.168.1.1'] * 4 + ['10.0.0.1'] * 6,
            'FLOW_START_MILLISECONDS': list(range(1000, 5000, 1000)) + list(range(10000, 16000, 1000)),
            'IPV4_DST_ADDR': ['10.0.0.1'] * 10,
            'L4_DST_PORT': [80] * 10,
            'IN_BYTES': [100] * 10,
            'OUT_BYTES': [200] * 10,
        })

        sessions = builder.build_sessions(flows)
        # Only 10.0.0.1 session should remain (6 flows >= 5)
        assert len(sessions) == 1
        assert len(sessions[0]) == 6

    def test_empty_dataframe_returns_empty_list(self, builder):
        """Empty input should return empty list."""
        empty_df = pd.DataFrame(columns=['IPV4_SRC_ADDR', 'FLOW_START_MILLISECONDS'])
        sessions = builder.build_sessions(empty_df)
        assert sessions == []

    def test_session_ids_are_unique(self, builder, sample_flows):
        """Each session should have a unique session_id."""
        sessions = builder.build_sessions(sample_flows)
        session_ids = [s['session_id'].iloc[0] for s in sessions]
        assert len(session_ids) == len(set(session_ids))

    def test_session_id_format(self, builder, sample_flows):
        """Session IDs should follow expected format: src_ip_starttime."""
        sessions = builder.build_sessions(sample_flows)
        for session in sessions:
            session_id = session['session_id'].iloc[0]
            src_ip = session['IPV4_SRC_ADDR'].iloc[0]
            start_time = session['FLOW_START_MILLISECONDS'].min()
            expected_id = f"{src_ip}_{start_time}"
            assert session_id == expected_id


class TestSessionBuilderEdgeCases:
    """Edge case tests for SessionBuilder."""

    @pytest.fixture
    def builder(self):
        return SessionBuilder()

    def test_single_flow_filtered_out(self, builder):
        """Single flow should be filtered (below MIN_SESSION_LENGTH)."""
        flows = pd.DataFrame({
            'IPV4_SRC_ADDR': ['192.168.1.1'],
            'FLOW_START_MILLISECONDS': [1000],
            'IPV4_DST_ADDR': ['10.0.0.1'],
            'L4_DST_PORT': [80],
            'IN_BYTES': [100],
            'OUT_BYTES': [200],
        })
        sessions = builder.build_sessions(flows)
        assert len(sessions) == 0

    def test_exact_gap_threshold_not_split(self, builder):
        """Flows exactly at gap threshold should NOT be split."""
        flows = pd.DataFrame({
            'IPV4_SRC_ADDR': ['192.168.1.1'] * 4,
            'FLOW_START_MILLISECONDS': [
                1000, 2000,
                2000 + SESSION_GAP_MS,  # Exactly at threshold
                2000 + SESSION_GAP_MS + 1000,
            ],
            'IPV4_DST_ADDR': ['10.0.0.1'] * 4,
            'L4_DST_PORT': [80] * 4,
            'IN_BYTES': [100] * 4,
            'OUT_BYTES': [200] * 4,
        })
        sessions = builder.build_sessions(flows)
        # Should be single session (gap == threshold, not >)
        assert len(sessions) == 1

    def test_preserves_all_columns(self, builder):
        """All original columns should be preserved in sessions."""
        flows = pd.DataFrame({
            'IPV4_SRC_ADDR': ['192.168.1.1'] * 3,
            'FLOW_START_MILLISECONDS': [1000, 2000, 3000],
            'IPV4_DST_ADDR': ['10.0.0.1'] * 3,
            'L4_DST_PORT': [80, 443, 22],
            'IN_BYTES': [100, 200, 300],
            'OUT_BYTES': [200, 400, 600],
            'PROTOCOL': [6, 6, 6],
            'CUSTOM_FIELD': ['a', 'b', 'c'],
        })
        sessions = builder.build_sessions(flows)
        assert len(sessions) == 1
        # Check all original columns preserved plus session_id
        expected_cols = set(flows.columns) | {'session_id'}
        assert set(sessions[0].columns) == expected_cols

    def test_handles_unsorted_input(self, builder):
        """Should handle input that isn't sorted by time."""
        flows = pd.DataFrame({
            'IPV4_SRC_ADDR': ['192.168.1.1'] * 4,
            'FLOW_START_MILLISECONDS': [3000, 1000, 4000, 2000],  # Unsorted
            'IPV4_DST_ADDR': ['10.0.0.1'] * 4,
            'L4_DST_PORT': [80] * 4,
            'IN_BYTES': [100] * 4,
            'OUT_BYTES': [200] * 4,
        })
        sessions = builder.build_sessions(flows)
        assert len(sessions) == 1
        # Result should be sorted
        times = sessions[0]['FLOW_START_MILLISECONDS'].values
        assert list(times) == [1000, 2000, 3000, 4000]
