import type { MonthFolder } from '../drive/types'

const MONTH_NAMES = ['', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

interface Props {
  folders: MonthFolder[]
  selected: MonthFolder | null
  onSelect: (folder: MonthFolder) => void
  onLoad: () => void
  loading: boolean
}

export function MonthSelector({ folders, selected, onSelect, onLoad, loading }: Props) {
  return (
    <div className="flex items-center gap-3">
      <select
        value={selected?.id ?? ''}
        onChange={e => {
          const f = folders.find(f => f.id === e.target.value)
          if (f) onSelect(f)
        }}
        className="bg-[#2d3148] border border-[#3d4268] text-slate-200 px-3 py-1.5 rounded-lg text-sm"
      >
        <option value="">בחר חודש</option>
        {folders.map(f => (
          <option key={f.id} value={f.id}>
            {MONTH_NAMES[f.month]} {f.year}
          </option>
        ))}
      </select>
      <button
        onClick={onLoad}
        disabled={!selected || loading}
        className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm"
      >
        {loading ? 'טוען...' : '📂 טען נתונים'}
      </button>
    </div>
  )
}
