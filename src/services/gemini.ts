import { GoogleGenAI, Modality } from "@google/genai";

// Safely access environment variables
const getApiKey = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
      return import.meta.env.VITE_GEMINI_API_KEY;
    }
  } catch (e) {
    // Ignore
  }
  return "";
};

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn("Gemini API key is missing. AI features will not work.");
    }
    aiInstance = new GoogleGenAI({ apiKey: apiKey as string });
  }
  return aiInstance;
};

export async function vocalizeHebrewText(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return text;
  
  // Check if it already has significant niqqud (more than 5% of characters)
  const niqqudCount = (text.match(/[\u05B0-\u05C7]/g) || []).length;
  if (niqqudCount > text.length * 0.05) {
    return text;
  }

  try {
    const response = await fetch('https://nakdan-2-0.loadbalancer.dicta.org.il/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      },
      body: JSON.stringify({
        task: "nakdan",
        data: text,
        addmorph: true,
        keepqq: false,
        matchpartial: true,
        generate_links: false,
        genre: "rabbinic"
      })
    });

    if (!response.ok) {
      throw new Error(`Dicta API error: ${response.status}`);
    }

    const result = await response.json();
    const vocalizedText = result.map((word: any) => {
      const selectedOption = word.options && word.options.length > 0 ? word.options[0][0] : word.word;
      return selectedOption ? selectedOption.replace(/\|/g, '') : '';
    }).join('');

    return vocalizedText || text;
  } catch (error) {
    console.error("Vocalize error (Dicta):", error);
    
    // Fallback to Gemini if Dicta fails
    try {
      const response = await getAI().models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `הוסף ניקוד מדויק, מלא ותקני לטקסט הבא. הטקסט הוא מתוך "ספר המצוות" של הרמב"ם.
הקפד על כללי הדקדוק והניקוד המקובלים במסורת חב"ד והרמב"ם.
השתמש בניקוד מלא (כולל דגשים, שוואים, ותנועות קטנות).
החזר אך ורק את הטקסט המנוקד, ללא הקדמות, הסברים או הערות.
שמור על כל תגיות ה-HTML (כמו <b>, <i>, <br>) בדיוק כפי שהן.

הטקסט לניקוד:
${text}`,
        config: {
          temperature: 0.1,
        }
      });

      const result = response.text?.trim();
      return result || text;
    } catch (geminiError) {
      console.error("Vocalize error (Gemini fallback):", geminiError);
      return text;
    }
  }
}

export async function vocalizeArray(arr: any[]): Promise<any[]> {
  return Promise.all(arr.map(async (item) => {
    try {
      if (typeof item === 'string') {
        return await vocalizeHebrewText(item);
      } else if (Array.isArray(item)) {
        return await vocalizeArray(item);
      } else if (item && typeof item === 'object' && item.he) {
        // Handle objects with 'he' property (like mitzvot objects)
        return { ...item, he: await vocalizeHebrewText(item.he) };
      } else {
        return item;
      }
    } catch (e) {
      return item; // Fallback to original
    }
  }));
}

