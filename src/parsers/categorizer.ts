import type { Category } from './types'
import type { MerchantMappings } from '../drive/types'

// keyword → category rules (checked in order, first match wins)
const RULES: [RegExp, Category][] = [
  // מזון ותואלטיקה
  [/שופרסל|רמי לוי|מגה|יינות ביתן|ויקטורי|סופר|טיב טעם|חצי חינם|AM:PM|מינימרקט/i, 'מזון ותואלטיקה'],
  // פארם וביוטי
  [/סופר.?פארם|super.?pharm|נעמן|dm |be |רילייף|כללית פארמה/i, 'פארם וביוטי'],
  // דלק
  [/פז|דלק|סונול|Ten|טן |ספידי|yellow|גז סטיישן|fuel/i, 'דלק'],
  // כביש 6
  [/כביש.?6|נתיבי ישראל|trans.?israel/i, 'כביש 6'],
  // Spotify
  [/spotify/i, 'Spotify'],
  // סלולר
  [/פרטנר|partner|סלקום|cellcom|HOT mobile|019|012|רמי לוי תקשורת/i, 'סלולר'],
  // אינטרנט
  [/HOT |בזק|bezeq|012 smile|internet|אינטרנט/i, 'אינטרנט'],
  // ביטוח משכנתא
  [/ביטוח משכנתא|הראל משכנתא|מגדל משכנתא/i, 'ביטוח משכנתא'],
  // ביטוח — general (specific merchants before generic rules below)
  [/איי.?אי.?גי.?ביטוח|aig.?ביטוח/i, 'ביטוח'],
  [/הפניקס.?ביטוח(?!.{0,4}רכב)/i, 'ביטוח'],
  [/מנורה.?מבטחים/i, 'ביטוח'],
  [/מגדל.?חיים|מגדל.?בריאות|מגדל.?ביטוח/i, 'ביטוח'],
  [/ביטוח.?ישיר|ישיר.?ביטוח/i, 'ביטוח'],
  // ביטוח בריאות
  [/ביטוח בריאות|מנורה|כלל בריאות|הראל בריאות/i, 'ביטוח בריאות'],
  // ביטוח חיים
  [/ביטוח חיים|ריסק/i, 'ביטוח חיים'],
  // ביטוח רכב
  [/ביטוח רכב|ביטוח חובה|direct insurance|הכשרה רכב/i, 'ביטוח רכב'],
  // כללית
  [/כללית|מכבי|מאוחדת|לאומית|רופא|קופת חולים|pharmacy/i, 'כללית'],
  // רכב
  [/טסט|רישיון|מוסך|טיול רכב|חניה|parking|רכב תיקון/i, 'רכב'],
  // חשמל
  [/חברת חשמל|IEC|חשמל/i, 'חשמל'],
  // מים — but שטראוס מים is home goods (water machine/dispenser), not utility
  [/שטראוס.?מים/i, 'בית כללי'],
  [/מקורות|עיריית.*מים|water|מים/i, 'מים'],
  // גז
  [/אמישראגז|סופרגז|פזגז|גז ישראל/i, 'גז'],
  // משכנתא
  [/משכנתא|לאומי למשכנתאות|מזרחי משכנתא/i, 'משכנתא'],
  // חוגים
  [/חוג|studio|סטודיו|gym|כושר|מכון כושר|pilates|פילאטיס|yoga|יוגה/i, 'חוגים'],
  // לימודים
  [/אוניברסיטה|מכללה|לימודים|קורס|udemy|coursera/i, 'לימודים'],
  // בתי ספר
  [/בית ספר|גן ילדים|צהרון|חינוך/i, 'בתי ספר'],
  // פסיכולוג
  [/פסיכולוג|טיפול נפשי|פסיכיאטר/i, 'פסיכולוג'],
  // בגדים
  [/זארה|ZARA|H&M|קסטרו|FOX|פוקס|מנגו|MANGO|בגד|ביגוד|SHEIN|asos/i, 'בגדים'],
  // בילוי
  [/מסעדה|restaurant|בר |cafe|קפה|סינמה|cinema|בילוי|אירוע|פאב/i, 'בילוי'],
  // תחבורה ציבורית
  [/רב קו|רכבת|אגד|דן |מטרו|תחב"צ/i, 'תחב"צ'],
  // בית כללי
  [/אייקאה|IKEA|ACE|home center|הום סנטר|שיפוץ|קרמיקה|פרי.?טיוי|PET.?SALE|pet sale/i, 'בית כללי'],
  // מזון ותואלטיקה — family markets
  [/פמי?לי.?מרקט|family.?market|י\.א\.פמי?לי/i, 'מזון ותואלטיקה'],
  // אינטרנט — telecom
  [/טלראן|telran|הע.*אינטרנט|אינטרנט.*הע/i, 'אינטרנט'],
  // כללית — medical
  [/מור.?מכון|למידע.?רפואי/i, 'כללית'],
  // ביטוח חיים — pension
  [/הראל.?פנסיה|פנסיה.?חיוב/i, 'ביטוח חיים'],
  // ביטוח רכב — mandatory car insurance
  [/הפניקס.?רכב|רכב.?חובה|phoenix/i, 'ביטוח רכב'],
  // גז — gas suppliers
  [/בני.?אחמד|סלאמה.?לגז|אחמד.*גז/i, 'גז'],
  // משכורת — salary income
  [/משכורת|salary|שכר|אינטלאלקטורנ/i, 'משכורת'],
  // חנייה — parking
  [/חניון|חנייה|parking|פנגו/i, 'חנייה'],
  // בית כללי — plants/home
  [/בלוק.?ושתיל|nursery/i, 'בית כללי'],
  // עמלות בנק — bank fees
  [/עמלת.?פעולה|עמלת.?חשבון|דמי.?ניהול.*חשבון/i, 'עמלות בנק'],
  // חשמל — electric suppliers
  [/אלקטרה.?פאוור/i, 'חשמל'],
  // בית כללי — home services/phone billed as home
  [/פלאפון.?חשבון/i, 'בית כללי'],
  // הוראת קבע — standing order items without specific category
  [/החברה.?הכלכלית/i, 'הוראת קבע'],
]

export function categorize(
  description: string,
  mappings: MerchantMappings = {}
): Category {
  // 1. Check saved merchant mappings first (exact match, case-insensitive)
  const normalizedDesc = description.trim()
  for (const [merchant, category] of Object.entries(mappings)) {
    if (normalizedDesc.toLowerCase() === merchant.toLowerCase()) {
      return category as Category
    }
  }

  // 2. Apply keyword rules
  for (const [pattern, category] of RULES) {
    if (pattern.test(description)) return category
  }

  return 'לא מסווג'
}
