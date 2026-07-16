/**
 * API client for the Plant Disease Detector backend.
 * Keeping this separate from components makes it easy to mock in tests
 * and swap backend URLs without touching UI code.
 */

export async function predictDisease(apiUrl, file) {
  const formData = new FormData()
  formData.append('file', file)

  const base = apiUrl.replace(/\/$/, '')
  const response = await fetch(`${base}/predict`, {
    method: 'POST',
    body: formData,
  })

  const data = await response.json()

  // Normalize responses into a consistent shape for the UI to consume.
  // Backend returns 200 for success, 422 for gate rejections, other codes for errors.
  if (response.status === 200) {
    return { kind: 'success', data }
  }
  if (response.status === 422) {
    return { kind: 'warning', detail: data.detail }
  }
  return { kind: 'error', message: data.detail || `Request failed (${response.status})` }
}
