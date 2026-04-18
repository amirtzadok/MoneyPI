import { useState, useCallback } from 'react'
import { useDrive } from '../drive/useDrive'
import { useMonthData } from '../drive/useMonthData'
import type { AppConfig, MerchantMappings, CashEntry, MonthFolder, MonthData } from '../drive/types'

const DEFAULT_CONFIG: AppConfig = {
  claudeApiKey: '',
  budgets: {},
}

export function useAppData() {
  const {
    ensureAppFolder, readConfig, writeConfig,
    readMappings, writeMappings,
    readCashEntries, writeCashEntries,
  } = useDrive()
  const { listMonthFolders, loadMonthData, loading: monthLoading } = useMonthData()

  const [initialized, setInitialized] = useState(false)
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [mappings, setMappings] = useState<MerchantMappings>({})
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([])
  const [folders, setFolders] = useState<MonthFolder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<MonthFolder | null>(null)
  const [monthData, setMonthData] = useState<MonthData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const initialize = useCallback(async () => {
    try {
      await ensureAppFolder()
      const [cfg, map, cash, fols] = await Promise.all([
        readConfig(),
        readMappings(),
        readCashEntries(),
        listMonthFolders(),
      ])
      setConfig(cfg ?? DEFAULT_CONFIG)
      setMappings(map)
      setCashEntries(cash)
      setFolders(fols)
      if (fols.length > 0) {
        const lastFolder = fols[fols.length - 1]
        setSelectedFolder(lastFolder)
        try {
          const data = await loadMonthData(lastFolder, map)
          setMonthData(data)
        } catch {
          // non-fatal
        }
      }
      setInitialized(true)
    } catch (e) {
      setError(String(e))
      setInitialized(true)
    }
  }, [ensureAppFolder, readConfig, readMappings, readCashEntries, listMonthFolders, loadMonthData])

  const loadMonth = useCallback(async (folder?: MonthFolder) => {
    const target = folder ?? selectedFolder
    if (!target) return
    try {
      const data = await loadMonthData(target, mappings)
      setMonthData(data)
    } catch (e) {
      setError(String(e))
    }
  }, [selectedFolder, mappings, loadMonthData])

  const saveConfig = useCallback(async (cfg: AppConfig) => {
    await writeConfig(cfg)
    setConfig(cfg)
  }, [writeConfig])

  const saveMappings = useCallback(async (m: MerchantMappings) => {
    await writeMappings(m)
    setMappings(m)
  }, [writeMappings])

  const addCashEntry = useCallback(async (entry: CashEntry) => {
    const updated = [...cashEntries, entry]
    await writeCashEntries(updated)
    setCashEntries(updated)
  }, [cashEntries, writeCashEntries])

  const deleteCashEntry = useCallback(async (id: string) => {
    const updated = cashEntries.filter(e => e.id !== id)
    await writeCashEntries(updated)
    setCashEntries(updated)
  }, [cashEntries, writeCashEntries])

  return {
    initialized, error, monthLoading,
    config, mappings, cashEntries,
    folders, selectedFolder, setSelectedFolder,
    monthData,
    initialize, loadMonth,
    saveConfig, saveMappings, addCashEntry, deleteCashEntry,
  }
}
