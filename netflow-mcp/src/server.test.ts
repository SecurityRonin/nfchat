import { describe, it, expect } from 'vitest'
import { createServer, getTools, SERVER_NAME, SERVER_VERSION } from './server.js'

describe('NetFlow MCP Server', () => {
  it('creates a server with correct name and version', () => {
    const server = createServer()
    expect(server).toBeDefined()
    expect(SERVER_NAME).toBe('netflow-mcp')
    expect(SERVER_VERSION).toBe('0.1.0')
  })

  it('registers netflow tools', () => {
    const tools = getTools()
    expect(tools.length).toBeGreaterThan(0)
  })

  it('has query_flows tool', () => {
    const tools = getTools()
    const queryFlows = tools.find((t) => t.name === 'query_flows')
    expect(queryFlows).toBeDefined()
    expect(queryFlows?.description).toContain('NetFlow')
  })
})
