# netflow-mcp

MCP server for NetFlow analysis and incident response investigation.

## Features

- **DuckDB-powered**: Fast analytical queries on NetFlow data
- **Parquet support**: Load Parquet files with millions of flow records
- **IR-focused tools**: Built-in tools for incident investigation
- **Investigation prompts**: Pre-built workflows for threat hunting

## Installation

```bash
npm install -g netflow-mcp
```

## Usage

```bash
netflow-mcp /path/to/netflows.parquet
```

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "netflow": {
      "command": "netflow-mcp",
      "args": ["/path/to/your/netflows.parquet"]
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `query_flows` | Execute SQL queries against NetFlow data |
| `get_top_talkers` | Get most active IPs (source or destination) |
| `get_attack_breakdown` | Count flows by attack type |
| `get_protocol_distribution` | Count flows by protocol |
| `investigate_ip` | Deep dive into flows for a specific IP |
| `get_time_range` | Get dataset time boundaries |

## Prompts

| Prompt | Description |
|--------|-------------|
| `investigate_incident` | Structured IR workflow |
| `threat_hunt` | Proactive threat hunting |
| `detect_lateral_movement` | Find lateral movement patterns |
| `investigate_ip` | Deep dive on specific IP |
| `find_exfiltration` | Data exfiltration detection |
| `analyze_attacks` | Attack summary and analysis |

## Dataset Schema

The server expects NetFlow data with these columns:

- `FLOW_START_MILLISECONDS` - Flow start timestamp
- `IPV4_SRC_ADDR` - Source IP address
- `IPV4_DST_ADDR` - Destination IP address
- `L4_SRC_PORT` - Source port
- `L4_DST_PORT` - Destination port
- `PROTOCOL` - IP protocol number
- `IN_BYTES` - Bytes received
- `OUT_BYTES` - Bytes sent
- `Attack` - Attack label (optional)

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

## License

MIT
