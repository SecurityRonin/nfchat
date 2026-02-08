import { useEffect, useState } from 'react'
import { getSampleFlows, getStateTopHosts, getStateTimeline, getStateConnStates, getStatePortServices } from '@/lib/motherduck/queries'
import { logger } from '@/lib/logger'
import type { FlowRecord } from '@/lib/schema'
import type { HostCount, TimelineBucket, ConnStateCount, PortCount, ServiceCount } from '@/lib/motherduck/queries/hmm'

const detailsLogger = logger.child('useStateDetails')

interface StateDetailsResult {
  topHosts: { srcHosts: HostCount[]; dstHosts: HostCount[] }
  timeline: TimelineBucket[]
  connStates: ConnStateCount[]
  portServices: { ports: PortCount[]; services: ServiceCount[] }
  sampleFlows: Partial<FlowRecord>[]
  loading: boolean
  error: string | null
}

const emptyResult: Omit<StateDetailsResult, 'loading' | 'error'> = {
  topHosts: { srcHosts: [], dstHosts: [] },
  timeline: [],
  connStates: [],
  portServices: { ports: [], services: [] },
  sampleFlows: [],
}

export function useStateDetails(stateId: number, enabled: boolean): StateDetailsResult {
  const [topHosts, setTopHosts] = useState(emptyResult.topHosts)
  const [timeline, setTimeline] = useState<TimelineBucket[]>([])
  const [connStates, setConnStates] = useState<ConnStateCount[]>([])
  const [portServices, setPortServices] = useState(emptyResult.portServices)
  const [sampleFlows, setSampleFlows] = useState<Partial<FlowRecord>[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    async function loadDetails() {
      setLoading(true)
      setError(null)

      try {
        const [hosts, tl, cs, ps, flows] = await Promise.all([
          getStateTopHosts(stateId),
          getStateTimeline(stateId),
          getStateConnStates(stateId),
          getStatePortServices(stateId),
          getSampleFlows(stateId),
        ])

        if (!cancelled) {
          setTopHosts(hosts)
          setTimeline(tl)
          setConnStates(cs)
          setPortServices(ps)
          setSampleFlows(flows)
          detailsLogger.info('Loaded details', { stateId })
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load state details'
          setError(msg)
          detailsLogger.error('Failed to load details', { stateId, error: msg })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDetails()
    return () => { cancelled = true }
  }, [stateId, enabled])

  return { topHosts, timeline, connStates, portServices, sampleFlows, loading, error }
}
