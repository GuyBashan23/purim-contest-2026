/**
 * Timezone utilities for Israel Standard Time (IST)
 * All times in the application should use these functions to ensure consistent display
 */

const ISRAEL_TIMEZONE = 'Asia/Jerusalem'

/**
 * Get current time in Israel timezone as Date object
 */
export function getIsraelNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: ISRAEL_TIMEZONE }))
}

/**
 * Format a date/time string to Israel timezone
 * @param date - ISO string, Date object, or timestamp
 * @param options - Intl.DateTimeFormatOptions
 */
export function formatIsraelTime(
  date: string | Date | number | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: ISRAEL_TIMEZONE,
  }
): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : typeof date === 'number' ? new Date(date) : date
  
  return new Intl.DateTimeFormat('he-IL', {
    ...options,
    timeZone: ISRAEL_TIMEZONE,
  }).format(dateObj)
}

/**
 * Format a date/time for datetime-local input (YYYY-MM-DDTHH:mm)
 * Always converts to Israel timezone
 */
export function formatIsraelDateTimeLocal(date: string | Date | null | undefined): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Get time in Israel timezone
  const israelTime = new Date(dateObj.toLocaleString('en-US', { timeZone: ISRAEL_TIMEZONE }))
  
  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  const year = israelTime.getFullYear()
  const month = String(israelTime.getMonth() + 1).padStart(2, '0')
  const day = String(israelTime.getDate()).padStart(2, '0')
  const hours = String(israelTime.getHours()).padStart(2, '0')
  const minutes = String(israelTime.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Parse a datetime-local value (from input) as Israel timezone and convert to ISO
 */
export function parseIsraelDateTimeLocal(dateTimeLocal: string): string {
  if (!dateTimeLocal) return new Date().toISOString()
  
  // datetime-local value is interpreted as local browser time
  // We need to convert it to represent that same moment in Israel timezone
  // Step 1: Parse the datetime-local value as if it's in the user's local timezone
  const localDate = new Date(dateTimeLocal)
  
  // Step 2: Get what time it is in Israel at that moment
  // Use Intl.DateTimeFormat to get the time components in Israel timezone
  const israelTimeStr = localDate.toLocaleString('en-US', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  
  // Step 3: Create a date string that represents the desired time in Israel
  // Parse "MM/DD/YYYY, HH:mm" format
  const [datePart, timePart] = israelTimeStr.split(', ')
  const [month, day, year] = datePart.split('/').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  
  // Step 4: We need to work backwards - the user entered a time they want in Israel
  // So we need to find what UTC time corresponds to that Israel time
  // The datetime-local input value represents the desired local time in the browser's timezone
  // But we want to interpret it as the desired time in Israel timezone
  
  // Better approach: Create a date string explicitly for Israel timezone
  // Format: "YYYY-MM-DDTHH:mm:ss" and append timezone offset
  const targetYear = year
  const targetMonth = String(month).padStart(2, '0')
  const targetDay = String(day).padStart(2, '0')
  const targetHours = String(hours).padStart(2, '0')
  const targetMinutes = String(minutes).padStart(2, '0')
  
  // Get timezone offset for Israel at that date/time
  // Use a more direct approach: create date in Israel timezone using a library approach
  const israelDateStr = `${targetYear}-${targetMonth}-${targetDay}T${targetHours}:${targetMinutes}:00`
  
  // Since datetime-local doesn't include timezone, we need to interpret it
  // The simplest approach: treat the datetime-local value as the desired Israel time
  // and convert to ISO by creating a date that represents that moment
  const utcDate = new Date(israelDateStr)
  
  // Adjust for timezone difference
  // Get the timezone offset for Israel at this date
  const testDate = new Date(utcDate.toLocaleString('en-US', { timeZone: ISRAEL_TIMEZONE }))
  const localTest = new Date(utcDate.toLocaleString('en-US', { timeZone: 'UTC' }))
  const offset = testDate.getTime() - localTest.getTime()
  
  const finalDate = new Date(utcDate.getTime() - offset)
  
  return finalDate.toISOString()
}

/**
 * Get Israel timezone offset in minutes
 */
function getIsraelTimezoneOffset(): number {
  const now = new Date()
  const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000))
  const israel = new Date(utc.toLocaleString('en-US', { timeZone: ISRAEL_TIMEZONE }))
  return israel.getTime() - utc.getTime()
}

/**
 * Get current timestamp in milliseconds (Israel time)
 */
export function getIsraelTimestamp(): number {
  return getIsraelNow().getTime()
}

/**
 * Convert any date to Israel timezone string (he-IL locale)
 */
export function toIsraelLocaleString(date: string | Date | number | null | undefined): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : typeof date === 'number' ? new Date(date) : date
  
  return dateObj.toLocaleString('he-IL', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
