export default function DiagnoseButton({ onClick, disabled, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="
        w-full py-3 rounded-lg font-medium text-white
        bg-green-700 hover:bg-green-800
        disabled:bg-green-700/40 disabled:cursor-not-allowed
        transition-colors
      "
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Diagnosing...
        </span>
      ) : (
        'Diagnose'
      )}
    </button>
  )
}
