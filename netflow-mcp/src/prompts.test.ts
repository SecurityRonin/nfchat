import { describe, it, expect } from 'vitest'
import { getPrompts, getPromptByName } from './prompts.js'

describe('IR Investigation Prompts', () => {
  it('returns a list of available prompts', () => {
    const prompts = getPrompts()
    expect(prompts.length).toBeGreaterThan(0)
    expect(prompts[0]).toHaveProperty('name')
    expect(prompts[0]).toHaveProperty('description')
  })

  it('has investigation workflow prompt', () => {
    const prompts = getPrompts()
    const workflow = prompts.find((p) => p.name === 'investigate_incident')
    expect(workflow).toBeDefined()
    expect(workflow?.description).toContain('incident')
  })

  it('has threat hunting prompt', () => {
    const prompts = getPrompts()
    const hunting = prompts.find((p) => p.name === 'threat_hunt')
    expect(hunting).toBeDefined()
  })

  it('has lateral movement detection prompt', () => {
    const prompts = getPrompts()
    const lateral = prompts.find((p) => p.name === 'detect_lateral_movement')
    expect(lateral).toBeDefined()
  })

  it('retrieves prompt by name with arguments', () => {
    const prompt = getPromptByName('investigate_ip', { ip: '192.168.1.1' })
    expect(prompt).toBeDefined()
    expect(prompt?.messages[0].content.text).toContain('192.168.1.1')
  })

  it('returns undefined for unknown prompt', () => {
    const prompt = getPromptByName('nonexistent')
    expect(prompt).toBeUndefined()
  })
})
