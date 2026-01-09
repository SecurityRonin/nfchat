export interface PromptDefinition {
  name: string
  description: string
  arguments?: {
    name: string
    description: string
    required: boolean
  }[]
}

export interface PromptMessage {
  role: 'user' | 'assistant'
  content: {
    type: 'text'
    text: string
  }
}

export interface PromptResult {
  description: string
  messages: PromptMessage[]
}

const PROMPTS: PromptDefinition[] = [
  {
    name: 'investigate_incident',
    description:
      'Guide through a structured incident investigation workflow for NetFlow data',
    arguments: [],
  },
  {
    name: 'threat_hunt',
    description: 'Systematic threat hunting across NetFlow data to find anomalies',
    arguments: [],
  },
  {
    name: 'detect_lateral_movement',
    description: 'Identify potential lateral movement patterns in network traffic',
    arguments: [],
  },
  {
    name: 'investigate_ip',
    description: 'Deep investigation of a specific IP address',
    arguments: [
      {
        name: 'ip',
        description: 'The IP address to investigate',
        required: true,
      },
    ],
  },
  {
    name: 'find_exfiltration',
    description: 'Look for potential data exfiltration patterns',
    arguments: [],
  },
  {
    name: 'analyze_attacks',
    description: 'Summarize and analyze detected attacks in the dataset',
    arguments: [],
  },
]

const PROMPT_TEMPLATES: Record<string, (args?: Record<string, string>) => PromptResult> = {
  investigate_incident: () => ({
    description: 'Structured incident investigation workflow',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `You are an IR analyst investigating a security incident using NetFlow data.

Follow this investigation workflow:

1. **Initial Assessment**
   - Use get_time_range to understand the data timeframe
   - Use get_attack_breakdown to see what types of attacks are present
   - Identify the scope of the incident

2. **Identify Key Players**
   - Use get_top_talkers (both src and dst) to find the most active IPs
   - Cross-reference with attack types

3. **Deep Dive**
   - For each suspicious IP, use investigate_ip to get detailed flow information
   - Look for patterns: unusual ports, protocols, timing

4. **Timeline Reconstruction**
   - Build a timeline of events
   - Identify the initial compromise point
   - Track lateral movement

5. **Impact Assessment**
   - Identify affected systems
   - Estimate data exposure

Begin by getting an overview of the dataset.`,
        },
      },
    ],
  }),

  threat_hunt: () => ({
    description: 'Systematic threat hunting workflow',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `You are conducting proactive threat hunting on NetFlow data.

Hunting hypotheses to investigate:

1. **Beaconing Detection**
   - Look for regular, periodic connections
   - Query for consistent timing patterns between src/dst pairs

2. **Unusual Port Activity**
   - Check for traffic on non-standard ports
   - Look for services on unexpected ports

3. **Data Staging**
   - Look for large data transfers to unusual destinations
   - Check OUT_BYTES for anomalies

4. **Protocol Anomalies**
   - Analyze protocol distribution
   - Look for unusual L7_PROTO values

Start by getting the attack breakdown and top talkers to identify areas of interest.`,
        },
      },
    ],
  }),

  detect_lateral_movement: () => ({
    description: 'Lateral movement detection patterns',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `You are looking for lateral movement indicators in NetFlow data.

Signs of lateral movement to investigate:

1. **Internal Scanning**
   - Single source connecting to many internal destinations
   - Sequential port scanning patterns

2. **SMB/RDP Traffic**
   - Look for protocol 6 (TCP) with ports 445, 3389
   - Query: SELECT * FROM flows WHERE L4_DST_PORT IN (445, 3389, 22, 5985)

3. **Pass-the-Hash Patterns**
   - Rapid authentication to multiple systems
   - Same source, many destinations, short time window

4. **Internal Pivoting**
   - Systems acting as both source and destination
   - Unusual internal communication patterns

Use query_flows to find these patterns.`,
        },
      },
    ],
  }),

  investigate_ip: (args) => ({
    description: `Deep investigation of IP ${args?.ip}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Investigate the IP address ${args?.ip} thoroughly.

Investigation steps:

1. **Role Determination**
   - Is this IP primarily a source or destination?
   - Use investigate_ip tool to get flow details

2. **Communication Profile**
   - What protocols does this IP use?
   - What ports are involved?
   - Who are its communication partners?

3. **Attack Association**
   - Is this IP associated with any attack labels?
   - What types of attacks?

4. **Volume Analysis**
   - How much data transferred IN and OUT?
   - Any unusual volume patterns?

5. **Temporal Analysis**
   - When was this IP active?
   - Any patterns in timing?

Start by using investigate_ip for ${args?.ip} to gather initial data.`,
        },
      },
    ],
  }),

  find_exfiltration: () => ({
    description: 'Data exfiltration detection workflow',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `You are hunting for potential data exfiltration in NetFlow data.

Exfiltration indicators to investigate:

1. **Large Outbound Transfers**
   - Look for high OUT_BYTES values
   - Query: SELECT * FROM flows WHERE OUT_BYTES > 1000000 ORDER BY OUT_BYTES DESC

2. **Unusual Destinations**
   - Check external IPs receiving large data volumes
   - Cross-reference with attack labels

3. **Off-Hours Activity**
   - Data transfers during non-business hours
   - Analyze FLOW_START_MILLISECONDS patterns

4. **Protocol Tunneling**
   - DNS exfiltration (port 53 with unusual volume)
   - ICMP tunneling

Start by finding flows with the largest OUT_BYTES values.`,
        },
      },
    ],
  }),

  analyze_attacks: () => ({
    description: 'Attack analysis and summary',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Analyze the attacks present in this NetFlow dataset.

Analysis workflow:

1. **Attack Distribution**
   - Use get_attack_breakdown to see all attack types
   - Identify the most prevalent attacks

2. **Attack Sources**
   - For each attack type, identify the source IPs
   - Query: SELECT IPV4_SRC_ADDR, COUNT(*) FROM flows WHERE Attack = 'X' GROUP BY IPV4_SRC_ADDR

3. **Attack Targets**
   - Identify most targeted destinations
   - What services/ports are being attacked?

4. **Attack Timeline**
   - When did different attacks occur?
   - Any correlation between attack types?

5. **Severity Assessment**
   - Rank attacks by volume and potential impact
   - Prioritize for response

Begin with get_attack_breakdown to see the overall attack landscape.`,
        },
      },
    ],
  }),
}

export function getPrompts(): PromptDefinition[] {
  return PROMPTS
}

export function getPromptByName(
  name: string,
  args?: Record<string, string>
): PromptResult | undefined {
  const template = PROMPT_TEMPLATES[name]
  if (!template) {
    return undefined
  }
  return template(args)
}
