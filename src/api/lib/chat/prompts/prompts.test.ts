/**
 * Prompts Module Tests
 */

import { describe, it, expect } from 'vitest';
import { buildQuerySystemPrompt, buildAnalysisSystemPrompt } from './index';

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
