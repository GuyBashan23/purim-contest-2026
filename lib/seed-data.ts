/**
 * Mock Data Generator for Demo Mode
 * Generates fake participants with Hebrew names and costume titles
 */

const FIRST_NAMES = [
  'נועה', 'איתי', 'מאיה', 'יוסי', 'עומר', 'דניאל', 'רוני', 'גיא',
  'מיכל', 'דוד', 'גל', 'שיר', 'טל', 'עדי', 'ליאור', 'רועי',
  'אלון', 'תומר', 'אור', 'שרה', 'רבקה', 'יעקב', 'מיכאל', 'אבי'
]

const LAST_NAMES = [
  'כהן', 'לוי', 'מזרחי', 'פרץ', 'ביטון', 'דהן', 'אברהם', 'פרידמן',
  'מלכה', 'אזולאי', 'דוד', 'ישראלי', 'שלום', 'ברוך', 'כץ', 'רוזן'
]

const COSTUMES = [
  'וונדר וומן', 'ספיידרמן', 'פיראט', 'הייטקיסט עייף', 'חד קרן', 'ג\'וקר',
  'מכשפה', 'שוטר', 'רופא', 'בננה', 'מיניון', 'אווטאר', 'ברבי', 'אופנהיימר',
  'הארי פוטר', 'דורה', 'אלזה', 'באטמן', 'סופרמן', 'נסיכה', 'דינוזאור',
  'רובוט', 'אסטרונאוט', 'טבח', 'זמר', 'רקדן', 'מג', 'קוסם'
]

const DESCRIPTIONS = [
  'השקעתי בטירוף!',
  'תחפושת של הרגע האחרון',
  'נראה אתכם מזהים אותי',
  'פורים שמח לכולם!',
  'תחפושת מקורית במיוחד',
  'עשיתי בעצמי!',
  'הכי טוב בתחרות',
  '',
  '',
  '', // More empty strings for variety
]

/**
 * Generate a random item from an array
 */
function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

/**
 * Generate a fake phone number for demo data
 */
function generateFakePhone(index: number): string {
  // Format: 055-0000XX (where XX is index padded to 2 digits)
  const paddedIndex = String(index).padStart(2, '0')
  return `055-0000${paddedIndex}`
}

/**
 * Generate a single mock participant entry
 */
export function generateMockParticipant(index: number) {
  const firstName = randomItem(FIRST_NAMES)
  const lastName = randomItem(LAST_NAMES)
  const fullName = `${firstName} ${lastName}`
  const phone = generateFakePhone(index)
  const costume = randomItem(COSTUMES)
  const description = randomItem(DESCRIPTIONS)
  
  // Use placeholder image service
  // Using lock parameter ensures each index gets a different but consistent image
  const imageUrl = `https://loremflickr.com/800/800/costume,party/all?lock=${index}`

  return {
    phone,
    name: fullName,
    costume_title: costume,
    description: description || null,
    image_url: imageUrl,
    // total_score will be calculated automatically by the database trigger
  }
}

/**
 * Generate multiple mock participants
 */
export function generateMockParticipants(count: number = 40) {
  const participants = []
  for (let i = 10; i < 10 + count; i++) {
    participants.push(generateMockParticipant(i))
  }
  return participants
}