export async function getChabadSeferHamitzvotRef(date: Date, rambam3ChaptersRef: string, retryCount = 0): Promise<string[]> {
  const dateStr = date.toISOString().split('T')[0];
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Today's date is ${dateStr}. The Daily Rambam (3 Chapters) for today according to the Chabad schedule is "${rambam3ChaptersRef}". 
What is the corresponding daily study portion in "Sefer HaMitzvot" (Book of Mitzvot) according to the Chabad daily study schedule?
The Sefer HaMitzvot daily study covers the mitzvot that are discussed in the 3 chapters of Rambam for that day.
Return ONLY the exact Sefaria Ref(s) for the Sefer HaMitzvot portion. 
If there are multiple non-contiguous refs, separate them with a semicolon (;).
Examples of valid formats:
"Sefer HaMitzvot, Positive Commandments 1-5"
"Sefer HaMitzvot, Negative Commandments 10"
"Sefer HaMitzvot, Positive Commandments 12; Sefer HaMitzvot, Negative Commandments 15"
Do not include any other text, markdown, or explanation. Just the Sefaria Ref(s).`,
      config: {
        temperature: 0.1,
      }
    });

    const text = response.text?.trim().replace(/"/g, '') || "";
    if (!text || text.length < 5 || !text.includes("Sefer HaMitzvot")) throw new Error("Invalid ref returned: " + text);
    
    // Split by semicolon and trim
    const refs = text.split(';').map(r => r.trim()).filter(r => r.length > 0);
    return refs;
  } catch (error) {
    if (retryCount < 2) {
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      return getChabadSeferHamitzvotRef(date, rambam3ChaptersRef, retryCount + 1);
    }
    return ["Sefer HaMitzvot, Positive Commandments 1"];
  }
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function getRambamPshat(halachaText: string, length: 'short' | 'long' = 'long'): Promise<string> {
  if (!halachaText || halachaText.trim().length === 0) return "";
  if (!getApiKey()) return "שגיאה: מפתח API חסר. אנא הגדר VITE_GEMINI_API_KEY בהגדרות הסביבה (Netlify/Vercel).";
  const cleanText = stripHtml(halachaText);

  const lengthInstruction = length === 'short' 
    ? `היה תמציתי, קצר וקולע, תוך שמירה על כוונת הרמב"ם המקורית. הבא את עיקר ההלכה בלבד.`
    : `ספק הסבר מקיף ומעמיק, תוך שמירה על כוונת הרמב"ם המקורית. אם ההלכה קצרה, הרחב על הרקע והמשמעות שלה.`;

  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `הסבר את ההלכה הבאה מהרמב"ם (משנה תורה) בלשון פשוטה, ברורה ומפורטת, המתאימה לכל אדם.
${lengthInstruction}
אל תשתמש במונחים קשים ללא הסבר ברור.
חשוב מאוד: אל תכתוב את שמות ה' המפורשים. השתמש אך ורק בכינויים "השם" או "אלוקים".
החזר אך ורק את ההסבר עצמו, ללא הקדמות ("להלן ההסבר") או סיומות.

ההלכה:
${cleanText}`,
      config: {
        systemInstruction: "אתה תלמיד חכם הבקי בתורת הרמב\"ם ובמסורת ישראל. תפקידך להנגיש את דברי הרמב\"ם לציבור הרחב בצורה מדויקת ונאמנה למקור.",
        temperature: 0.1,
      }
    });

    return response.text?.trim() || "לא ניתן היה להפיק פירוש להלכה זו.";
  } catch (error: any) {
    console.error("Gemini Pshat error:", error);
    return `אירעה שגיאה בעת הפקת הפירוש: ${error?.message || error}`;
  }
}

export async function getChumashPshat(verseText: string): Promise<string> {
  if (!verseText || verseText.trim().length === 0) return "";
  if (!getApiKey()) return "שגיאה: מפתח API חסר. אנא הגדר VITE_GEMINI_API_KEY בהגדרות הסביבה (Netlify/Vercel).";
  const cleanText = stripHtml(verseText);

  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `הסבר את הפסוק הבא מהחומש בלשון פשוטה וקלה (פשט), המתאימה לכל אדם.
היה תמציתי, ברור ומדויק.
אל תשתמש במונחים קשים ללא הסבר.
חשוב מאוד: אל תכתוב את שמות ה' המפורשים. השתמש אך ורק בכינויים "השם" או "אלוקים".
החזר אך ורק את ההסבר, ללא הקדמות או סיומות.

הפסוק:
${cleanText}`,
      config: {
        systemInstruction: "אתה פרשן מקרא הבקי במסורת ישראל ובפירוש רש\"י. תפקידך להסביר את פשט הפסוקים בצורה נאמנה למסורת.",
        temperature: 0.1,
      }
    });

    return response.text?.trim() || "לא ניתן היה להפיק פירוש לפסוק זה.";
  } catch (error: any) {
    console.error("Gemini Chumash Pshat error:", error);
    return `אירעה שגיאה בעת הפקת הפירוש: ${error?.message || error}`;
  }
}

