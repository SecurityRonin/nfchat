"""Session builder - groups flows into sessions by source IP with gap detection."""

import pandas as pd

from hmm.config import SESSION_GAP_MS, MIN_SESSION_LENGTH


class SessionBuilder:
    """
    Groups flows into sessions by source IP with gap detection.

    A session is a sequence of flows from the same source IP where
    consecutive flows are within gap_ms of each other.
    """

    def __init__(self, gap_ms: int | None = None, min_length: int | None = None):
        """
        Initialize SessionBuilder.

        Args:
            gap_ms: Maximum gap between flows in a session (default: 30 minutes)
            min_length: Minimum flows per session (default: 3)
        """
        self.gap_ms = gap_ms if gap_ms is not None else SESSION_GAP_MS
        self.min_length = min_length if min_length is not None else MIN_SESSION_LENGTH

    def build_sessions(self, flows: pd.DataFrame) -> list[pd.DataFrame]:
        """
        Build sessions from flows.

        Args:
            flows: DataFrame with IPV4_SRC_ADDR and FLOW_START_MILLISECONDS columns

        Returns:
            List of DataFrames, each representing a session with added session_id column
        """
        if flows.empty:
            return []

        sessions = []

        # Group by source IP
        for src_ip, group in flows.groupby('IPV4_SRC_ADDR'):
            # Sort by time
            group = group.sort_values('FLOW_START_MILLISECONDS').reset_index(drop=True)

            # Find session boundaries using gap detection
            times = group['FLOW_START_MILLISECONDS'].values
            gaps = times[1:] - times[:-1]
            # Split where gap > threshold (not >=, so exact threshold stays together)
            split_indices = (gaps > self.gap_ms).nonzero()[0] + 1

            # Split into sessions
            start_idx = 0
            for split_idx in split_indices:
                session = self._create_session(group.iloc[start_idx:split_idx], src_ip)
                if session is not None:
                    sessions.append(session)
                start_idx = split_idx

            # Don't forget the last session
            session = self._create_session(group.iloc[start_idx:], src_ip)
            if session is not None:
                sessions.append(session)

        return sessions

    def _create_session(self, flows: pd.DataFrame, src_ip: str) -> pd.DataFrame | None:
        """
        Create a session DataFrame with session_id.

        Returns None if session is below minimum length.
        """
        if len(flows) < self.min_length:
            return None

        # Create session ID from source IP and start time
        start_time = flows['FLOW_START_MILLISECONDS'].min()
        session_id = f"{src_ip}_{start_time}"

        # Add session_id column
        session = flows.copy()
        session['session_id'] = session_id

        return session
