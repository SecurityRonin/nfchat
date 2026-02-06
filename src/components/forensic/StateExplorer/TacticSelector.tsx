import { ATTACK_COLORS } from '@/lib/schema'

const ALL_TACTICS = [
  'Reconnaissance',
  'Discovery',
  'Initial Access',
  'Execution',
  'Persistence',
  'Privilege Escalation',
  'Defense Evasion',
  'Credential Access',
  'Lateral Movement',
  'Collection',
  'Command and Control',
  'Exfiltration',
  'Impact',
  'Benign',
  'Unknown',
]

interface TacticSelectorProps {
  stateId: number
  suggestedTactic: string
  suggestedConfidence: number
  assignedTactic?: string
  onAssign: (stateId: number, tactic: string) => void
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.7) return 'bg-green-500'
  if (confidence >= 0.4) return 'bg-yellow-500'
  return 'bg-red-500'
}

export function TacticSelector({
  stateId,
  suggestedTactic,
  suggestedConfidence,
  assignedTactic,
  onAssign,
}: TacticSelectorProps) {
  const currentTactic = assignedTactic ?? suggestedTactic
  const tacticColor = ATTACK_COLORS[currentTactic] || '#71717a'

  return (
    <div className="flex items-center gap-2">
      <div
        data-testid="confidence-dot"
        className={`w-2 h-2 rounded-full ${confidenceColor(suggestedConfidence)}`}
        title={`Confidence: ${Math.round(suggestedConfidence * 100)}%`}
      />
      <select
        role="combobox"
        value={currentTactic}
        onChange={(e) => onAssign(stateId, e.target.value)}
        className="h-7 rounded border border-border bg-background px-2 text-xs font-medium"
        style={{ color: tacticColor }}
      >
        {ALL_TACTICS.map((tactic) => (
          <option key={tactic} value={tactic}>
            {tactic}
          </option>
        ))}
      </select>
    </div>
  )
}
