# Forensic Dashboard Design

**Date:** 2026-01-15
**Status:** Approved
**Use Case:** Post-incident forensic analysis with natural language querying

## Summary

Redesign nfchat from a visualization-heavy dashboard to a forensic analysis tool with chat-first interaction. Remove complex timeline and chart components in favor of a split-view layout: flow table (left) + always-visible chat (right).

## Research

Patterns from security dashboards (Splunk, Datadog, Elastic SIEM, Grafana):
- Tables are the primary interface for forensic work
- Single screen, no scrolling, loads in <10 seconds
- Drill-down focused, not passive viewing
- Timeline charts are optional for query-based workflows

## Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  nfchat                                                    [⚙️]    │
├─────────────────────────────────────────────────────────────────────┤
│  📊 2.3M flows │ ⏱️ 6h span │ 🎯 Top: DDoS (42%) │ 🔴 892 alerts   │
├─────────────────────────────────┬───────────────────────────────────┤
│                                 │                                   │
│       FLOW TABLE (65%)          │       CHAT PANEL (35%)            │
│       - Virtualized             │       - Always visible            │
│       - Click-to-filter         │       - NL queries                │
│       - Column sorting          │       - Shows summaries           │
│       - Inline filters          │       - Suggested follow-ups      │
│                                 │                                   │
│  Filters: [Src: 192.168.x ×]    │  [💬 Ask about this data...]      │
└─────────────────────────────────┴───────────────────────────────────┘
```

## Interaction Patterns

### Click-to-Filter
1. User clicks any cell value in FlowTable
2. Chat auto-populates: "Filter by {column} {value}"
3. Query executes, table updates
4. Chat shows summary of filtered results

### Stats Bar Popovers
- Click any stat in the bar to see detail popover
- Popover includes "Filter to this" and "Ask about..." actions
- Replaces permanent AttackBreakdown and TopTalkers panels

### Chat Queries
- "Show me all SSH traffic from last hour"
- "What are the top 10 source IPs?"
- "Filter to DDoS attacks only"
- "Export current view as CSV"

## Component Architecture

### Delete (7 components removed)
```
src/components/dashboard/timeline/     # Entire directory
src/components/dashboard/TimelineChart.tsx
src/components/dashboard/AttackBreakdown.tsx
src/components/dashboard/TopTalkers.tsx
src/components/dashboard/charts/       # Lightweight charts
```

### Create (4 new components)
```
src/components/forensic/ForensicDashboard.tsx
src/components/forensic/StatsBar.tsx
src/components/forensic/popovers/AttackPopover.tsx
src/components/forensic/popovers/TopTalkersPopover.tsx
```

### Enhance
```
src/components/dashboard/FlowTable.tsx  # Add click-to-filter
src/components/Chat.tsx                 # Always visible, receives clicks
```

## Store Changes

### Remove
- `timelineData`
- `playback` (isPlaying, currentTime, speed, duration, inPoint, outPoint)
- `setTimelineData`
- All playback setters

### Keep
- `flows`
- `filters` (enhance with active chips)
- `messages`
- `totalFlowCount`
- `attackBreakdown` (for popover)
- `topSrcIPs`, `topDstIPs` (for popover)

## Data Flow

```
Chat Query → AI Backend → SQL Generation → MotherDuck → Store → UI Update
     ↑                                                           │
     └─────────── Click-to-filter auto-populates ────────────────┘
```

## Performance Benefits

| Before | After |
|--------|-------|
| 7+ chart components | 1 table + 1 chat |
| Complex SVG rendering | Simple table rows |
| Playback animation loop | No animations |
| Multiple store subscriptions | Minimal subscriptions |

## Success Criteria

1. Dashboard loads in <5 seconds (down from 25s)
2. Click-to-filter feels instant (<100ms)
3. Chat queries return results in <3 seconds
4. No horizontal scrolling on 1280px screens
5. All forensic questions answerable via chat

## Implementation Order

1. Create ForensicDashboard shell with split layout
2. Move FlowTable, add click-to-filter
3. Make Chat always visible, wire click events
4. Add StatsBar with popovers
5. Delete old components
6. Clean up store
7. Update tests
