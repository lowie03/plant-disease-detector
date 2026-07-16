import ConfidenceBar from './ConfidenceBar'

export default function WarningResult({ detail }) {
  // detail can be a string OR an object depending on which backend gate rejected
  if (typeof detail === 'string') {
    return (
      <div className="p-4 rounded-xl bg-amber-50 border-l-4 border-amber-600 mt-5">
        <div className="font-semibold">⚠️ {detail}</div>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-xl bg-amber-50 border-l-4 border-amber-600 mt-5">
      <div className="font-semibold">⚠️ {detail.message}</div>

      {detail.imagenet_top5 && (
        <>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-4 mb-1">
            What the system saw instead
          </div>
          {detail.imagenet_top5.map((p, i) => (
            <ConfidenceBar key={i} label={p.label} confidence={p.confidence} />
          ))}
        </>
      )}

      {detail.top_predictions && (
        <>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-4 mb-1">
            Best guesses (not confident enough to diagnose)
          </div>
          {detail.top_predictions.map((p, i) => (
            <ConfidenceBar key={i} label={p.label} confidence={p.confidence} />
          ))}
        </>
      )}
    </div>
  )
}
