import { memo } from 'react'
import type { StateTransition } from '@/lib/motherduck/queries/hmm'

interface StateTransitionsProps {
  transitions: StateTransition[]
  nStates: number
}

export const StateTransitions = memo(function StateTransitions({
  transitions,
  nStates,
}: StateTransitionsProps) {
  if (nStates === 0) return null

  // Build NxN matrix
  const matrix: number[][] = Array.from({ length: nStates }, () =>
    Array(nStates).fill(0)
  )
  let maxCount = 0
  for (const t of transitions) {
    if (t.fromState < nStates && t.toState < nStates) {
      matrix[t.fromState][t.toState] = t.count
      if (t.count > maxCount) maxCount = t.count
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">State Transitions</h3>
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="p-1"></th>
            {Array.from({ length: nStates }, (_, i) => (
              <th key={i} className="p-1 text-center font-medium">
                S{i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: nStates }, (_, from) => (
            <tr key={from}>
              <td className="p-1 font-medium">S{from}</td>
              {Array.from({ length: nStates }, (_, to) => {
                const count = matrix[from][to]
                const opacity = maxCount > 0 ? 0.1 + (count / maxCount) * 0.9 : 0
                return (
                  <td
                    key={to}
                    data-count={count}
                    className="p-1 text-center min-w-[2rem]"
                    style={{
                      backgroundColor: `rgba(59, 130, 246, ${count > 0 ? opacity : 0})`,
                    }}
                  >
                    {count}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})
