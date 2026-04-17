type Tab = 'overview' | 'transactions' | 'budget' | 'cash' | 'insights'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'סקירה' },
  { id: 'transactions', label: 'עסקאות' },
  { id: 'budget', label: 'תקציב' },
  { id: 'cash', label: 'מזומן' },
  { id: 'insights', label: '✨ AI' },
]

export type { Tab }

export function Nav({ active, onChange }: Props) {
  return (
    <div className="flex gap-1">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            active === tab.id
              ? 'bg-violet-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
