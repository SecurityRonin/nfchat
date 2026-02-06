"""Configuration constants for HMM Attack Phase Labeler."""

# Session building
SESSION_GAP_MS = 30 * 60 * 1000  # 30 minutes in milliseconds
MIN_SESSION_LENGTH = 3  # Minimum flows per session

# Feature extraction
FEATURE_NAMES = [
    'log1p_in_bytes',
    'log1p_out_bytes',
    'log1p_in_pkts',
    'log1p_out_pkts',
    'log1p_duration_ms',
    'log1p_iat_avg',
    'bytes_ratio',
    'pkts_per_second',
    'is_tcp',
    'is_udp',
    'is_icmp',
    'port_category',
]

# Protocol numbers
PROTO_TCP = 6
PROTO_UDP = 17
PROTO_ICMP = 1

# Port categories
PORT_WELL_KNOWN = 0    # 0-1023
PORT_REGISTERED = 1    # 1024-49151
PORT_EPHEMERAL = 2     # 49152-65535

# HMM parameters
DEFAULT_N_STATES = 10
N_ITER = 100
RANDOM_STATE = 42

# BIC model selection
MIN_STATES = 4
MAX_STATES = 15

# MITRE ATT&CK tactics (ordered by typical kill chain)
MITRE_TACTICS = [
    'Reconnaissance',
    'Resource Development',
    'Initial Access',
    'Execution',
    'Persistence',
    'Privilege Escalation',
    'Defense Evasion',
    'Credential Access',
    'Discovery',
    'Lateral Movement',
    'Collection',
    'Command and Control',
    'Exfiltration',
    'Impact',
]
