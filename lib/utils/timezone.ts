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
 * The datetime-local value is interpreted as the desired time in Israel timezone
 * 
 * Note: datetime-local input doesn't include timezone, so it's interpreted as browser's local time.
 * This function converts it to represent the same moment as if the time was in Israel timezone.
 */
export function parseIsraelDateTimeLocal(dateTimeLocal: string): string {
  if (!dateTimeLocal) return new Date().toISOString()
  
  // Parse the datetime-local value
  // Format: YYYY-MM-DDTHH:mm
  const [datePart, timePart] = dateTimeLocal.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  
  // Create date string components
  const yearStr = String(year)
  const monthStr = String(month).padStart(2, '0')
  const dayStr = String(day).padStart(2, '0')
  const hoursStr = String(hours).padStart(2, '0')
  const minutesStr = String(minutes).padStart(2, '0')
  
  // We need to interpret this time as being in Israel timezone
  // The approach: create a date and calculate what UTC time corresponds to this Israel time
  // We'll use a temporary date to find the timezone offset
  
  // Create a test date to determine timezone offset for Israel at this specific date/time
  const testDateStr = `${yearStr}-${monthStr}-${dayStr}T${hoursStr}:${minutesStr}:00`
  const testDate = new Date(testDateStr) // Parsed as local time
  
  // Get what this time would be in UTC and in Israel
  const utcStr = testDate.toLocaleString('en-US', { timeZone: 'UTC', hour12: false })
  const israelStr = testDate.toLocaleString('en-US', { timeZone: ISRAEL_TIMEZONE, hour12: false })
  
  // Calculate offset (simpler approach)
  // Create date strings and compare
  const tempUTC = new Date(testDate.toISOString())
  const tempIsrael = new Date(
    new Date(testDateStr).toLocaleString('en-US', { timeZone: ISRAEL_TIMEZONE })
  )
  
  // Actually, a better approach: directly create ISO string with timezone
  // Use Intl.DateTimeFormat to get the offset
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: ISRAEL_TIMEZONE,
    timeZoneName: 'longOffset',
  })
  
  // Simpler: create the date as if it's in Israel, then convert to ISO
  // We'll create an ISO string that represents this time in Israel
  // Method: create date with explicit timezone offset calculation
  const dateObj = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))
  
  // Get timezone offset for Israel at this specific date
  // Create a date at this time and check offset
  const sampleDate = new Date(`${yearStr}-${monthStr}-${dayStr}T12:00:00`)
  const offsetStr = sampleDate.toLocaleString('en-US', {
    timeZone: ISRAEL_TIMEZONE,
    timeZoneName: 'short',
  })
  
  // Get offset in hours by comparing UTC and Israel time
  const utcTime = new Date(`${yearStr}-${monthStr}-${dayStr}T${hoursStr}:${minutesStr}:00Z`)
  const israelTimeComponents = utcTime.toLocaleString('en-US', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  
  // Calculate what UTC time gives us the desired Israel time
  // Reverse: if user wants HH:MM in Israel, what UTC time is that?
  // We'll use a simple approximation: assume UTC+2 or UTC+3
  // Better: use actual calculation
  
  // Most reliable method: create date string with timezone, then convert
  // Try UTC+2 first (winter), then UTC+3 (summer/DST)
  let isoString = ''
  
  // Try both offsets and see which one gives us the right time in Israel
  for (const offset of ['+02:00', '+03:00']) {
    const testISO = `${yearStr}-${monthStr}-${dayStr}T${hoursStr}:${minutesStr}:00${offset}`
    const testDate2 = new Date(testISO)
    const result = testDate2.toLocaleString('en-US', {
      timeZone: ISRAEL_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    
    const [resultDate, resultTime] = result.split(', ')
    const [resultMonth, resultDay, resultYear] = resultDate.split('/').map(Number)
    const [resultHour, resultMinute] = resultTime.split(':').map(Number)
    
    if (resultYear === year && resultMonth === month && resultDay === day &&
        resultHour === hours && resultMinute === minutes) {
      isoString = testDate2.toISOString()
      break
    }
  }
  
  // Fallback: if nothing matched, use UTC+2 (IST)
  if (!isoString) {
    isoString = new Date(`${yearStr}-${monthStr}-${dayStr}T${hoursStr}:${minutesStr}:00+02:00`).toISOString()
  }
  
  return isoString
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
