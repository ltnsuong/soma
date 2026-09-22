import { describe, it, expect } from 'vitest'
import { codeFromScan, connectLink } from './scanTarget'

describe('reading our own connect link', () => {
  it('reads the link the app puts in the QR', () => {
    expect(codeFromScan('https://mysoma.site/?add=A95CA4')).toBe('A95CA4')
  })

  it('reads it without a scheme, as hand-made QRs often are', () => {
    expect(codeFromScan('mysoma.site/?add=A95CA4')).toBe('A95CA4')
  })

  it('reads it with other query parameters around it', () => {
    expect(codeFromScan('https://mysoma.site/?utm=qr&add=A95CA4&ref=x')).toBe('A95CA4')
  })

  it('reads it from the fragment', () => {
    expect(codeFromScan('https://mysoma.site/#add=A95CA4')).toBe('A95CA4')
  })

  it('is case-insensitive about the code', () => {
    expect(codeFromScan('https://mysoma.site/?add=a95ca4')).toBe('A95CA4')
  })

  it('survives a percent-encoded value', () => {
    expect(codeFromScan('https://mysoma.site/?add=%41%39%35%43%41%34')).toBe('A95CA4')
  })

  it('round-trips with connectLink', () => {
    expect(codeFromScan(connectLink('1F4207'))).toBe('1F4207')
  })
})

describe('a code typed or pasted by hand', () => {
  it('accepts a bare code', () => {
    expect(codeFromScan('A95CA4')).toBe('A95CA4')
  })

  it('accepts it lowercase and with stray spaces', () => {
    expect(codeFromScan('  a95ca4 ')).toBe('A95CA4')
  })

  it('trims a longer id down to the six-character code', () => {
    expect(codeFromScan('A95CA410')).toBe('A95CA4')
  })
})

describe('what it refuses', () => {
  it('refuses another site carrying ?add=', () => {
    // Otherwise any QR anywhere could make the app look a stranger up.
    expect(codeFromScan('https://evil.example/?add=A95CA4')).toBeNull()
  })

  it('refuses an ordinary QR', () => {
    expect(codeFromScan('https://example.com/menu')).toBeNull()
    expect(codeFromScan('WIFI:S=cafe;T=WPA;P=hunter2;;')).toBeNull()
  })

  it('refuses a non-hex code', () => {
    // The code is the leading hex of a uuid, so these cannot be real.
    expect(codeFromScan('ZZZZZZ')).toBeNull()
    expect(codeFromScan('https://mysoma.site/?add=hello!')).toBeNull()
  })

  it('refuses something too short to be a code', () => {
    expect(codeFromScan('A9')).toBeNull()
  })

  it('handles nothing at all without throwing', () => {
    // onBarcodeScanned fires many times a second; this must never throw.
    expect(codeFromScan('')).toBeNull()
    expect(codeFromScan(null)).toBeNull()
    expect(codeFromScan(undefined)).toBeNull()
    expect(codeFromScan('   ')).toBeNull()
  })
})
