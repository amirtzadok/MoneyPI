import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DriveClient } from '../../src/drive/driveClient'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('DriveClient', () => {
  let client: DriveClient

  beforeEach(() => {
    client = new DriveClient('test-token-123')
    mockFetch.mockReset()
  })

  it('lists files with correct auth header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: [] }),
    })
    await client.listFiles('parent-id-123')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('parent-id-123'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token-123',
        }),
      })
    )
  })

  it('readJson parses file content correctly', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [{ id: 'file-abc', name: 'test.json' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hello: 'world' }),
      })
    const result = await client.readJson('parent-id', 'test.json')
    expect(result).toEqual({ hello: 'world' })
  })

  it('readJson returns null when file not found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: [] }),
    })
    const result = await client.readJson('parent-id', 'missing.json')
    expect(result).toBeNull()
  })
})
