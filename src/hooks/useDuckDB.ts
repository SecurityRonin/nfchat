import { useCallback, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { loadCSVData, loadParquetData } from '@/lib/duckdb';

export function useDuckDB() {
  const {
    dataLoaded,
    dataLoading,
    dataError,
    totalRows,
    setDataLoaded,
    setDataLoading,
    setDataError,
    setTotalRows,
  } = useStore();

  const loadData = useCallback(async (url: string) => {
    setDataLoading(true);
    setDataError(null);

    try {
      let count: number;

      if (url.endsWith('.parquet')) {
        count = await loadParquetData(url);
      } else if (url.endsWith('.csv')) {
        count = await loadCSVData(url);
      } else {
        throw new Error('Unsupported file format. Use .parquet or .csv');
      }

      setTotalRows(count);
      setDataLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load data';
      setDataError(message);
      console.error('Failed to load data:', error);
    } finally {
      setDataLoading(false);
    }
  }, [setDataLoaded, setDataLoading, setDataError, setTotalRows]);

  return {
    dataLoaded,
    dataLoading,
    dataError,
    totalRows,
    loadData,
  };
}

export function useAutoLoadData(dataUrl: string | null) {
  const { loadData, dataLoaded, dataLoading } = useDuckDB();

  useEffect(() => {
    if (dataUrl && !dataLoaded && !dataLoading) {
      loadData(dataUrl);
    }
  }, [dataUrl, dataLoaded, dataLoading, loadData]);
}
