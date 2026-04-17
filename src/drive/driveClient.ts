const BASE = 'https://www.googleapis.com'

export class DriveClient {
  constructor(private token: string) {}

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    }
  }

  async listFiles(parentId: string): Promise<{ id: string; name: string }[]> {
    const q = encodeURIComponent(`'${parentId}' in parents and trashed = false`)
    const res = await fetch(
      `${BASE}/drive/v3/files?q=${q}&fields=files(id,name,mimeType)`,
      { headers: this.headers() }
    )
    if (!res.ok) throw new Error(`Drive list failed: ${res.status}`)
    const data = await res.json()
    return data.files ?? []
  }

  async findFile(parentId: string, name: string): Promise<string | null> {
    const files = await this.listFiles(parentId)
    return files.find(f => f.name === name)?.id ?? null
  }

  async readJson<T>(parentId: string, filename: string): Promise<T | null> {
    const fileId = await this.findFile(parentId, filename)
    if (!fileId) return null
    const res = await fetch(
      `${BASE}/drive/v3/files/${fileId}?alt=media`,
      { headers: this.headers() }
    )
    if (!res.ok) return null
    return res.json() as Promise<T>
  }

  async writeJson(parentId: string, filename: string, data: unknown): Promise<void> {
    const existingId = await this.findFile(parentId, filename)
    const body = JSON.stringify(data, null, 2)

    if (existingId) {
      const form = new FormData()
      form.append('metadata', new Blob(
        [JSON.stringify({ name: filename, mimeType: 'application/json' })],
        { type: 'application/json' }
      ))
      form.append('file', new Blob([body], { type: 'application/json' }))
      await fetch(
        `${BASE}/upload/drive/v3/files/${existingId}?uploadType=multipart`,
        { method: 'PATCH', headers: { Authorization: `Bearer ${this.token}` }, body: form }
      )
    } else {
      const form = new FormData()
      form.append('metadata', new Blob(
        [JSON.stringify({ name: filename, mimeType: 'application/json', parents: [parentId] })],
        { type: 'application/json' }
      ))
      form.append('file', new Blob([body], { type: 'application/json' }))
      await fetch(
        `${BASE}/upload/drive/v3/files?uploadType=multipart`,
        { method: 'POST', headers: { Authorization: `Bearer ${this.token}` }, body: form }
      )
    }
  }

  async ensureFolder(name: string, parentId?: string): Promise<string> {
    const conditions = [
      `name='${name}'`,
      `mimeType='application/vnd.google-apps.folder'`,
      `trashed=false`,
    ]
    if (parentId) conditions.push(`'${parentId}' in parents`)
    const q = encodeURIComponent(conditions.join(' and '))
    const res = await fetch(
      `${BASE}/drive/v3/files?q=${q}&fields=files(id,name)`,
      { headers: this.headers() }
    )
    const data = await res.json()
    if (data.files?.length > 0) return data.files[0].id

    const body: Record<string, unknown> = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    }
    if (parentId) body.parents = [parentId]
    const create = await fetch(`${BASE}/drive/v3/files`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    })
    const folder = await create.json()
    return folder.id
  }
}
