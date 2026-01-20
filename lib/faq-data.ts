/**
 * FAQ Data for the Purim Contest App
 * Hebrew questions and answers with a fun, helpful tone
 */

export interface FAQItem {
  question: string
  answer: string
}

export const faqData: FAQItem[] = [
  {
    question: 'מתי מתחילה ההצבעה?',
    answer:
      'ברגע שהשעון בלובי מגיע ל-00:00! אל דאגה, אנחנו נכריז על זה ברמקולים וגם האפליקציה תיפתח אוטומטית.',
  },
  {
    question: 'התחרטתי... אפשר להחליף תמונה?',
    answer:
      'בטח! כל עוד ההצבעה לא נפתחה, פשוט מעלים תמונה חדשה והיא תחליף את הקודמת באופן אוטומטי.',
  },
  {
    question: 'מותר להצביע לעצמי?',
    answer:
      'אהבנו את הביטחון העצמי 😉 אבל לא. המערכת שומרת על הוגנות וחוסמת הצבעה עצמית.',
  },
  {
    question: 'איך עובד הניקוד?',
    answer:
      'בדיוק כמו באירוויזיון! בוחרים 3 תחפושות: מקום 1 מקבל 12 נקודות (דוז פואה!), מקום 2 מקבל 10, ומקום 3 מקבל 8.',
  },
  {
    question: 'מה קורה אם יש תיקו?',
    answer:
      'במקרה של דרמה בטבלה, צוות השופטים יקבל את ההכרעה הסופית בשידור חי!',
  },
]