export async function getSeferHamitzvotPshat(mitzvahText: string): Promise<string> {
  if (!mitzvahText || mitzvahText.trim().length === 0) return "";
  if (!getApiKey()) return "שגיאה: מפתח API חסר. אנא הגדר VITE_GEMINI_API_KEY בהגדרות הסביבה (Netlify/Vercel).";
  const cleanText = stripHtml(mitzvahText);

  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `הסבר את המצווה הבאה מתוך "ספר המצוות" של הרמב"ם בלשון פשוטה וקלה (פשט), המתאימה לכל אדם.
היה תמציתי, ברור ומדויק.
אל תשתמש במונחים קשים ללא הסבר.
חשוב מאוד: אל תכתוב את שמות ה' המפורשים. השתמש אך ורק בכינויים "השם" או "אלוקים".
החזר אך ורק את ההסבר, ללא הקדמות או סיומות.

המצווה:
${cleanText}`,
      config: {
        systemInstruction: "אתה תלמיד חכם הבקי בספר המצוות לרמב\"ם ובמסורת ישראל. תפקידך להסביר את המצוות בצורה פשוטה ומדויקת.",
        temperature: 0.1,
      }
    });

    return response.text?.trim() || "לא ניתן היה להפיק פירוש למצווה זו.";
  } catch (error: any) {
    console.error("Gemini Sefer Hamitzvot Pshat error:", error);
    return `אירעה שגיאה בעת הפקת הפירוש: ${error?.message || error}`;
  }
}

export async function getTanyaPshat(tanyaText: string): Promise<string> {
  if (!tanyaText || tanyaText.trim().length === 0) return "";
  if (!getApiKey()) return "שגיאה: מפתח API חסר. אנא הגדר VITE_GEMINI_API_KEY בהגדרות הסביבה (Netlify/Vercel).";
  const cleanText = stripHtml(tanyaText);

  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `הסבר את הקטע הבא מספר התניא (ליקוטי אמרים) בלשון פשוטה וקלה (פשט), המתאימה לכל אדם.
היה תמציתי, ברור ומדויק, תוך הנגשת המושגים החסידיים לשפה מובנת.
אל תשתמש במונחים קשים ללא הסבר.
חשוב מאוד: אל תכתוב את שמות ה' המפורשים. השתמש אך ורק בכינויים "השם" או "אלוקים".
החזר אך ורק את ההסבר, ללא הקדמות או סיומות.

הקטע מהתניא:
${cleanText}`,
      config: {
        systemInstruction: "אתה משפיע חסידי הבקי בתורת התניא ובחסידות חב\"ד. תפקידך להסביר את דברי בעל התניא בצורה בהירה ונאמנה למקור.",
        temperature: 0.1,
      }
    });

    return response.text?.trim() || "לא ניתן היה להפיק פירוש לקטע זה.";
  } catch (error: any) {
    console.error("Gemini Tanya Pshat error:", error);
    return `אירעה שגיאה בעת הפקת הפירוש: ${error?.message || error}`;
  }
}

export async function generateChumashImage(verseText: string): Promise<string> {
  if (!verseText || verseText.trim().length === 0) return "";

  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("API_KEY_REQUIRED");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          {
            text: `צור תמונה ריאליסטית, אמנותית ומכבדת המתארת את הפסוק הבא מהתורה. התמונה צריכה להיות בסגנון היסטורי, תנ"כי, ומכבד את המסורת היהודית. ללא דמויות אדם ברורות מדי (כדי לשמור על כבוד). הפסוק: ${stripHtml(verseText)}`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image generated");
  } catch (error: any) {
    console.error("Gemini Image Generation error:", error);
    throw error;
  }
}
