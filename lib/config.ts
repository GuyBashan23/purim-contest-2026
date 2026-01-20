/**
 * Contest Configuration
 * Set the target date/time when voting phase should begin
 * Times should be interpreted as Israel timezone
 */
// Create date in Israel timezone - March 24, 2026 at 12:00 PM Israel time
export const TARGET_DATE = new Date('2026-03-24T12:00:00+02:00').getTime() // Israel Standard Time (UTC+2)

// Helper to get target date as ISO string
export const getTargetDateISO = () => new Date(TARGET_DATE).toISOString()
