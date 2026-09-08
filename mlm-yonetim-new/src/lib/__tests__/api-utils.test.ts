import { describe, it, expect } from 'vitest'
import { fileUrl } from '../api'

describe('fileUrl', () => {
  it('onceki /api sonekini kirpar ve yolu birlestirir', () => {
    const u = fileUrl('/uploads/a.png')
    expect(u).not.toContain('/api/')
    expect(u.endsWith('/uploads/a.png')).toBe(true)
  })

  it('bos deger icin bos doner', () => {
    expect(fileUrl(null)).toBe('')
    expect(fileUrl('')).toBe('')
  })
})
