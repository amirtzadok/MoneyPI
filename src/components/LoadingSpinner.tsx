export function LoadingSpinner({ label = 'טוען...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 text-slate-400 p-4">
      <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
