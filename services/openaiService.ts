import OpenAI from 'openai';
import { Movie } from '../types';
import movieInfo from '../movie_info.json';

// مقداردهی کلید API از محیط
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';

// لاگ برای دیباگ - بعداً می‌توانید حذف کنید
console.log('OpenAI API Key configured?', API_KEY ? 'YES (length: ' + API_KEY.length + ')' : 'NO');
if (!API_KEY) {
    console.warn('⚠️ OPENAI_API_KEY is not set. AI features will be disabled.');
}

// فقط یک بار تعریف کنید
const openai = API_KEY ? new OpenAI({ 
    apiKey: API_KEY, 
    dangerouslyAllowBrowser: true 
}) : null;

// تابع کمکی برای تست اتصال
export const isAIAvailable = (): boolean => {
    return !!openai;
};

export const generateSmartMoviePair = async (
  userTaste: any,
  historyTitles: string[],
  excludedTitles: string[] = []
): Promise<Movie[]> => {
  if (!openai) {
    console.warn('OpenAI API key is not configured.');
    return [];
  }

  try {
    const excludedList = excludedTitles.length > 0 
      ? `\n\nمهم: این فیلم‌ها را پیشنهاد ندهید (قبلاً به کاربر نشان داده شده‌اند): ${excludedTitles.join(', ')}`
      : '';
    
    const prompt = `
      شما یک متخصص فارسی‌زبان توصیه فیلم هستید.
      
      فیلم‌های انتخاب شده کاربر: ${historyTitles.join(', ')}
      
      پروفایل سلیقه کاربر:
      - ژانرهای مورد علاقه: ${Object.entries(userTaste.genres || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([genre]) => genre).join(', ')}
      - حال و هواهای مورد علاقه: ${Object.entries(userTaste.moods || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([mood]) => mood).join(', ')}
      - تم‌های مورد علاقه: ${Object.entries(userTaste.themes || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([theme]) => theme).join(', ')}
      
      دقیقاً ۲ فیلم از این لیست پیشنهاد دهید: ${movieInfo.map(m => m.film).join(', ')}
      
      ${excludedList}
      
      یک آرایه JSON معتبر با این فرمت دقیق برگردانید:
      [
        {
          "title": "عنوان دقیق فیلم ۱",
          "reason": "یک دلیل شخصی‌سازی شده به فارسی چرا کاربر این فیلم را دوست خواهد داشت"
        },
        {
          "title": "عنوان دقیق فیلم ۲", 
          "reason": "دلیل فارسی دیگر"
        }
      ]
      
      فقط آرایه JSON را برگردانید، هیچ چیز دیگر.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // یا "gpt-3.5-turbo" برای هزینه کمتر
      messages: [
        { role: "system", content: "شما یک متخصص فیلم هستید که فقط JSON معتبر خروجی می‌دهید." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return [];

    try {
      const parsed = JSON.parse(content);
      // اگر ساختار { "movies": [...] } بود
      const moviesArray = parsed.movies || parsed;
      return Array.isArray(moviesArray) ? moviesArray.slice(0, 2) : [];
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return [];
    }
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return [];
  }
};

export const generateFinalRecommendations = async (
  historyTitles: string[],
  excludedTitles: string[] = [] // NEW: اضافه کردن پارامتر
): Promise<Movie[]> => {
  if (!openai) {
    console.warn('OpenAI API key is not configured.');
    return [];
  }

  try {
    const excludedList = excludedTitles.length > 0 
      ? `\n\nمهم: این فیلم‌ها را پیشنهاد ندهید (قبلاً به کاربر نشان داده شده‌اند): ${excludedTitles.join(', ')}`
      : '';
    
    const prompt = `
      شما یک متخصص فارسی‌زبان توصیه فیلم هستید.
      
      کاربر این ۱۰ فیلم را انتخاب کرده است: ${historyTitles.join(', ')}
      ${excludedList}
      
      دقیقاً ۳ فیلم عالی و جدید برای این کاربر از این لیست پیشنهاد دهید:
      ${movieInfo.map(m => m.film).join(', ')}
      
      نکته حیاتی: ۳ فیلم نباید در لیست مستثنی‌شده بالا باشند.
      فیلم‌هایی را انتخاب کنید که کاربر در این جلسه ندیده است.
      
      یک آبجکت JSON معتبر با این فرمت دقیق برگردانید:
      {
        "recommendations": [
          {
            "title": "عنوان دقیق فیلم ۱",
            "reason": "دلیل فارسی دقیق و شخصی‌سازی شده"
          },
          {
            "title": "عنوان دقیق فیلم ۲",
            "reason": "دلیل فارسی متفاوت دیگر"
          },
          {
            "title": "عنوان دقیق فیلم ۳", 
            "reason": "دلیل فارسی نهایی"
          }
        ]
      }
      
      فقط آبجکت JSON را برگردانید، هیچ چیز دیگر.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "فقط JSON معتبر خروجی بده. فیلم‌های لیست مستثنی را پیشنهاد نده." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return [];

    try {
      const parsed = JSON.parse(content);
      return parsed.recommendations || [];
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return [];
    }
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return [];
  }
};