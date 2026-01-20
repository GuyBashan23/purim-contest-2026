/**
 * Client-side image compression utility
 * Compresses images before upload to reduce bandwidth and storage
 * Uses browser-image-compression library with Web Worker support
 */

import imageCompression from 'browser-image-compression'

interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'image/jpeg' | 'image/png' | 'image/webp'
  maxSizeKB?: number
}

// Internal options for browser-image-compression
interface BrowserCompressionOptions {
  maxSizeMB: number
  maxWidthOrHeight: number
  useWebWorker: boolean
  fileType: string
  initialQuality: number
}

const DEFAULT_OPTIONS: BrowserCompressionOptions = {
  maxSizeMB: 0.8, // Max 800KB (0.8MB) - plenty for phones
  maxWidthOrHeight: 1920, // No need for 4K
  useWebWorker: true, // Don't freeze the UI
  fileType: 'image/jpeg', // Convert to JPEG for better compression
  initialQuality: 0.85, // Good quality balance
}

/**
 * Compress an image file using browser-image-compression
 * Returns a Promise that resolves to a compressed File
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> {
  try {
    // Convert our options to browser-image-compression format
    const compressionOptions: BrowserCompressionOptions = {
      maxSizeMB: options.maxSizeKB ? options.maxSizeKB / 1024 : DEFAULT_OPTIONS.maxSizeMB,
      maxWidthOrHeight: options.maxWidth || options.maxHeight || DEFAULT_OPTIONS.maxWidthOrHeight,
      useWebWorker: DEFAULT_OPTIONS.useWebWorker,
      fileType: options.format || DEFAULT_OPTIONS.fileType,
      initialQuality: options.quality || DEFAULT_OPTIONS.initialQuality,
    }

    // Compress the image (returns a File)
    const compressedFile = await imageCompression(file, compressionOptions)

    // Convert File to Blob for consistency with existing code
    return new Blob([compressedFile], { type: compressedFile.type })
  } catch (error) {
    console.error('Image compression error:', error)
    throw new Error('Failed to compress image. Please try again.')
  }
}

/**
 * Convert Blob to File (for FormData compatibility)
 */
export function blobToFile(blob: Blob, fileName: string, mimeType: string): File {
  return new File([blob], fileName, { type: mimeType })
}

/**
 * Get file size in human-readable format
 */
export function getFileSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Validate image file before compression
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' }
  }

  // Check file size (max 10MB before compression)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${getFileSize(maxSize)}`,
    }
  }

  return { valid: true }
}
