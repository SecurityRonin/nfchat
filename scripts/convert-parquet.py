#!/usr/bin/env python3
"""Convert CSV netflow data to Parquet format for faster loading in browser."""

import sys
from pathlib import Path

def convert_with_duckdb():
    """Convert using DuckDB (preferred - fastest)."""
    import duckdb

    input_path = Path(__file__).parent.parent / "datasets" / "NF-UNSW-NB15-v3" / "data" / "NF-UNSW-NB15-v3.csv"
    output_path = Path(__file__).parent.parent / "public" / "data" / "NF-UNSW-NB15-v3.parquet"

    # Create output directory if needed
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Converting {input_path}")
    print(f"Output: {output_path}")

    # Use DuckDB for fast conversion with ZSTD compression
    duckdb.execute(f"""
        COPY (SELECT * FROM read_csv('{input_path}'))
        TO '{output_path}' (FORMAT PARQUET, COMPRESSION ZSTD)
    """)

    # Get file sizes
    input_size = input_path.stat().st_size / (1024 * 1024)
    output_size = output_path.stat().st_size / (1024 * 1024)

    print(f"Done! CSV: {input_size:.1f} MB -> Parquet: {output_size:.1f} MB ({output_size/input_size*100:.1f}%)")

def convert_with_pandas():
    """Fallback conversion using pandas/pyarrow."""
    import pandas as pd

    input_path = Path(__file__).parent.parent / "datasets" / "NF-UNSW-NB15-v3" / "data" / "NF-UNSW-NB15-v3.csv"
    output_path = Path(__file__).parent.parent / "public" / "data" / "NF-UNSW-NB15-v3.parquet"

    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Converting {input_path} (using pandas - this may take a while)")
    print(f"Output: {output_path}")

    # Read CSV in chunks to handle large file
    df = pd.read_csv(input_path)
    df.to_parquet(output_path, compression='zstd')

    input_size = input_path.stat().st_size / (1024 * 1024)
    output_size = output_path.stat().st_size / (1024 * 1024)

    print(f"Done! CSV: {input_size:.1f} MB -> Parquet: {output_size:.1f} MB ({output_size/input_size*100:.1f}%)")

if __name__ == "__main__":
    try:
        convert_with_duckdb()
    except ImportError:
        print("DuckDB not found, trying pandas...")
        try:
            convert_with_pandas()
        except ImportError:
            print("Error: Neither duckdb nor pandas/pyarrow installed.")
            print("Install with: pip install duckdb")
            print("Or: pip install pandas pyarrow")
            sys.exit(1)
