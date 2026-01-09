#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createServer } from './server.js'
import { Database } from './database.js'

async function main() {
  const parquetPath = process.argv[2]

  if (!parquetPath) {
    console.error('Usage: netflow-mcp <path-to-parquet-file>')
    console.error('')
    console.error('Example:')
    console.error('  netflow-mcp /path/to/netflows.parquet')
    process.exit(1)
  }

  // Initialize database and load parquet file
  const db = new Database()

  try {
    console.error(`Loading parquet file: ${parquetPath}`)
    await db.loadParquet(parquetPath, 'flows')
    console.error('Parquet file loaded successfully')
  } catch (error) {
    console.error(`Failed to load parquet file: ${error}`)
    process.exit(1)
  }

  // Create and start MCP server
  const server = createServer(db)
  const transport = new StdioServerTransport()

  console.error('Starting netflow-mcp server...')
  await server.connect(transport)
  console.error('Server connected via stdio')

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error('Shutting down...')
    await db.close()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.error('Shutting down...')
    await db.close()
    process.exit(0)
  })
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
