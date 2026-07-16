import SuccessResult from './SuccessResult'
import WarningResult from './WarningResult'
import ErrorResult from './ErrorResult'

/**
 * Dispatches to the right result component based on backend response kind.
 * Result is null when no diagnosis has been run yet.
 */
export default function ResultPanel({ result }) {
  if (!result) return null

  if (result.kind === 'success') return <SuccessResult data={result.data} />
  if (result.kind === 'warning') return <WarningResult detail={result.detail} />
  if (result.kind === 'error') return <ErrorResult message={result.message} />

  return null
}
