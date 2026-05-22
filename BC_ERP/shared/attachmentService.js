/**
 * Attachment Service — Reusable File Upload & Display
 * ════════════════════════════════════════════════════
 * Shared service for uploading files to NocoDB storage
 * via the Express API upload proxy.
 *
 * Usage:
 *   import { uploadFiles, renderAttachments, renderUploadZone } from '@shared/attachmentService.js'
 *
 *   // Upload files from an input element
 *   const metadata = await uploadFiles(fileInput.files);
 *
 *   // Save with a record
 *   await pb.collection('financial_ledger').create({ ...data, attachments: JSON.stringify(metadata) });
 *
 *   // Render thumbnails
 *   container.innerHTML = renderAttachments(record.attachments);
 */

import { getAuthToken } from './nocodb-adapter.js'

const UPLOAD_URL = '/api/upload'

/**
 * Compress an image file using canvas resize.
 * @param {File} file — original file
 * @param {number} maxWidth — max width in pixels (default: 1200)
 * @param {number} quality — JPEG quality 0-1 (default: 0.7)
 * @returns {Promise<File>} — compressed file (or original if not an image)
 */
export async function compressImage(file, maxWidth = 1200, quality = 0.7) {
    if (!file.type.startsWith('image/')) return file
    return new Promise(resolve => {
        const img = new Image()
        const reader = new FileReader()
        reader.onload = e => {
            if (typeof e.target.result !== 'string') { resolve(file); return }
            img.onload = () => {
                const canvas = document.createElement('canvas')
                let { width, height } = img
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width)
                    width = maxWidth
                }
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0, width, height)
                canvas.toBlob(blob => {
                    if (blob && blob.size < file.size) {
                        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
                    } else {
                        resolve(file)
                    }
                }, 'image/jpeg', quality)
            }
            img.src = e.target.result
        }
        reader.readAsDataURL(file)
    })
}

/**
 * Upload one or more files to NocoDB storage via the API proxy.
 * Files are compressed if they are images before uploading.
 *
 * @param {FileList|File[]} files — files to upload
 * @returns {Promise<Array>} — array of NocoDB attachment metadata objects
 */
export async function uploadFiles(files) {
    if (!files || files.length === 0) return []

    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i])
        formData.append('file', compressed)
    }

    const token = getAuthToken()
    const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
    })

    if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Upload failed: ${errText}`)
    }

    return res.json()
}

/**
 * Parse an attachments field value (JSON string or array).
 * @param {string|Array|null} value
 * @returns {Array}
 */
export function parseAttachments(value) {
    if (!value) return []
    if (Array.isArray(value)) return value
    try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

/**
 * Render attachment thumbnails as HTML.
 * @param {string|Array|null} attachmentsValue — JSON string or array from record
 * @returns {string} — HTML string with clickable thumbnails
 */
export function renderAttachments(attachmentsValue) {
    const items = parseAttachments(attachmentsValue)
    if (items.length === 0) return ''

    return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
        ${items.map(att => {
            let url = att.signedUrl || att.url || att.path || ''
            if (url && !url.startsWith('http') && !url.startsWith('/')) {
                url = '/' + url;
            }
            const title = att.title || att.fileName || 'attachment'
            const isImage = (att.mimetype || '').startsWith('image/')
            if (isImage) {
                return `<img src="${url}" alt="${title}" 
                    style="width:40px;height:40px;object-fit:cover;border-radius:6px;border:1px solid var(--surface-200);cursor:pointer" 
                    onclick="window.showImage?.('${url}')" title="${title}" />`
            }
            return `<a href="${url}" target="_blank" title="${title}" 
                style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;background:var(--surface-100);border-radius:6px;font-size:0.7rem;color:var(--surface-600);text-decoration:none">
                📎 ${title}
            </a>`
        }).join('')}
    </div>`
}

/**
 * Render a styled file upload zone with drag-and-drop.
 * @param {string} inputId — ID for the file input element
 * @param {object} options
 * @param {string} options.accept — accepted file types (default: 'image/*')
 * @param {boolean} options.multiple — allow multiple files (default: true)
 * @returns {string} — HTML string
 */
export function renderUploadZone(inputId, options = {}) {
    const accept = options.accept || 'image/*'
    const multiple = options.multiple !== false ? 'multiple' : ''

    return `
        <div class="upload-zone" id="${inputId}_zone" 
             style="border:2px dashed var(--surface-200);border-radius:var(--radius-lg);padding:var(--space-4);text-align:center;cursor:pointer;transition:all 0.2s;background:var(--surface-50)"
             onclick="document.getElementById('${inputId}').click()">
            <input type="file" id="${inputId}" accept="${accept}" ${multiple}
                   style="display:none" onchange="window._previewFiles?.('${inputId}')" />
            <div style="color:var(--surface-400);font-size:var(--text-sm)">
                <span class="material-icons-outlined" style="font-size:2rem;display:block;margin-bottom:4px">cloud_upload</span>
                คลิกหรือลากไฟล์มาวาง
            </div>
            <div id="${inputId}_preview" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:var(--space-2);justify-content:center"></div>
        </div>
    `
}

/**
 * Setup drag-and-drop on an upload zone.
 * Call this after the zone is rendered in the DOM.
 * @param {string} inputId — same ID used in renderUploadZone
 */
export function setupDropZone(inputId) {
    const zone = document.getElementById(`${inputId}_zone`)
    if (!zone) return

    const highlight = () => { zone.style.borderColor = 'var(--primary-500)'; zone.style.background = 'var(--primary-50)' }
    const unhighlight = () => { zone.style.borderColor = 'var(--surface-200)'; zone.style.background = 'var(--surface-50)' }

    zone.addEventListener('dragover', e => { e.preventDefault(); highlight() })
    zone.addEventListener('dragleave', unhighlight)
    zone.addEventListener('drop', e => {
        e.preventDefault()
        unhighlight()
        const input = document.getElementById(inputId)
        if (input && e.dataTransfer.files.length) {
            input.files = e.dataTransfer.files
            window._previewFiles?.(inputId)
        }
    })

    // Global preview helper
    window._previewFiles = (id) => {
        const input = document.getElementById(id)
        const preview = document.getElementById(`${id}_preview`)
        if (!input || !preview) return

        preview.innerHTML = ''
        Array.from(input.files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img')
                img.style.cssText = 'width:60px;height:60px;object-fit:cover;border-radius:8px;border:2px solid var(--surface-200)'
                const reader = new FileReader()
                reader.onload = e => { img.src = e.target.result }
                reader.readAsDataURL(file)
                preview.appendChild(img)
            } else {
                const badge = document.createElement('span')
                badge.style.cssText = 'padding:4px 8px;background:var(--surface-100);border-radius:6px;font-size:0.7rem;color:var(--surface-600)'
                badge.textContent = `📎 ${file.name}`
                preview.appendChild(badge)
            }
        })
    }
}
