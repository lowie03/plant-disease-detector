export default function ApiUrlInput({ value, onChange }) {
  return (
    <div className="bg-green-50 rounded-lg p-3 mb-4">
      <label className="block text-xs text-slate-600 mb-1">API URL</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm font-mono"
      />
    </div>
  )
}
