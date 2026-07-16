import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { getCroppedImageFile } from '../utils/cropImage'

/**
 * Lets the user crop down to just the leaf before it's sent to the API.
 * Tighter crops push the image closer to the training data's framing,
 * which noticeably improves results on busy/cluttered photos.
 */
export default function ImageCropper({ imageSrc, fileName, onCancel, onConfirm, onSkip }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [working, setWorking] = useState(false)

  const handleCropComplete = useCallback((_croppedArea, pixels) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setWorking(true)
    try {
      const croppedFile = await getCroppedImageFile(imageSrc, croppedAreaPixels, fileName)
      onConfirm(croppedFile)
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="mb-4">
      <div className="relative w-full h-72 bg-slate-900 rounded-xl overflow-hidden">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
        />
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs text-slate-500 w-10">Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1"
        />
      </div>

      <p className="text-xs text-slate-500 mt-2">
        Drag and zoom to frame just the leaf, then confirm. Tighter crops give more accurate results.
      </p>

      <div className="flex gap-2 mt-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSkip}
          className="flex-1 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Use full image
        </button>
        <button
          onClick={handleConfirm}
          disabled={working || !croppedAreaPixels}
          className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-green-700 hover:bg-green-800 disabled:bg-green-700/40 disabled:cursor-not-allowed transition-colors"
        >
          {working ? 'Cropping…' : 'Confirm crop'}
        </button>
      </div>
    </div>
  )
}
