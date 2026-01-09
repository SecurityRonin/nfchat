import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { Database } from './database.js'
import {
  getTopTalkers,
  getAttackBreakdown,
  getProtocolDistribution,
  investigateIP,
  getTimeRange,
} from './tools.js'
import { getPrompts, getPromptByName } from './prompts.js'

export const SERVER_NAME = 'netflow-mcp'
export const SERVER_VERSION = '0.1.0'

// Argument schemas
const QueryFlowsArgsSchema = z.object({
  query: z.string().describe('SQL query to execute against the NetFlow data'),
})

const TopTalkersArgsSchema = z.object({
  limit: z.number().optional().describe('Number of results to return (default: 10)'),
  direction: z.enum(['src', 'dst']).describe('Whether to get source or destination IPs'),
})

const InvestigateIPArgsSchema = z.object({
  ip: z.string().describe('IP address to investigate'),
  limit: z.number().optional().describe('Max flows to return (default: 100)'),
})

interface ToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: string
    properties: Record<string, unknown>
    required: string[]
  }
}

const TOOLS: ToolDefinition[] = [
  {
    name: 'query_flows',
    description: 'Execute a SQL query against the NetFlow data. Table name is "flows".',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'SQL query to execute against the NetFlow data',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_top_talkers',
    description: 'Get the most active IP addresses by flow count',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of results to return (default: 10)',
        },
        direction: {
          type: 'string',
          enum: ['src', 'dst'],
          description: 'Whether to get source or destination IPs',
        },
      },
      required: ['direction'],
    },
  },
  {
    name: 'get_attack_breakdown',
    description: 'Get count of flows grouped by attack type',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_protocol_distribution',
    description: 'Get count of flows grouped by protocol',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'investigate_ip',
    description: 'Get detailed information about flows involving a specific IP',
    inputSchema: {
      type: 'object',
      properties: {
        ip: {
          type: 'string',
          description: 'IP address to investigate',
        },
        limit: {
          type: 'number',
          description: 'Max flows to return (default: 100)',
        },
      },
      required: ['ip'],
    },
  },
  {
    name: 'get_time_range',
    description: 'Get the time range (start and end timestamps) of the dataset',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
]

export function getTools(): ToolDefinition[] {
  return TOOLS
}

export function createServer(db?: Database): Server {
  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
      },
    }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS }
  })

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    if (!db) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No database loaded. Please load a parquet file first.',
          },
        ],
        isError: true,
      }
    }

    try {
      switch (name) {
        case 'query_flows': {
          const { query } = QueryFlowsArgsSchema.parse(args)
          const result = await db.query(query)
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          }
        }

        case 'get_top_talkers': {
          const { limit, direction } = TopTalkersArgsSchema.parse(args)
          const result = await getTopTalkers(db, { limit, direction })
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          }
        }

        case 'get_attack_breakdown': {
          const result = await getAttackBreakdown(db)
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          }
        }

        case 'get_protocol_distribution': {
          const result = await getProtocolDistribution(db)
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          }
        }

        case 'investigate_ip': {
          const { ip, limit } = InvestigateIPArgsSchema.parse(args)
          const result = await investigateIP(db, ip, { limit })
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          }
        }

        case 'get_time_range': {
          const result = await getTimeRange(db)
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          }
        }

        default:
          throw new Error(`Unknown tool: ${name}`)
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      }
    }
  })

  // Prompts handlers
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    const prompts = getPrompts()
    return {
      prompts: prompts.map((p) => ({
        name: p.name,
        description: p.description,
        arguments: p.arguments,
      })),
    }
  })

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    const prompt = getPromptByName(name, args as Record<string, string>)

    if (!prompt) {
      throw new Error(`Unknown prompt: ${name}`)
    }

    return {
      description: prompt.description,
      messages: prompt.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }
  })

  return server
}
