import { useState, useEffect, useMemo } from 'react'
import Header from './components/Header'
import ApiUrlInput from './components/ApiUrlInput'
import ImageUploader from './components/ImageUploader'
import ImageCropper from './components/ImageCropper'
import DiagnoseButton from './components/DiagnoseButton'
import ResultPanel from './components/ResultPanel'
import Disclaimer from './components/Disclaimer'
import { predictDisease } from './api/predict'

export default function App() {
  const [apiUrl, setApiUrl] = useState(
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
  )
  const [rawFile, setRawFile] = useState(null)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  // Derive preview URLs from their source files; only the cleanup is a side effect.
  const rawPreviewUrl = useMemo(() => (rawFile ? URL.createObjectURL(rawFile) : null), [rawFile])
  useEffect(() => {
    return () => {
      if (rawPreviewUrl) URL.revokeObjectURL(rawPreviewUrl)
    }
  }, [rawPreviewUrl])

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFileSelected = (newFile) => {
    setRawFile(newFile)
    setResult(null)
  }

  const handleCropConfirm = (croppedFile) => {
    setFile(croppedFile)
    setRawFile(null)
  }

  const handleCropSkip = () => {
    setFile(rawFile)
    setRawFile(null)
  }

  const handleCropCancel = () => {
    setRawFile(null)
  }

  const handleDiagnose = async () => {
    if (!file) return
    setLoading(true)
    setResult(null)
    try {
      const res = await predictDisease(apiUrl, file)
      setResult(res)
    } catch (err) {
      setResult({
        kind: 'error',
        message: err.message || 'Network error. Is the API running?'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/50 to-green-100/50 py-8 px-4 flex justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-xl w-full">
        <Header />
        <ApiUrlInput value={apiUrl} onChange={setApiUrl} />
        {rawFile ? (
          <ImageCropper
            imageSrc={rawPreviewUrl}
            fileName={rawFile.name}
            onCancel={handleCropCancel}
            onConfirm={handleCropConfirm}
            onSkip={handleCropSkip}
          />
        ) : (
          <ImageUploader
            onFileSelected={handleFileSelected}
            previewUrl={previewUrl}
          />
        )}
        <DiagnoseButton
          onClick={handleDiagnose}
          disabled={!file || !!rawFile}
          loading={loading}
        />
        <ResultPanel result={result} />
        <Disclaimer />
      </div>
    </div>
  )
}
