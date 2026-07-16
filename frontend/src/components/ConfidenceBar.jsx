export default function ConfidenceBar({ label, confidence }) {
  const pct = (confidence * 100).toFixed(1)
  // Clean up backend class names: "Tomato___Early_blight" -> "Tomato — Early blight"
  const cleanLabel = label.replace(/___/g, ' — ').replace(/_/g, ' ')

  return (
    <div className="py-1.5 text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="leading-snug">{cleanLabel}</span>
        <span className="shrink-0 text-right tabular-nums text-slate-500">{pct}%</span>
      </div>
      <div className="h-2 bg-white/60 rounded-md overflow-hidden mt-1">
        <div
          className="h-full bg-green-700 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
