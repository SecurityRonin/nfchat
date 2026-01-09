/**
 * Research Disclosure Consent Modal
 *
 * Shows before first AI query to get user consent for data retention
 * Re-prompts if consent is older than 90 days
 */

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card'

const CONSENT_KEY = 'nfchat_consent'
const CONSENT_EXPIRY_DAYS = 90

interface ConsentData {
  given: boolean
  timestamp: number
}

interface ConsentModalProps {
  onAccept: () => void
  onDecline: () => void
}

function getStoredConsent(): ConsentData | null {
  try {
    const stored = localStorage.getItem(CONSENT_KEY)
    if (!stored) return null
    return JSON.parse(stored)
  } catch {
    return null
  }
}

function isConsentValid(consent: ConsentData | null): boolean {
  if (!consent?.given) return false

  const expiryMs = CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  const isExpired = Date.now() - consent.timestamp > expiryMs
  return !isExpired
}

function storeConsent(): void {
  const data: ConsentData = {
    given: true,
    timestamp: Date.now(),
  }
  localStorage.setItem(CONSENT_KEY, JSON.stringify(data))
}

export function ConsentModal({ onAccept, onDecline }: ConsentModalProps) {
  const [checked, setChecked] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const consent = getStoredConsent()
    const valid = isConsentValid(consent)
    setShow(!valid)
  }, [])

  const handleAccept = () => {
    storeConsent()
    setShow(false)
    onAccept()
  }

  const handleDecline = () => {
    setShow(false)
    onDecline()
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Research Disclosure</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            By using nfchat's AI analysis, you agree that:
          </p>

          <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
            <li>Your questions and query results will be retained</li>
            <li>Data may be used for security research purposes</li>
            <li>Aggregated insights may be published (anonymized)</li>
          </ul>

          <p className="text-sm text-muted-foreground">
            Your contributions help improve network threat detection for the
            security community.
          </p>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm">
              I understand and consent to data retention
            </span>
          </label>
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleDecline}>
            Cancel
          </Button>
          <Button onClick={handleAccept} disabled={!checked}>
            Accept & Continue
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

/**
 * Hook to check if consent is needed
 */
export function useConsentNeeded(): boolean {
  const [needed, setNeeded] = useState(false)

  useEffect(() => {
    const consent = getStoredConsent()
    setNeeded(!isConsentValid(consent))
  }, [])

  return needed
}

/**
 * Check if user has valid consent (utility for other components)
 */
export function hasValidConsent(): boolean {
  return isConsentValid(getStoredConsent())
}
