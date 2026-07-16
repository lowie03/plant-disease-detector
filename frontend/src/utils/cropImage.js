/**
 * Turns react-easy-crop's pixel-crop rectangle into an actual cropped File,
 * by drawing the source image onto a canvas at that rectangle and reading
 * the result back out as a blob. react-easy-crop only reports crop
 * coordinates — it never touches the actual image data itself.
 */

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', reject)
    image.src = src
  })
}

export async function getCroppedImageFile(imageSrc, croppedAreaPixels, fileName) {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = croppedAreaPixels.width
  canvas.height = croppedAreaPixels.height
  const ctx = canvas.getContext('2d')

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
  )

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
  return new File([blob], fileName, { type: 'image/jpeg' })
}
