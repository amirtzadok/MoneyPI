import { useState, useCallback } from 'react'
import { useAuth } from '../auth/useAuth'
import { DriveClient } from './driveClient'
import {
  APP_FOLDER_NAME, AppConfig, MerchantMappings, CashEntry,
  CONFIG_FILE, MAPPINGS_FILE, CASH_FILE,
} from './types'

export function useDrive() {
  const { accessToken } = useAuth()
  const [appFolderId, setAppFolderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getClient = useCallback(() => {
    if (!accessToken) throw new Error('Not authenticated')
    return new DriveClient(accessToken)
  }, [accessToken])

  const ensureAppFolder = useCallback(async (): Promise<string> => {
    if (appFolderId) return appFolderId
    const client = getClient()
    const id = await client.ensureFolder(APP_FOLDER_NAME)
    setAppFolderId(id)
    return id
  }, [appFolderId, getClient])

  const readConfig = useCallback(async (): Promise<AppConfig | null> => {
    setLoading(true)
    setError(null)
    try {
      const folderId = await ensureAppFolder()
      return await getClient().readJson<AppConfig>(folderId, CONFIG_FILE)
    } catch (e) {
      setError(String(e))
      return null
    } finally {
      setLoading(false)
    }
  }, [ensureAppFolder, getClient])

  const writeConfig = useCallback(async (config: AppConfig): Promise<void> => {
    const folderId = await ensureAppFolder()
    await getClient().writeJson(folderId, CONFIG_FILE, config)
  }, [ensureAppFolder, getClient])

  const readMappings = useCallback(async (): Promise<MerchantMappings> => {
    const folderId = await ensureAppFolder()
    return (await getClient().readJson<MerchantMappings>(folderId, MAPPINGS_FILE)) ?? {}
  }, [ensureAppFolder, getClient])

  const writeMappings = useCallback(async (mappings: MerchantMappings): Promise<void> => {
    const folderId = await ensureAppFolder()
    await getClient().writeJson(folderId, MAPPINGS_FILE, mappings)
  }, [ensureAppFolder, getClient])

  const readCashEntries = useCallback(async (): Promise<CashEntry[]> => {
    const folderId = await ensureAppFolder()
    return (await getClient().readJson<CashEntry[]>(folderId, CASH_FILE)) ?? []
  }, [ensureAppFolder, getClient])

  const writeCashEntries = useCallback(async (entries: CashEntry[]): Promise<void> => {
    const folderId = await ensureAppFolder()
    await getClient().writeJson(folderId, CASH_FILE, entries)
  }, [ensureAppFolder, getClient])

  return {
    loading, error,
    ensureAppFolder,
    readConfig, writeConfig,
    readMappings, writeMappings,
    readCashEntries, writeCashEntries,
  }
}
