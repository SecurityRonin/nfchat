/**
 * Prompts Module Tests
 */

import { describe, it, expect } from 'vitest';
import { buildQuerySystemPrompt, buildAnalysisSystemPrompt } from './index';
import {
  NETFLOW_SCHEMA,
  NUMERIC_COLUMNS,
  FILTER_LABEL_TO_COLUMN,
} from '../constants';

describe('buildQuerySystemPrompt', () => {
  it('includes netflow schema', () => {
    const prompt = buildQuerySystemPrompt();
    expect(prompt).toContain('IPV4_SRC_ADDR');
    expect(prompt).toContain('PROTOCOL');
    expect(prompt).toContain('Attack');
  });

  it('includes SQL rules', () => {
    const prompt = buildQuerySystemPrompt();
    expect(prompt).toContain('SELECT');
    expect(prompt).toContain('LIMIT');
  });

  it('specifies JSON response format', () => {
    const prompt = buildQuerySystemPrompt();
    expect(prompt).toContain('queries');
    expect(prompt).toContain('reasoning');
    expect(prompt).toContain('JSON');
  });

  it('includes max limit value', () => {
    const prompt = buildQuerySystemPrompt();
    expect(prompt).toContain('10000');
  });

  it('includes HMM_STATE column in schema', () => {
    const prompt = buildQuerySystemPrompt();
    expect(prompt).toContain('HMM_STATE');
    expect(prompt).toContain('behavioral cluster');
  });

  it('includes CONN_STATE column in schema', () => {
    const prompt = buildQuerySystemPrompt();
    expect(prompt).toContain('CONN_STATE');
    expect(prompt).toContain('Zeek connection state');
  });
});

describe('NUMERIC_COLUMNS', () => {
  it('includes HMM_STATE as numeric', () => {
    expect(NUMERIC_COLUMNS.has('HMM_STATE')).toBe(true);
  });
});

describe('FILTER_LABEL_TO_COLUMN', () => {
  it('maps hmm state to HMM_STATE', () => {
    expect(FILTER_LABEL_TO_COLUMN['hmm state']).toBe('HMM_STATE');
  });

  it('maps cluster to HMM_STATE', () => {
    expect(FILTER_LABEL_TO_COLUMN['cluster']).toBe('HMM_STATE');
  });

  it('maps connection state to CONN_STATE', () => {
    expect(FILTER_LABEL_TO_COLUMN['connection state']).toBe('CONN_STATE');
  });

  it('maps conn state to CONN_STATE', () => {
    expect(FILTER_LABEL_TO_COLUMN['conn state']).toBe('CONN_STATE');
  });
});

describe('buildAnalysisSystemPrompt', () => {
  it('includes netflow schema', () => {
    const prompt = buildAnalysisSystemPrompt();
    expect(prompt).toContain('IPV4_SRC_ADDR');
    expect(prompt).toContain('Attack');
  });

  it('focuses on security analysis', () => {
    const prompt = buildAnalysisSystemPrompt();
    expect(prompt).toContain('security');
    expect(prompt).toContain('threats');
    expect(prompt).toContain('anomalies');
  });

  it('requests actionable recommendations', () => {
    const prompt = buildAnalysisSystemPrompt();
    expect(prompt).toContain('recommendations');
  });
});
