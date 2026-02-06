"""Parquet data loading with DuckDB."""

import duckdb
import pandas as pd


def load_parquet(path: str, columns: list[str] | None = None) -> pd.DataFrame:
    """
    Load parquet file using DuckDB for efficient querying.

    Args:
        path: Path to parquet file
        columns: Optional list of columns to load (loads all if None)

    Returns:
        DataFrame with flow data
    """
    if columns:
        cols = ', '.join(columns)
        query = f"SELECT {cols} FROM read_parquet('{path}')"
    else:
        query = f"SELECT * FROM read_parquet('{path}')"

    return duckdb.query(query).to_df()
