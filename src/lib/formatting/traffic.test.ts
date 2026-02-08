import { describe, it, expect } from 'vitest'
import { formatBytes, formatDuration, getTacticColor } from './traffic'

describe('formatBytes', () => {
  it('formats bytes under 1000', () => {
    expect(formatBytes(512)).toBe('512B')
  })
  it('formats zero bytes', () => {
    expect(formatBytes(0)).toBe('0B')
  })
  it('formats kilobytes', () => {
    expect(formatBytes(1500)).toBe('1.5KB')
  })
  it('formats megabytes', () => {
    expect(formatBytes(2_500_000)).toBe('2.5MB')
  })
  it('formats exact boundary at 1000', () => {
    expect(formatBytes(1000)).toBe('1.0KB')
  })
  it('formats exact boundary at 1000000', () => {
    expect(formatBytes(1_000_000)).toBe('1.0MB')
  })
})

describe('formatDuration', () => {
  it('formats milliseconds under 1000', () => {
    expect(formatDuration(500)).toBe('500ms')
  })
  it('formats zero', () => {
    expect(formatDuration(0)).toBe('0ms')
  })
  it('formats seconds', () => {
    expect(formatDuration(3500)).toBe('3.5s')
  })
  it('formats minutes', () => {
    expect(formatDuration(120_000)).toBe('2.0m')
  })
  it('formats exact boundary at 1000', () => {
    expect(formatDuration(1000)).toBe('1.0s')
  })
  it('formats exact boundary at 60000', () => {
    expect(formatDuration(60_000)).toBe('1.0m')
  })
})

describe('formatBytes (additional tests)', () => {
  it('formats very large bytes (1 billion)', () => {
    expect(formatBytes(1_000_000_000)).toBe('1000.0MB')
  })
})

describe('formatDuration (additional tests)', () => {
  it('formats fractional ms (0.5ms)', () => {
    // formatDuration uses Math.round for values < 1000ms
    expect(formatDuration(0.5)).toBe('1ms') // or '0ms' depending on rounding
  })
})

describe('getTacticColor', () => {
  it('returns color for known tactic', () => {
    expect(getTacticColor('Reconnaissance')).toBe('#3b82f6')
  })
  it('returns fallback for unknown tactic', () => {
    expect(getTacticColor('UnknownTactic')).toBe('#71717a')
  })
  it('returns color for Benign', () => {
    expect(getTacticColor('Benign')).toBe('#22c55e')
  })
  it('returns color for Exfiltration', () => {
    expect(getTacticColor('Exfiltration')).toBe('#7c3aed')
  })
  it('returns color for Lateral Movement', () => {
    expect(getTacticColor('Lateral Movement')).toBe('#db2777')
  })
  it('returns color for Command and Control', () => {
    expect(getTacticColor('Command and Control')).toBe('#9333ea')
  })
})
