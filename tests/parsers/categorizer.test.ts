import { describe, it, expect } from 'vitest'
import { categorize } from '../../src/parsers/categorizer'

describe('categorize', () => {
  it('matches supermarket by keyword', () => {
    expect(categorize('שופרסל דיל')).toBe('מזון ותואלטיקה')
  })
  it('matches fuel station', () => {
    expect(categorize('תחנת דלק פז')).toBe('דלק')
  })
  it('matches Spotify exactly', () => {
    expect(categorize('SPOTIFY')).toBe('Spotify')
  })
  it('matches highway 6', () => {
    expect(categorize('כביש 6')).toBe('כביש 6')
  })
  it('matches clothing store', () => {
    expect(categorize('זארה בגדים')).toBe('בגדים')
  })
  it('returns לא מסווג for unknown', () => {
    expect(categorize('ACME CORP XYZ')).toBe('לא מסווג')
  })
  it('is case-insensitive for latin', () => {
    expect(categorize('spotify')).toBe('Spotify')
  })
  it('matches custom mapping over keyword', () => {
    expect(categorize('MY CUSTOM SHOP', { 'MY CUSTOM SHOP': 'בילוי' })).toBe('בילוי')
  })
})
