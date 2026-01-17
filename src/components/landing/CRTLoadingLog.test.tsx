import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CRTLoadingLog, type CRTLogEntry } from './CRTLoadingLog'

describe('CRTLoadingLog', () => {
  describe('rendering', () => {
    it('renders file name being loaded', () => {
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={50}
          logs={[]}
        />
      )

      expect(screen.getByText(/loading.*flows\.csv/i)).toBeInTheDocument()
    })

    it('renders with empty logs array', () => {
      render(
        <CRTLoadingLog
          fileName="test.csv"
          progress={0}
          logs={[]}
        />
      )

      expect(screen.getByText(/loading.*test\.csv/i)).toBeInTheDocument()
    })

    it('displays file name with special characters', () => {
      render(
        <CRTLoadingLog
          fileName="flows (1) [copy].csv"
          progress={50}
          logs={[]}
        />
      )

      expect(screen.getByText(/flows \(1\) \[copy\]\.csv/i)).toBeInTheDocument()
    })

    it('displays very long file name', () => {
      const longName = 'a'.repeat(100) + '.csv'
      render(
        <CRTLoadingLog
          fileName={longName}
          progress={50}
          logs={[]}
        />
      )

      expect(screen.getByText(new RegExp(longName, 'i'))).toBeInTheDocument()
    })
  })

  describe('progress bar', () => {
    it('shows progress bar with percentage', () => {
      render(
        <CRTLoadingLog
          fileName="data.parquet"
          progress={75}
          logs={[]}
        />
      )

      expect(screen.getByText('75%')).toBeInTheDocument()
      expect(screen.getByTestId('crt-progress-bar')).toHaveStyle({ width: '75%' })
    })

    it('shows 0% progress', () => {
      render(
        <CRTLoadingLog
          fileName="data.parquet"
          progress={0}
          logs={[]}
        />
      )

      expect(screen.getByText('0%')).toBeInTheDocument()
      expect(screen.getByTestId('crt-progress-bar')).toHaveStyle({ width: '0%' })
    })

    it('shows 100% progress', () => {
      render(
        <CRTLoadingLog
          fileName="data.parquet"
          progress={100}
          logs={[]}
        />
      )

      expect(screen.getByText('100%')).toBeInTheDocument()
      expect(screen.getByTestId('crt-progress-bar')).toHaveStyle({ width: '100%' })
    })

    it('handles decimal progress values', () => {
      render(
        <CRTLoadingLog
          fileName="data.parquet"
          progress={33.33}
          logs={[]}
        />
      )

      expect(screen.getByText('33.33%')).toBeInTheDocument()
    })

    it('handles negative progress (edge case)', () => {
      render(
        <CRTLoadingLog
          fileName="data.parquet"
          progress={-10}
          logs={[]}
        />
      )

      expect(screen.getByText('-10%')).toBeInTheDocument()
    })

    it('handles progress over 100 (edge case)', () => {
      render(
        <CRTLoadingLog
          fileName="data.parquet"
          progress={150}
          logs={[]}
        />
      )

      expect(screen.getByText('150%')).toBeInTheDocument()
    })
  })

  describe('log status indicators', () => {
    it('renders completed log entries with OK status', () => {
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={100}
          logs={[
            { message: 'Connected to MotherDuck', status: 'ok' },
            { message: 'Loaded 2,365,424 rows', status: 'ok' },
          ]}
        />
      )

      expect(screen.getAllByText('[OK]')).toHaveLength(2)
      expect(screen.getByText(/connected to motherduck/i)).toBeInTheDocument()
      expect(screen.getByText(/loaded 2,365,424 rows/i)).toBeInTheDocument()
    })

    it('renders pending log entries with animated indicator', () => {
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={80}
          logs={[
            { message: 'Connected to MotherDuck', status: 'ok' },
            { message: 'Building dashboard', status: 'pending' },
          ]}
        />
      )

      expect(screen.getByText('[..]')).toBeInTheDocument()
      expect(screen.getByText(/building dashboard/i)).toBeInTheDocument()
    })

    it('renders failed log entries with FAIL status', () => {
      render(
        <CRTLoadingLog
          fileName="bad.csv"
          progress={30}
          logs={[
            { message: 'Could not parse file', status: 'fail' },
          ]}
        />
      )

      expect(screen.getByText('[FAIL]')).toBeInTheDocument()
      expect(screen.getByText(/could not parse file/i)).toBeInTheDocument()
    })

    it('renders mixed status entries correctly', () => {
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={60}
          logs={[
            { message: 'Step 1', status: 'ok' },
            { message: 'Step 2', status: 'ok' },
            { message: 'Step 3', status: 'pending' },
          ]}
        />
      )

      expect(screen.getAllByText('[OK]')).toHaveLength(2)
      expect(screen.getByText('[..]')).toBeInTheDocument()
    })

    it('handles all statuses in same log', () => {
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={50}
          logs={[
            { message: 'Success', status: 'ok' },
            { message: 'Warning', status: 'pending' },
            { message: 'Error', status: 'fail' },
          ]}
        />
      )

      expect(screen.getByText('[OK]')).toBeInTheDocument()
      expect(screen.getByText('[..]')).toBeInTheDocument()
      expect(screen.getByText('[FAIL]')).toBeInTheDocument()
    })
  })

  describe('blinking cursor', () => {
    it('shows blinking cursor on pending step', () => {
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={50}
          logs={[
            { message: 'Processing', status: 'pending' },
          ]}
        />
      )

      const pendingLine = screen.getByText(/processing/i).closest('div')
      expect(pendingLine).toHaveClass('crt-cursor')
    })

    it('does not show cursor on ok status', () => {
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={100}
          logs={[
            { message: 'Done', status: 'ok' },
          ]}
        />
      )

      const okLine = screen.getByText(/done/i).closest('div')
      expect(okLine).not.toHaveClass('crt-cursor')
    })

    it('does not show cursor on fail status', () => {
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={30}
          logs={[
            { message: 'Failed', status: 'fail' },
          ]}
        />
      )

      const failLine = screen.getByText(/failed/i).closest('div')
      expect(failLine).not.toHaveClass('crt-cursor')
    })
  })

  describe('CSS classes', () => {
    it('applies crt-status-ok class to OK entries', () => {
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={100}
          logs={[
            { message: 'Done', status: 'ok' },
          ]}
        />
      )

      const okIndicator = screen.getByText('[OK]')
      expect(okIndicator).toHaveClass('crt-status-ok')
    })

    it('applies crt-status-pending class to pending entries', () => {
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={50}
          logs={[
            { message: 'Loading', status: 'pending' },
          ]}
        />
      )

      const pendingIndicator = screen.getByText('[..]')
      expect(pendingIndicator).toHaveClass('crt-status-pending')
    })

    it('applies crt-status-fail class to fail entries', () => {
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={30}
          logs={[
            { message: 'Error', status: 'fail' },
          ]}
        />
      )

      const failIndicator = screen.getByText('[FAIL]')
      expect(failIndicator).toHaveClass('crt-status-fail')
    })

    it('applies crt-status-fail class to fail message text', () => {
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={30}
          logs={[
            { message: 'Error message', status: 'fail' },
          ]}
        />
      )

      const messageText = screen.getByText('Error message')
      expect(messageText).toHaveClass('crt-status-fail')
    })

    it('applies crt-glow-dim class to non-fail message text', () => {
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={50}
          logs={[
            { message: 'Loading...', status: 'pending' },
          ]}
        />
      )

      const messageText = screen.getByText('Loading...')
      expect(messageText).toHaveClass('crt-glow-dim')
    })
  })

  describe('many log entries', () => {
    it('renders many log entries', () => {
      const logs: CRTLogEntry[] = Array.from({ length: 20 }, (_, i) => ({
        message: `Step ${i + 1}`,
        status: 'ok' as const,
      }))

      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={100}
          logs={logs}
        />
      )

      expect(screen.getAllByText('[OK]')).toHaveLength(20)
      expect(screen.getByText('Step 1')).toBeInTheDocument()
      expect(screen.getByText('Step 20')).toBeInTheDocument()
    })

    it('renders 100 log entries', () => {
      const logs: CRTLogEntry[] = Array.from({ length: 100 }, (_, i) => ({
        message: `Log entry ${i}`,
        status: 'ok' as const,
      }))

      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={100}
          logs={logs}
        />
      )

      expect(screen.getAllByText('[OK]')).toHaveLength(100)
    })
  })

  describe('message content', () => {
    it('displays message with numbers correctly', () => {
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={100}
          logs={[
            { message: 'Loaded 2365424 rows', status: 'ok' },
          ]}
        />
      )

      expect(screen.getByText(/loaded 2365424 rows/i)).toBeInTheDocument()
    })

    it('displays message with formatted numbers', () => {
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={100}
          logs={[
            { message: 'Loaded 2,365,424 rows', status: 'ok' },
          ]}
        />
      )

      expect(screen.getByText(/loaded 2,365,424 rows/i)).toBeInTheDocument()
    })

    it('displays very long message', () => {
      const longMessage = 'A'.repeat(200)
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={50}
          logs={[
            { message: longMessage, status: 'ok' },
          ]}
        />
      )

      expect(screen.getByText(longMessage)).toBeInTheDocument()
    })

    it('displays message with special characters', () => {
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={50}
          logs={[
            { message: 'File: /path/to/file.csv [100%] <done>', status: 'ok' },
          ]}
        />
      )

      expect(screen.getByText('File: /path/to/file.csv [100%] <done>')).toBeInTheDocument()
    })

    it('displays empty message', () => {
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={50}
          logs={[
            { message: '', status: 'ok' },
          ]}
        />
      )

      // Should render without error
      expect(screen.getByText('[OK]')).toBeInTheDocument()
    })

    it('displays message with unicode', () => {
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={50}
          logs={[
            { message: 'Processing データ 🔄', status: 'pending' },
          ]}
        />
      )

      expect(screen.getByText('Processing データ 🔄')).toBeInTheDocument()
    })
  })

  describe('layout structure', () => {
    it('renders log entries in order', () => {
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={100}
          logs={[
            { message: 'First', status: 'ok' },
            { message: 'Second', status: 'ok' },
            { message: 'Third', status: 'ok' },
          ]}
        />
      )

      const first = screen.getByText('First')
      const second = screen.getByText('Second')
      const third = screen.getByText('Third')

      // Check order in DOM
      expect(first.compareDocumentPosition(second)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
      expect(second.compareDocumentPosition(third)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    })

    it('has monospace font for logs', () => {
      render(
        <CRTLoadingLog
          fileName="flows.csv"
          progress={50}
          logs={[
            { message: 'Test', status: 'ok' },
          ]}
        />
      )

      const logContainer = screen.getByText('Test').closest('.font-mono')
      expect(logContainer).toBeInTheDocument()
    })
  })
})
