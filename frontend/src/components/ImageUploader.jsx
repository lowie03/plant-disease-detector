import { useState, useRef } from 'react'

export default function ImageUploader({ onFileSelected, previewUrl }) {
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleFiles = (files) => {
    if (files && files.length > 0) {
      onFileSelected(files[0])
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <>
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
          transition-colors duration-200 mb-4
          ${dragging
            ? 'border-green-700 bg-green-50'
            : 'border-slate-300 hover:border-green-700 hover:bg-green-50/50'}
        `}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-64 mx-auto rounded-lg"
          />
        ) : (
          <>
            <div className="text-4xl mb-2 opacity-50">📷</div>
            <div className="text-slate-500 text-sm">
              Click or drag a leaf photo here
            </div>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
    </>
  )
}
