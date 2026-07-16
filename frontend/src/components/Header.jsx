export default function Header() {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🌿</span>
        <h1 className="text-2xl font-semibold text-green-900">
          Plant Disease Detector
        </h1>
      </div>
      <p className="text-slate-600 text-sm mt-1">
        Upload a photo of a single leaf to get an AI-assisted diagnosis.
      </p>
    </header>
  )
}
