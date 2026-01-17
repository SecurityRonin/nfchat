import { describe, it, expect } from 'vitest'
import {
  detectColumnMapping,
  buildColumnAliases,
  REQUIRED_COLUMNS,
  OPTIONAL_COLUMNS,
} from './column-mapper'

describe('column-mapper', () => {
  describe('detectColumnMapping', () => {
    describe('standard NetFlow columns', () => {
      it('detects standard NetFlow column names', () => {
        const headers = ['IPV4_SRC_ADDR', 'IPV4_DST_ADDR', 'L4_SRC_PORT', 'L4_DST_PORT', 'PROTOCOL']
        const result = detectColumnMapping(headers)

        expect(result.success).toBe(true)
        expect(result.mapping?.IPV4_SRC_ADDR).toBe('IPV4_SRC_ADDR')
        expect(result.mapping?.IPV4_DST_ADDR).toBe('IPV4_DST_ADDR')
      })

      it('detects all standard optional columns', () => {
        const headers = [
          'IPV4_SRC_ADDR', 'IPV4_DST_ADDR',
          'L4_SRC_PORT', 'L4_DST_PORT',
          'PROTOCOL', 'IN_BYTES', 'OUT_BYTES', 'IN_PKTS', 'OUT_PKTS',
        ]
        const result = detectColumnMapping(headers)

        expect(result.success).toBe(true)
        expect(result.mapping?.L4_SRC_PORT).toBe('L4_SRC_PORT')
        expect(result.mapping?.L4_DST_PORT).toBe('L4_DST_PORT')
        expect(result.mapping?.PROTOCOL).toBe('PROTOCOL')
        expect(result.mapping?.IN_BYTES).toBe('IN_BYTES')
        expect(result.mapping?.OUT_BYTES).toBe('OUT_BYTES')
        expect(result.mapping?.IN_PKTS).toBe('IN_PKTS')
        expect(result.mapping?.OUT_PKTS).toBe('OUT_PKTS')
      })
    })

    describe('nfdump format', () => {
      it('detects nfdump column names (sa, da, sp, dp, pr)', () => {
        const headers = ['sa', 'da', 'sp', 'dp', 'pr', 'ibyt', 'obyt']
        const result = detectColumnMapping(headers)

        expect(result.success).toBe(true)
        expect(result.mapping?.IPV4_SRC_ADDR).toBe('sa')
        expect(result.mapping?.IPV4_DST_ADDR).toBe('da')
        expect(result.mapping?.L4_SRC_PORT).toBe('sp')
        expect(result.mapping?.L4_DST_PORT).toBe('dp')
        expect(result.mapping?.PROTOCOL).toBe('pr')
      })

      it('detects nfdump bytes columns (ibyt, obyt)', () => {
        const headers = ['sa', 'da', 'ibyt', 'obyt']
        const result = detectColumnMapping(headers)

        expect(result.mapping?.IN_BYTES).toBe('ibyt')
        expect(result.mapping?.OUT_BYTES).toBe('obyt')
      })

      it('detects nfdump packet columns (ipkt, opkt)', () => {
        const headers = ['sa', 'da', 'ipkt', 'opkt']
        const result = detectColumnMapping(headers)

        expect(result.mapping?.IN_PKTS).toBe('ipkt')
        expect(result.mapping?.OUT_PKTS).toBe('opkt')
      })
    })

    describe('SiLK format', () => {
      it('detects SiLK column names (sIP, dIP)', () => {
        const headers = ['sIP', 'dIP', 'sPort', 'dPort', 'protocol']
        const result = detectColumnMapping(headers)

        expect(result.success).toBe(true)
        expect(result.mapping?.IPV4_SRC_ADDR).toBe('sIP')
        expect(result.mapping?.IPV4_DST_ADDR).toBe('dIP')
      })
    })

    describe('generic formats', () => {
      it('detects generic names (src_ip, dst_ip)', () => {
        const headers = ['src_ip', 'dst_ip', 'src_port', 'dst_port', 'proto']
        const result = detectColumnMapping(headers)

        expect(result.success).toBe(true)
        expect(result.mapping?.IPV4_SRC_ADDR).toBe('src_ip')
        expect(result.mapping?.IPV4_DST_ADDR).toBe('dst_ip')
      })

      it('detects source/destination format', () => {
        const headers = ['source', 'destination']
        const result = detectColumnMapping(headers)

        expect(result.success).toBe(true)
        expect(result.mapping?.IPV4_SRC_ADDR).toBe('source')
        expect(result.mapping?.IPV4_DST_ADDR).toBe('destination')
      })

      it('detects srcaddr/dstaddr format', () => {
        const headers = ['srcaddr', 'dstaddr']
        const result = detectColumnMapping(headers)

        expect(result.success).toBe(true)
        expect(result.mapping?.IPV4_SRC_ADDR).toBe('srcaddr')
        expect(result.mapping?.IPV4_DST_ADDR).toBe('dstaddr')
      })

      it('detects srcip/dstip format', () => {
        const headers = ['srcip', 'dstip']
        const result = detectColumnMapping(headers)

        expect(result.success).toBe(true)
        expect(result.mapping?.IPV4_SRC_ADDR).toBe('srcip')
        expect(result.mapping?.IPV4_DST_ADDR).toBe('dstip')
      })
    })

    describe('case sensitivity', () => {
      it('is case-insensitive', () => {
        const headers = ['SRC_IP', 'DST_IP', 'SRC_PORT', 'DST_PORT', 'PROTO']
        const result = detectColumnMapping(headers)

        expect(result.success).toBe(true)
        expect(result.mapping?.IPV4_SRC_ADDR).toBe('SRC_IP')
      })

      it('handles mixed case headers', () => {
        const headers = ['Src_Ip', 'Dst_Ip']
        const result = detectColumnMapping(headers)

        expect(result.success).toBe(true)
        expect(result.mapping?.IPV4_SRC_ADDR).toBe('Src_Ip')
      })

      it('preserves original case in mapping', () => {
        const headers = ['SA', 'DA']
        const result = detectColumnMapping(headers)

        expect(result.mapping?.IPV4_SRC_ADDR).toBe('SA')
        expect(result.mapping?.IPV4_DST_ADDR).toBe('DA')
      })
    })

    describe('missing columns', () => {
      it('returns failure with missing columns when required columns not found', () => {
        const headers = ['timestamp', 'bytes', 'packets']
        const result = detectColumnMapping(headers)

        expect(result.success).toBe(false)
        expect(result.missingColumns).toBeDefined()
        expect(result.missingColumns?.length).toBeGreaterThan(0)
      })

      it('returns all missing required columns', () => {
        const headers = ['timestamp', 'bytes']
        const result = detectColumnMapping(headers)

        expect(result.missingColumns).toContain('IPV4_SRC_ADDR')
        expect(result.missingColumns).toContain('IPV4_DST_ADDR')
      })

      it('succeeds with only required columns', () => {
        const headers = ['sa', 'da']
        const result = detectColumnMapping(headers)

        expect(result.success).toBe(true)
      })

      it('returns undefined missingColumns on success', () => {
        const headers = ['sa', 'da']
        const result = detectColumnMapping(headers)

        expect(result.missingColumns).toBeUndefined()
      })
    })

    describe('attack labels', () => {
      it('detects Attack column variations', () => {
        const headers = ['src_ip', 'dst_ip', 'attack_type', 'label']
        const result = detectColumnMapping(headers)

        expect(result.mapping?.Attack).toBe('attack_type')
      })

      it('detects category as Attack', () => {
        const headers = ['src_ip', 'dst_ip', 'category']
        const result = detectColumnMapping(headers)

        expect(result.mapping?.Attack).toBe('category')
      })

      it('detects threat as Attack', () => {
        const headers = ['src_ip', 'dst_ip', 'threat']
        const result = detectColumnMapping(headers)

        expect(result.mapping?.Attack).toBe('threat')
      })

      it('detects Label column', () => {
        const headers = ['src_ip', 'dst_ip', 'label']
        const result = detectColumnMapping(headers)

        expect(result.mapping?.Label).toBe('label')
      })

      it('detects is_attack as Label', () => {
        const headers = ['src_ip', 'dst_ip', 'is_attack']
        const result = detectColumnMapping(headers)

        expect(result.mapping?.Label).toBe('is_attack')
      })

      it('detects malicious as Label', () => {
        const headers = ['src_ip', 'dst_ip', 'malicious']
        const result = detectColumnMapping(headers)

        expect(result.mapping?.Label).toBe('malicious')
      })
    })

    describe('foundHeaders', () => {
      it('returns found headers for manual mapping fallback', () => {
        const headers = ['col1', 'col2', 'col3']
        const result = detectColumnMapping(headers)

        expect(result.foundHeaders).toEqual(headers)
      })

      it('returns all headers even when some match', () => {
        const headers = ['sa', 'da', 'extra', 'more']
        const result = detectColumnMapping(headers)

        expect(result.foundHeaders).toEqual(headers)
      })

      it('returns empty array for empty headers', () => {
        const result = detectColumnMapping([])

        expect(result.foundHeaders).toEqual([])
      })
    })

    describe('edge cases', () => {
      it('handles empty headers array', () => {
        const result = detectColumnMapping([])

        expect(result.success).toBe(false)
        expect(result.mapping).toBeUndefined()
      })

      it('handles duplicate headers', () => {
        const headers = ['sa', 'sa', 'da']
        const result = detectColumnMapping(headers)

        // Should match the first occurrence
        expect(result.mapping?.IPV4_SRC_ADDR).toBe('sa')
      })

      it('handles headers with whitespace', () => {
        const headers = ['  sa  ', '  da  ']
        const result = detectColumnMapping(headers)

        // Doesn't trim - exact match required
        expect(result.success).toBe(false)
      })

      it('handles single column matching required', () => {
        const headers = ['sa']
        const result = detectColumnMapping(headers)

        expect(result.success).toBe(false)
        expect(result.mapping?.IPV4_SRC_ADDR).toBe('sa')
      })

      it('handles very long header names', () => {
        const longName = 'a'.repeat(1000)
        const headers = [longName, 'sa', 'da']
        const result = detectColumnMapping(headers)

        expect(result.success).toBe(true)
        expect(result.foundHeaders).toContain(longName)
      })

      it('handles special characters in headers', () => {
        const headers = ['sa@#$', 'da', 'src_ip']
        const result = detectColumnMapping(headers)

        // 'sa@#$' doesn't match 'sa' exactly
        expect(result.mapping?.IPV4_SRC_ADDR).toBe('src_ip')
      })

      it('handles numeric header names', () => {
        const headers = ['123', '456', 'sa', 'da']
        const result = detectColumnMapping(headers)

        expect(result.success).toBe(true)
      })
    })

    describe('priority matching', () => {
      it('matches first alias when multiple aliases could match', () => {
        const headers = ['ipv4_src_addr', 'sa', 'da']
        const result = detectColumnMapping(headers)

        // Should match 'ipv4_src_addr' as it's the first alias
        expect(result.mapping?.IPV4_SRC_ADDR).toBe('ipv4_src_addr')
      })
    })
  })

  describe('buildColumnAliases', () => {
    it('builds SQL aliases for different column names', () => {
      const mapping = {
        IPV4_SRC_ADDR: 'sa',
        IPV4_DST_ADDR: 'da',
      }

      const result = buildColumnAliases(mapping)

      expect(result).toContain('"sa" AS IPV4_SRC_ADDR')
      expect(result).toContain('"da" AS IPV4_DST_ADDR')
    })

    it('does not alias columns that already match', () => {
      const mapping = {
        IPV4_SRC_ADDR: 'IPV4_SRC_ADDR',
        IPV4_DST_ADDR: 'IPV4_DST_ADDR',
      }

      const result = buildColumnAliases(mapping)

      expect(result).toContain('IPV4_SRC_ADDR')
      expect(result).not.toContain('"IPV4_SRC_ADDR" AS')
    })

    it('handles empty mapping', () => {
      const result = buildColumnAliases({})

      expect(result).toBe('')
    })

    it('handles mixed matching and non-matching columns', () => {
      const mapping = {
        IPV4_SRC_ADDR: 'sa',
        IPV4_DST_ADDR: 'IPV4_DST_ADDR',
        L4_SRC_PORT: 'sp',
      }

      const result = buildColumnAliases(mapping)

      expect(result).toContain('"sa" AS IPV4_SRC_ADDR')
      expect(result).toContain('IPV4_DST_ADDR')
      expect(result).not.toContain('"IPV4_DST_ADDR" AS')
      expect(result).toContain('"sp" AS L4_SRC_PORT')
    })

    it('joins aliases with commas', () => {
      const mapping = {
        IPV4_SRC_ADDR: 'sa',
        IPV4_DST_ADDR: 'da',
      }

      const result = buildColumnAliases(mapping)

      expect(result).toMatch(/.+, .+/)
    })

    it('handles columns with special characters in names', () => {
      const mapping = {
        IPV4_SRC_ADDR: 'src-ip',
      }

      const result = buildColumnAliases(mapping)

      expect(result).toContain('"src-ip" AS IPV4_SRC_ADDR')
    })
  })

  describe('REQUIRED_COLUMNS', () => {
    it('includes core NetFlow columns', () => {
      expect(REQUIRED_COLUMNS).toContain('IPV4_SRC_ADDR')
      expect(REQUIRED_COLUMNS).toContain('IPV4_DST_ADDR')
    })

    it('has exactly 2 required columns', () => {
      expect(REQUIRED_COLUMNS.length).toBe(2)
    })
  })

  describe('OPTIONAL_COLUMNS', () => {
    it('includes port columns', () => {
      expect(OPTIONAL_COLUMNS).toContain('L4_SRC_PORT')
      expect(OPTIONAL_COLUMNS).toContain('L4_DST_PORT')
    })

    it('includes protocol column', () => {
      expect(OPTIONAL_COLUMNS).toContain('PROTOCOL')
    })

    it('includes bytes columns', () => {
      expect(OPTIONAL_COLUMNS).toContain('IN_BYTES')
      expect(OPTIONAL_COLUMNS).toContain('OUT_BYTES')
    })

    it('includes packet columns', () => {
      expect(OPTIONAL_COLUMNS).toContain('IN_PKTS')
      expect(OPTIONAL_COLUMNS).toContain('OUT_PKTS')
    })

    it('includes attack label columns', () => {
      expect(OPTIONAL_COLUMNS).toContain('Attack')
      expect(OPTIONAL_COLUMNS).toContain('Label')
    })
  })

  describe('real-world datasets', () => {
    it('handles UNSW-NB15 format', () => {
      const headers = [
        'IPV4_SRC_ADDR', 'L4_SRC_PORT', 'IPV4_DST_ADDR', 'L4_DST_PORT',
        'PROTOCOL', 'Attack', 'Label',
      ]
      const result = detectColumnMapping(headers)

      expect(result.success).toBe(true)
      expect(result.mapping?.IPV4_SRC_ADDR).toBe('IPV4_SRC_ADDR')
      expect(result.mapping?.Attack).toBe('Attack')
      expect(result.mapping?.Label).toBe('Label')
    })

    it('handles nfdump export format', () => {
      const headers = ['ts', 'sa', 'da', 'sp', 'dp', 'pr', 'flg', 'ibyt', 'ipkt']
      const result = detectColumnMapping(headers)

      expect(result.success).toBe(true)
      expect(result.mapping?.IPV4_SRC_ADDR).toBe('sa')
      expect(result.mapping?.IPV4_DST_ADDR).toBe('da')
      expect(result.mapping?.PROTOCOL).toBe('pr')
    })

    it('handles Zeek/Bro format approximation', () => {
      const headers = ['id.orig_h', 'id.resp_h', 'id.orig_p', 'id.resp_p', 'proto']
      const result = detectColumnMapping(headers)

      // Note: Zeek format might not be fully supported
      // This test documents current behavior
      expect(result.success).toBe(false)
    })
  })
})
