import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits for processing
  const digits = phone.replace(/\D/g, '')
  
  // Only format if we have exactly 10 digits starting with 05
  // This allows free typing without aggressive formatting
  if (digits.length === 10 && digits.startsWith('05')) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`
  }
  
  // If user is still typing, just return the digits (allow leading zero)
  // This prevents the "0" from being removed
  return digits
}

export function validateIsraeliPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  // Israeli mobile: Must be exactly 10 digits starting with 05
  // Regex: ^05\d{8}$ (05 followed by exactly 8 digits)
  return digits.length === 10 && /^05\d{8}$/.test(digits)
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}
