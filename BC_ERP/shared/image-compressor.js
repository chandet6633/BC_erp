/**
 * BC AutoXperience — Client-Side Image Compressor
 * ════════════════════════════════════════════════
 * Resizes and compresses images in the browser before upload.
 * Saves NocoDB storage space. Uses HTML5 Canvas API — no dependencies.
 *
 * Targets: payment proof photos, shop logo, QR code uploads.
 * Default: max 1200px, JPEG at 70% quality.
 */

/**
 * Compress an image File/Blob to a smaller size.
 * @param {File|Blob} file - Input image file
 * @param {object} options
 * @param {number} [options.maxWidth=1200] - Max output width in pixels
 * @param {number} [options.maxHeight=1200] - Max output height in pixels
 * @param {number} [options.quality=0.7] - JPEG quality 0-1
 * @param {string} [options.outputType='image/jpeg'] - Output MIME type
 * @returns {Promise<{ blob: Blob, dataUrl: string, originalSize: number, compressedSize: number, ratio: string }>}
 */
export async function compressImage(file, options = {}) {
    const {
        maxWidth = 1200,
        maxHeight = 1200,
        quality = 0.7,
        outputType = 'image/jpeg'
    } = options

    if (!file || !file.type.startsWith('image/')) {
        throw new Error(`compressImage: "${file?.name || 'unknown'}" is not a valid image file`)
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            const img = new Image()

            img.onload = () => {
                // Calculate scaled dimensions (maintain aspect ratio, don't upscale)
                let { width, height } = img
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height)
                    width = Math.round(width * ratio)
                    height = Math.round(height * ratio)
                }

                // Draw to canvas
                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')

                // Handle EXIF orientation for mobile photos (rotate if needed)
                ctx.save()
                ctx.drawImage(img, 0, 0, width, height)
                ctx.restore()

                // Export as blob
                canvas.toBlob((blob) => {
                    if (!blob) return reject(new Error('Canvas toBlob failed'))

                    const reader2 = new FileReader()
                    reader2.onload = (e2) => {
                        const dataUrl = e2.target.result
                        const originalSize = file.size
                        const compressedSize = blob.size
                        const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1) + '% smaller'

                        resolve({ blob, dataUrl, originalSize, compressedSize, ratio })
                    }
                    reader2.readAsDataURL(blob)
                }, outputType, quality)
            }

            img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`))
            img.src = e.target.result
        }

        reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`))
        reader.readAsDataURL(file)
    })
}

/**
 * Compress an image and return it as a base64 data URL string.
 * @param {File|Blob} file
 * @param {object} options - Same as compressImage
 * @returns {Promise<string>} base64 data URL
 */
export async function compressImageToBase64(file, options = {}) {
    const result = await compressImage(file, options)
    return result.dataUrl
}

/**
 * Create an image preview thumbnail inside a DOM element.
 * Compresses the image and renders a preview <img> tag.
 * @param {File|Blob} file
 * @param {HTMLElement} containerEl - DOM element to inject preview into
 * @param {object} options - Compression options + optional previewStyle
 * @returns {Promise<{ dataUrl: string, blob: Blob }>}
 */
export async function createImagePreview(file, containerEl, options = {}) {
    const {
        previewStyle = 'max-width:100%;max-height:200px;border-radius:8px;object-fit:contain;',
        ...compressOptions
    } = options

    const result = await compressImage(file, compressOptions)

    // Clear previous preview
    containerEl.innerHTML = ''

    // Render preview
    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'position:relative;display:inline-block;margin-top:8px;'

    const img = document.createElement('img')
    img.src = result.dataUrl
    img.style.cssText = previewStyle
    img.alt = 'Image preview'

    const info = document.createElement('div')
    info.style.cssText = 'font-size:11px;color:#94a3b8;margin-top:4px;'
    info.textContent = `${(result.compressedSize / 1024).toFixed(0)} KB (${result.ratio})`

    wrapper.appendChild(img)
    wrapper.appendChild(info)
    containerEl.appendChild(wrapper)

    return { dataUrl: result.dataUrl, blob: result.blob }
}

/**
 * Create a file input button with built-in compression + preview.
 * Returns a helper object to get the compressed result later.
 *
 * @param {object} opts
 * @param {HTMLElement} opts.triggerEl - Button element that triggers file picker
 * @param {HTMLElement} opts.previewEl - Container element for preview
 * @param {object} [opts.compressOptions] - Passed to compressImage
 * @returns {{ getResult: () => { dataUrl: string, blob: Blob } | null }}
 */
export function createImageUploader(opts = {}) {
    const { triggerEl, previewEl, compressOptions = {} } = opts
    let result = null

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment' // prefer rear camera on mobile
    input.style.display = 'none'
    document.body.appendChild(input)

    input.addEventListener('change', async () => {
        const file = input.files[0]
        if (!file) return

        try {
            if (triggerEl) {
                triggerEl.disabled = true
                triggerEl.textContent = 'กำลังประมวลผล...'
            }
            result = await createImagePreview(file, previewEl, compressOptions)
        } catch (e) {
            console.error('[ImageUploader]', e.message)
            if (previewEl) previewEl.innerHTML = `<span style="color:#ef4444;font-size:12px;">ไม่สามารถโหลดภาพได้: ${e.message}</span>`
        } finally {
            if (triggerEl) {
                triggerEl.disabled = false
                triggerEl.textContent = '📷 เลือกรูป'
            }
        }
    })

    if (triggerEl) {
        triggerEl.addEventListener('click', () => input.click())
    }

    return {
        /** @returns {{ dataUrl: string, blob: Blob } | null} */
        getResult: () => result,
        /** Reset uploader state */
        reset: () => {
            result = null
            if (previewEl) previewEl.innerHTML = ''
            input.value = ''
        },
        /** Programmatically trigger the file picker */
        open: () => input.click()
    }
}
