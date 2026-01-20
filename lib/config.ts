/**
 * Contest Configuration
 * Set the target date/time when voting phase should begin
 */
export const TARGET_DATE = new Date('2026-03-24T12:00:00').getTime() // Example: March 24, 2026 at 12:00 PM

// Helper to get target date as ISO string
export const getTargetDateISO = () => new Date(TARGET_DATE).toISOString()
