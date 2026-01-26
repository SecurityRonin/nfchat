#!/usr/bin/env python3
"""
Convert UWF-ZeekData24 Parquet files to nfchat format with MITRE ATT&CK labels.

Usage:
    python3 scripts/convert-zeekdata24.py [--demo-only]

Options:
    --demo-only    Only create the 200K row demo subset (faster)
"""
import sys
import os
import subprocess

# Check for required packages
try:
    import pyarrow.parquet as pq
    import pandas as pd
except ImportError:
    print("Installing required packages...")
    subprocess.run([sys.executable, "-m", "pip", "install", "pyarrow", "pandas", "--quiet"], check=True)
    import pyarrow.parquet as pq
    import pandas as pd

import pyarrow as pa

DATA_DIR = 'data/uwf-zeekdata24'
PROTO_MAP = {'tcp': 6, 'udp': 17, 'icmp': 1}


def load_weeks():
    """Load all week parquet files."""
    tables = []
    for i in range(1, 8):
        path = f'{DATA_DIR}/week{i}.parquet'
        if os.path.exists(path):
            t = pq.read_table(path)
            print(f"  Week {i}: {t.num_rows:,} rows")
            tables.append(t)
        else:
            print(f"  Week {i}: NOT FOUND - run download-demo-data.sh first")
    return tables


def transform(df):
    """Transform Zeek data to nfchat schema."""
    return pd.DataFrame({
        # Core network fields
        'IPV4_SRC_ADDR': df['src_ip_zeek'],
        'IPV4_DST_ADDR': df['dest_ip_zeek'],
        'L4_SRC_PORT': df['src_port_zeek'].fillna(0).astype(int),
        'L4_DST_PORT': df['dest_port_zeek'].fillna(0).astype(int),
        'PROTOCOL': df['proto'].map(PROTO_MAP).fillna(0).astype(int),

        # Bytes/packets
        'IN_BYTES': df['orig_bytes'].fillna(0).astype(int),
        'OUT_BYTES': df['resp_bytes'].fillna(0).astype(int),
        'IN_PKTS': df['orig_pkts'].fillna(0).astype(int),
        'OUT_PKTS': df['resp_pkts'].fillna(0).astype(int),

        # Timing
        'FLOW_START_MILLISECONDS': (df['ts'] * 1000).astype(int),
        'FLOW_END_MILLISECONDS': ((df['ts'] + df['duration'].fillna(0)) * 1000).astype(int),
        'FLOW_DURATION_MILLISECONDS': (df['duration'].fillna(0) * 1000).astype(int),

        # Labels
        'Label': df['label_binary'].map({
            True: 'Attack', False: 'Benign',
            'True': 'Attack', 'False': 'Benign',
            'Duplicate': 'Attack'
        }).fillna('Benign'),
        'Attack': df['label_tactic'].replace('none', 'Benign').replace('Duplicate', 'Unknown'),

        # MITRE ATT&CK fields
        'MITRE_TACTIC': df['label_tactic'].replace('none', '').replace('Duplicate', ''),
        'MITRE_TECHNIQUE': df['label_technique'].replace('none', '').replace('Duplicate', ''),

        # Zeek fields
        'CONN_STATE': df['conn_state'],
        'SERVICE': df['service'].fillna(''),
        'HISTORY': df['history'].fillna(''),
        'COMMUNITY_ID': df['community_id'],

        # Default values for missing fields
        'L7_PROTO': 0,
        'TCP_FLAGS': 0,
        'CLIENT_TCP_FLAGS': 0,
        'SERVER_TCP_FLAGS': 0,
        'DURATION_IN': 0,
        'DURATION_OUT': 0,
        'MIN_TTL': 0,
        'MAX_TTL': 64,
        'LONGEST_FLOW_PKT': 0,
        'SHORTEST_FLOW_PKT': 0,
        'MIN_IP_PKT_LEN': 0,
        'MAX_IP_PKT_LEN': 1500,
        'SRC_TO_DST_SECOND_BYTES': 0,
        'DST_TO_SRC_SECOND_BYTES': 0,
        'RETRANSMITTED_IN_BYTES': 0,
        'RETRANSMITTED_IN_PKTS': 0,
        'RETRANSMITTED_OUT_BYTES': 0,
        'RETRANSMITTED_OUT_PKTS': 0,
        'SRC_TO_DST_AVG_THROUGHPUT': 0.0,
        'DST_TO_SRC_AVG_THROUGHPUT': 0.0,
        'NUM_PKTS_UP_TO_128_BYTES': 0,
        'NUM_PKTS_128_TO_256_BYTES': 0,
        'NUM_PKTS_256_TO_512_BYTES': 0,
        'NUM_PKTS_512_TO_1024_BYTES': 0,
        'NUM_PKTS_1024_TO_1514_BYTES': 0,
        'TCP_WIN_MAX_IN': 0,
        'TCP_WIN_MAX_OUT': 0,
        'ICMP_TYPE': 0,
        'ICMP_IPV4_TYPE': 0,
        'DNS_QUERY_ID': 0,
        'DNS_QUERY_TYPE': 0,
        'DNS_TTL_ANSWER': 0,
        'FTP_COMMAND_RET_CODE': 0,
        'SRC_TO_DST_IAT_MIN': 0.0,
        'SRC_TO_DST_IAT_MAX': 0.0,
        'SRC_TO_DST_IAT_AVG': 0.0,
        'SRC_TO_DST_IAT_STDDEV': 0.0,
        'DST_TO_SRC_IAT_MIN': 0.0,
        'DST_TO_SRC_IAT_MAX': 0.0,
        'DST_TO_SRC_IAT_AVG': 0.0,
        'DST_TO_SRC_IAT_STDDEV': 0.0,
    })


def main():
    demo_only = '--demo-only' in sys.argv

    print("Loading UWF-ZeekData24 parquet files...")
    tables = load_weeks()

    if not tables:
        print("\nNo data files found. Run ./scripts/download-demo-data.sh first.")
        sys.exit(1)

    # Combine
    combined = pa.concat_tables(tables)
    print(f"\nCombined: {combined.num_rows:,} rows")

    # Transform
    print("\nTransforming to nfchat schema...")
    df = combined.to_pandas()
    transformed = transform(df)

    print(f"\nATT&CK Tactic Distribution:")
    print(transformed['Attack'].value_counts().to_string())

    if not demo_only:
        # Write full dataset
        output_full = f'{DATA_DIR}/nfchat-demo-full.parquet'
        transformed.to_parquet(output_full, compression='snappy', index=False)
        print(f"\n✓ Full dataset: {output_full} ({os.path.getsize(output_full)/1024/1024:.1f} MB)")

    # Create demo subset (200K rows, stratified)
    demo_size = 200000
    sample = transformed.groupby('Attack', group_keys=False).apply(
        lambda x: x.sample(min(len(x), int(demo_size * len(x) / len(transformed))), random_state=42),
        include_groups=False
    )
    output_demo = f'{DATA_DIR}/nfchat-demo.parquet'
    sample.to_parquet(output_demo, compression='snappy', index=False)
    print(f"✓ Demo subset: {output_demo} ({os.path.getsize(output_demo)/1024/1024:.1f} MB, {len(sample):,} rows)")

    print("\nDone! Upload nfchat-demo.parquet to nfchat to explore MITRE ATT&CK labeled data.")


if __name__ == '__main__':
    main()
