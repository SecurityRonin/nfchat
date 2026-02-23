# State Explorer Design

## Overview

Add a State Explorer view to the nfchat web app that discovers behavioral states in network flow data using a TypeScript HMM engine, displays forensic profiles for each state, lets analysts examine matched flows, and assign MITRE ATT&CK tactics.

Replaces the Python `scripts/hmm/` CLI tool with an in-browser implementation.

## Architecture

### Data Flow

```
Parquet loaded into DuckDB WASM
  -> Feature extraction (DuckDB SQL: 12 dimensions per flow)
  -> TypeScript Gaussian HMM engine (Baum-Welch training)
  -> Viterbi state assignment per flow
  -> Write HMM_STATE back to DuckDB
  -> Compute state signatures (DuckDB SQL: GROUP BY HMM_STATE)
  -> Render State Explorer cards
```

### New Modules

1. **`src/lib/hmm/`** - TypeScript Gaussian HMM
   - `gaussian-hmm.ts` - GaussianHMM class (Baum-Welch + Viterbi)
   - `features.ts` - Feature extraction constants and scaling
   - `bic.ts` - BIC-based state count selection
   - `index.ts` - Public API

2. **`src/lib/motherduck/queries/hmm.ts`** - DuckDB queries
   - `extractFeatures()` - 12 feature dimensions per flow
   - `getStateSignatures()` - Aggregated profiles per state
   - `getSampleFlows()` - 20 sample flows per state
   - `getStateTopHosts()` - Top src/dst IPs per state
   - `getStateTimeline()` - Hourly flow distribution per state
   - `getStateConnStates()` - Connection state distribution
   - `getStatePortServices()` - Top ports and services
   - `updateStateTactic()` - UPDATE MITRE_TACTIC WHERE HMM_STATE = N

3. **`src/components/forensic/StateExplorer/`** - UI components
   - `StateExplorer.tsx` - Container with controls + card grid
   - `StateCard.tsx` - Rich forensic profile card
   - `FlowPreview.tsx` - Expandable sample flow table
   - `TacticSelector.tsx` - ATT&CK tactic dropdown
   - `MiniTimeline.tsx` - Sparkline timeline
   - `DiscoveryControls.tsx` - Discover button + progress + state count

### Store Changes

New `hmmSlice` in Zustand store:
- `hmmStates: StateProfile[]` - Discovered states with signatures
- `hmmTraining: boolean` - Training in progress
- `hmmProgress: number` - Training progress (0-100)
- `tacticAssignments: Record<number, string>` - User-assigned tactics
- `expandedState: number | null` - Which card is expanded

### Navigation

Add tab navigation to switch between ForensicDashboard and StateExplorer.

## State Card Layout

Each state card shows a complete forensic profile:

### Traffic Profile
- Avg bytes in/out with relative bar
- Avg duration with relative bar
- Avg packet rate with relative bar

### Protocol & Ports
- Protocol distribution (TCP/UDP/ICMP percentages with bars)
- Top 5 destination ports with percentages
- Top services (from Zeek SERVICE field)

### Connection States
- CONN_STATE distribution (SF, S0, REJ, RSTO, etc.)

### Top Hosts
- Top 5 source IPs with flow count percentages
- Top 5 destination IPs with flow count percentages

### Timeline
- Sparkline showing hourly flow distribution for this state

### Tactic Assignment
- Dropdown with all 14 ATT&CK tactics + Benign + Unknown
- Auto-suggestion from heuristic scorer with confidence indicator
- Color-coded confidence dot (green > 0.7, yellow > 0.4, red < 0.4)

### Expandable Flow Preview
- 20 sample flows in a mini-table
- Columns: src IP, dst IP, protocol, dst port, in bytes, out bytes, duration

## Interaction Flow

1. **Discover** - User clicks "Discover States", optionally selects state count
2. **Train** - Progress bar during HMM training (50-100 EM iterations)
3. **Examine** - Browse state cards, expand sample flows
4. **Label** - Select ATT&CK tactics from dropdowns
5. **Save** - "Save All Labels" writes MITRE_TACTIC to all flows via UPDATE
6. **Analyze** - Switch to ForensicDashboard; KillChainTimeline reflects new labels

## TypeScript HMM Engine

Port of the Python `scripts/hmm/` Gaussian HMM:

### Features (12 dimensions)
1. `log1p_in_bytes` - Log-scaled inbound bytes
2. `log1p_out_bytes` - Log-scaled outbound bytes
3. `log1p_in_pkts` - Log-scaled inbound packets
4. `log1p_out_pkts` - Log-scaled outbound packets
5. `log1p_duration_ms` - Log-scaled flow duration
6. `log1p_iat_avg` - Log-scaled inter-arrival time (computed per session)
7. `bytes_ratio` - IN_BYTES / (OUT_BYTES + 1)
8. `pkts_per_second` - Total packets / duration
9. `is_tcp` - Binary protocol indicator
10. `is_udp` - Binary protocol indicator
11. `is_icmp` - Binary protocol indicator
12. `port_category` - 0 (well-known), 1 (registered), 2 (ephemeral)

### Algorithms
- **Baum-Welch** (EM) for training with diagonal covariance
- **Viterbi** for state sequence prediction
- **BIC** for automatic state count selection (range 4-15)
- **StandardScaler** for feature normalization

## Persistence

- State assignments: `UPDATE flows SET HMM_STATE = ? WHERE rowid = ?`
- Tactic labels: `UPDATE flows SET MITRE_TACTIC = ? WHERE HMM_STATE = ?`
- Direct mutation of MotherDuck data; all downstream views reflect changes immediately

## Removed

- `scripts/hmm/` - Entire Python HMM directory (replaced by TS implementation)
