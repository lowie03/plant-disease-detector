export default function ErrorResult({ message }) {
  return (
    <div className="p-4 rounded-xl bg-red-50 border-l-4 border-red-600 mt-5">
      <div className="font-semibold">❌ Error</div>
      <div className="text-sm mt-1">
        {typeof message === 'string' ? message : JSON.stringify(message)}
      </div>
    </div>
  )
}
