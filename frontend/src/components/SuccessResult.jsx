import ConfidenceBar from './ConfidenceBar'

export default function SuccessResult({ data }) {
  const isHealthy = data.is_healthy
  const containerClass = isHealthy
    ? 'bg-green-50 border-l-4 border-green-700'
    : 'bg-orange-50 border-l-4 border-orange-600'
  const icon = isHealthy ? '✅' : '⚠️'
  const status = isHealthy ? 'Healthy' : 'Disease detected'

  return (
    <div className={`p-4 rounded-xl ${containerClass} mt-5`}>
      <div className="font-semibold text-lg">
        {icon} {data.plant} — {data.condition}
      </div>
      <div className="text-slate-600 text-sm mt-1">
        {status} · {(data.confidence * 100).toFixed(1)}% confidence
      </div>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-4 mb-1">
        Top predictions
      </div>
      {data.top_predictions.map((p, i) => (
        <ConfidenceBar key={i} label={p.label} confidence={p.confidence} />
      ))}
    </div>
  )
}
