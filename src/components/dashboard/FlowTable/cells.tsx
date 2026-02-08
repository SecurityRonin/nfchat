/**
 * Cell Renderers for FlowTable Columns
 *
 * Reusable cell components for different data types.
 */

import { Badge } from '@/components/ui/badge';
import { PROTOCOL_NAMES, ATTACK_COLORS, type AttackType } from '@/lib/schema';

export function MonoCell({ value }: { value: string | number | undefined }) {
  return <span className="font-mono text-xs">{value}</span>;
}

export function NumericCell({ value }: { value: number | undefined }) {
  return <span className="text-xs">{value?.toLocaleString()}</span>;
}

export function ProtocolCell({ value }: { value: number | undefined }) {
  const name = value !== undefined ? PROTOCOL_NAMES[value] : undefined;
  return <span className="text-xs">{name || value}</span>;
}

const STATE_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f97316', '#a855f7',
  '#ec4899', '#14b8a6', '#eab308', '#6366f1', '#78716c',
];

export function StateBadge({ value }: { value: number | undefined }) {
  if (value === undefined || value === null) return <span />;
  const color = STATE_COLORS[value % STATE_COLORS.length];
  return (
    <Badge
      variant="outline"
      style={{ borderColor: color, color }}
      className="text-xs"
    >
      S{value}
    </Badge>
  );
}

export function AttackBadge({ value }: { value: string | undefined }) {
  const color = ATTACK_COLORS[value as AttackType] || '#6b7280';
  return (
    <Badge
      variant="outline"
      style={{ borderColor: color, color }}
      className="text-xs"
    >
      {value}
    </Badge>
  );
}
