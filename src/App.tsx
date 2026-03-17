import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Book, ScrollText, Library, Loader2, AlertCircle, ChevronRight, ChevronLeft, ZoomIn, ZoomOut, Share2, Check, Mail, Facebook, MessageCircle, Sun, ShieldCheck, Moon, MessageSquare, X, Sparkles, Settings as SettingsIcon, Type, Bell, Eye, Bookmark, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { vocalizeArray, vocalizeHebrewText, getChabadSeferHamitzvotRef, getRambamPshat, getChumashPshat, getSeferHamitzvotPshat, getTanyaPshat, generateChumashImage } from './services/gemini';

type Tab = 'chumash' | 'tehillim' | 'tanya' | 'rambam' | 'seferHamitzvot' | 'hayomYom';

interface DailyData {
  chumash: { ref: string; text: any; heRef: string; rashiText?: any; onkelosText?: any };
  tehillim: { ref: string; text: any; heRef: string };
  tanya: { ref: string; text: any; heRef: string };
  rambam: { ref: string; text: any; heRef: string };
  seferHamitzvot: { ref: string; text: any; heRef: string; vocalized?: boolean };
  hayomYom: { ref: string; text: any; heRef: string; vocalized?: boolean };
}

const tehillimMap: Record<number, string> = {
  1: "1-9", 2: "10-17", 3: "18-22", 4: "23-28", 5: "29-34",
  6: "35-38", 7: "39-43", 8: "44-48", 9: "49-54", 10: "55-59",
  11: "60-65", 12: "66-68", 13: "69-71", 14: "72-76", 15: "77-78",
  16: "79-82", 17: "83-87", 18: "88-89", 19: "90-96", 20: "97-103",
  21: "104-105", 22: "106-107", 23: "108-112", 24: "113-118",
  25: "119:1-96", 26: "119:97-176", 27: "120-134", 28: "135-139",
  29: "140-144", 30: "145-150"
};

// Helper to convert number to Hebrew letters (for verse numbers)
function numberToHebrew(num: number): string {
  if (num <= 0) return '';
  const letters: [number, string][] = [
    [400, 'ת'], [300, 'ש'], [200, 'ר'], [100, 'ק'],
    [90, 'צ'], [80, 'פ'], [70, 'ע'], [60, 'ס'], [50, 'נ'], [40, 'מ'], [30, 'ל'], [20, 'כ'], [10, 'י'],
    [9, 'ט'], [8, 'ח'], [7, 'ז'], [6, 'ו'], [5, 'ה'], [4, 'ד'], [3, 'ג'], [2, 'ב'], [1, 'א']
  ];
  let result = '';
  for (const [val, letter] of letters) {
    while (num >= val) {
      if (num === 15) { result += 'טו'; num -= 15; }
      else if (num === 16) { result += 'טז'; num -= 16; }
      else { result += letter; num -= val; }
    }
  }
  return result;
}

// Helper to get local ISO date string (YYYY-MM-DD)
function getLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Simple cache for fetched data
const dataCache = new Map<string, any>();

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['chumash', 'tehillim', 'tanya', 'rambam', 'seferHamitzvot', 'hayomYom'].includes(tabParam)) {
      return tabParam as Tab;
    }
    return 'chumash';
  });
  const [data, setData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [nightVision, setNightVision] = useState(() => localStorage.getItem('nightVision') === 'true');
  
  // Date navigation state
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');
    if (dateParam) {
      const [year, month, day] = dateParam.split('-').map(Number);
      if (year && month && day) {
        const parsedDate = new Date(year, month - 1, day);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      }
    }
    return new Date();
  });
  const [hebrewDate, setHebrewDate] = useState<string>('');
  
  // Font size state
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('fontSize');
    return saved ? parseInt(saved, 10) : 22;
  });
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const isResettingRef = useRef(false);
  const [showRashi, setShowRashi] = useState(() => {
    const saved = localStorage.getItem('showRashi');
    return saved !== null ? saved === 'true' : true;
  });
  const [showOnkelos, setShowOnkelos] = useState(() => {
    const saved = localStorage.getItem('showOnkelos');
    return saved !== null ? saved === 'true' : false;
  });
  const [showRambamPshat, setShowRambamPshat] = useState(() => {
    const saved = localStorage.getItem('showRambamPshat_v2');
    return saved !== null ? saved === 'true' : true;
  });
  const [showChumashPshat, setShowChumashPshat] = useState(() => {
    const saved = localStorage.getItem('showChumashPshat_v2');
    return saved !== null ? saved === 'true' : true;
  });
  const [showSeferHamitzvotPshat, setShowSeferHamitzvotPshat] = useState(() => {
    const saved = localStorage.getItem('showSeferHamitzvotPshat_v2');
    return saved !== null ? saved === 'true' : true;
  });
  const [showTanyaPshat, setShowTanyaPshat] = useState(() => {
    const saved = localStorage.getItem('showTanyaPshat_v2');
    return saved !== null ? saved === 'true' : true;
  });
  const [enableChumashImages, setEnableChumashImages] = useState(() => {
    const saved = localStorage.getItem('enableChumashImages');
    return saved !== null ? saved === 'true' : false;
  });
  
  const [rambamExplanationLength, setRambamExplanationLength] = useState<'short' | 'long'>('long');
  const [activePshat, setActivePshat] = useState<{ title: string; text: string; original: string; type: 'rambam' | 'chumash' | 'seferHamitzvot' | 'tanya' } | null>(null);
  const [pshatLoading, setPshatLoading] = useState(false);
  
  // Chumash Images state
  const [chumashImages, setChumashImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  
  // Share state
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  
  // Reminders state
  const [reminderEnabled, setReminderEnabled] = useState(() => {
    const saved = localStorage.getItem('reminderEnabled');
    return saved !== null ? saved === 'true' : false;
  });
  const [reminderTime, setReminderTime] = useState(() => {
    const saved = localStorage.getItem('reminderTime');
    return saved || '08:00';
  });
  
  // Progress state
  const [tabProgress, setTabProgress] = useState<Record<Tab, number>>({
    chumash: 0,
    tehillim: 0,
    tanya: 0,
    rambam: 0,
    seferHamitzvot: 0,
    hayomYom: 0
  });

  // Feedback state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  // Bookmark state (saves last scroll position)
  const [lastScrollPos, setLastScrollPos] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('lastScrollPos');
    return saved ? JSON.parse(saved) : {};
  });

  // Save bookmarks to localStorage
  useEffect(() => {
    localStorage.setItem('lastScrollPos', JSON.stringify(lastScrollPos));
  }, [lastScrollPos]);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePshat(null);
        setShowSettings(false);
        setShowFeedbackModal(false);
        setShowShareMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load progress from localStorage
  useEffect(() => {
    const dateKey = getLocalIsoDate(currentDate);
    const savedProgress = localStorage.getItem(`progress_${dateKey}`);
    if (savedProgress) {
      try {
        setTabProgress(JSON.parse(savedProgress));
      } catch (e) {
        console.error('Failed to parse saved progress', e);
      }
    } else {
      setTabProgress({ chumash: 0, tehillim: 0, tanya: 0, rambam: 0, seferHamitzvot: 0, hayomYom: 0 });
    }
  }, [currentDate]);

  // Save progress to localStorage
  useEffect(() => {
    const dateKey = getLocalIsoDate(currentDate);
    localStorage.setItem(`progress_${dateKey}`, JSON.stringify(tabProgress));
  }, [tabProgress, currentDate]);

  // Helper to clean Hebrew text from unnecessary dashes and symbols
  const cleanHebrewText = (text: any): any => {
    if (!text) return text;
    if (typeof text === 'string') {
      return text
        .replace(/־/g, ' ') // Replace Maqaf with space
        .replace(/[\u05BE\u2010\u2011\u2012\u2013\u2014\u2015\u00AD\u200B\u200C\u200D\uFEFF]/g, ' ') // Hebrew Maqaf, various dashes, and zero-width characters
        .replace(/_{2,}/g, ' ') // Replace multiple underscores with space
        .replace(/(\s)-(\s)/g, ' ') // Replace isolated hyphens with space
        .replace(/\|/g, '') // Remove pipe characters (used by Dicta for prefixes)
        .replace(/([\u0590-\u05FF])[-*]([\u0590-\u05FF])/g, '$1 $2') // Replace hyphens or stars between Hebrew words with space
        .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim();
    }
    if (Array.isArray(text)) {
      return text.map(cleanHebrewText);
    }
    if (typeof text === 'object' && !Array.isArray(text)) {
      const cleanedObj: any = { ...text };
      if (cleanedObj.he) cleanedObj.he = cleanHebrewText(cleanedObj.he);
      if (cleanedObj.text) cleanedObj.text = cleanHebrewText(cleanedObj.text);
      return cleanedObj;
    }
    return text;
  };

  // Dark mode effect
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Night vision effect
  useEffect(() => {
    localStorage.setItem('nightVision', nightVision.toString());
    if (nightVision) {
      document.documentElement.classList.add('night-vision');
    } else {
      document.documentElement.classList.remove('night-vision');
    }
  }, [nightVision]);

  // Settings persistence
  useEffect(() => {
    localStorage.setItem('fontSize', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('showRashi', showRashi.toString());
  }, [showRashi]);

  useEffect(() => {
    localStorage.setItem('showOnkelos', showOnkelos.toString());
  }, [showOnkelos]);

  useEffect(() => {
    localStorage.setItem('showRambamPshat_v2', showRambamPshat.toString());
  }, [showRambamPshat]);

  useEffect(() => {
    localStorage.setItem('showChumashPshat_v2', showChumashPshat.toString());
  }, [showChumashPshat]);

  useEffect(() => {
    localStorage.setItem('showSeferHamitzvotPshat_v2', showSeferHamitzvotPshat.toString());
  }, [showSeferHamitzvotPshat]);

  useEffect(() => {
    localStorage.setItem('showTanyaPshat_v2', showTanyaPshat.toString());
  }, [showTanyaPshat]);

  useEffect(() => {
    localStorage.setItem('enableChumashImages', enableChumashImages.toString());
  }, [enableChumashImages]);

  // Reminders persistence and logic
  useEffect(() => {
    localStorage.setItem('reminderEnabled', reminderEnabled.toString());
    if (reminderEnabled && 'Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, [reminderEnabled]);

  useEffect(() => {
    localStorage.setItem('reminderTime', reminderTime);
  }, [reminderTime]);

  useEffect(() => {
    if (!reminderEnabled || !('Notification' in window)) return;

    const checkReminder = () => {
      if (Notification.permission !== 'granted') return;

      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;
      
      const today = getLocalIsoDate(now);
      const lastReminderDate = localStorage.getItem('lastReminderDate');

      if (currentTime === reminderTime && lastReminderDate !== today) {
        new Notification('זמן ללימוד החת"ת והרמב"ם!', {
          body: 'השיעורים היומיים שלך מחכים לך. לחץ כאן כדי להתחיל ללמוד.',
          icon: '/favicon.ico'
        });
        localStorage.setItem('lastReminderDate', today);
      }
    };

    const intervalId = setInterval(checkReminder, 60000);
    checkReminder(); // Check immediately on mount/update

    return () => clearInterval(intervalId);
  }, [reminderEnabled, reminderTime]);
  
  // Rambam chapters toggle state
  const [rambamChapters, setRambamChapters] = useState<1 | 3>(3);

  // Helper functions for fetching
  const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 3, backoff = 1000): Promise<Response> => {
    try {
      const res = await fetch(url, options);
      if (!res.ok && retries > 0) throw new Error(`Status ${res.status}`);
      return res;
    } catch (e) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      throw e;
    }
  };

  const fetchText = async (ref: string) => {
    // If ref is a full URL, extract the path part
    let cleanRef = ref;
    if (ref.startsWith('http')) {
      try {
        const url = new URL(ref);
        cleanRef = url.pathname.replace(/^\//, '');
      } catch (e) {
        cleanRef = ref.split('/').pop() || ref;
      }
    }
    // Decode URL components (e.g., %2C -> ,)
    cleanRef = decodeURIComponent(cleanRef);
    // Remove "texts/" prefix if it exists in the ref from Hebcal
    cleanRef = cleanRef.replace(/^texts\//, '');
    
    // For Sefer HaMitzvot, try to get vocalized versions
    let vheParam = '';
    const normalizedRef = cleanRef.toLowerCase().replace(/ /g, '_');
    if (normalizedRef.includes('sefer_hamitzvot') || normalizedRef.includes('sefer_hamitzvot_of_the_rambam')) {
      vheParam = '&vhe=Torat_Emet';
    }
    
    try {
      let res = await fetchWithRetry(`https://www.sefaria.org/api/texts/${cleanRef}?context=0${vheParam}`);
      if (!res.ok) throw new Error(`Failed to fetch ${cleanRef}`);
      let data = await res.json();
      
      // Fallback if vocalized version doesn't exist (returns empty 'he' array)
      if (vheParam && (!data.he || (Array.isArray(data.he) && data.he.length === 0))) {
        res = await fetchWithRetry(`https://www.sefaria.org/api/texts/${cleanRef}?context=0`);
        if (!res.ok) throw new Error(`Failed to fetch ${cleanRef} fallback`);
        data = await res.json();
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching ${cleanRef}:`, error);
      // Return a minimal object to avoid crashing Promise.all
      return { he: [], text: [], heRef: cleanRef, error: true };
    }
  };

  const fetchMultipleTexts = async (refs: string[]) => {
    const results = await Promise.all(refs.map(ref => fetchText(ref).catch(e => {
      return null;
    })));
    
    const validResults = results.filter(r => r !== null);
    if (validResults.length === 0) throw new Error(`Failed to fetch any of ${refs.join(', ')}`);
    
    if (validResults.length === 1) return validResults[0];
    
    // Combine multiple results
    return {
      ref: refs.join('; '),
      heRef: validResults.map(r => r.heRef).join('; '),
      he: validResults.map(r => ({ heRef: r.heRef, he: r.he })),
      text: validResults.map(r => ({ heRef: r.heRef, text: r.text }))
    };
  };

  const fetchChabadHayomYom = async (date?: Date) => {
    const proxies = [
      (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`
    ];

    for (const getProxyUrl of proxies) {
      try {
        let targetUrl = 'https://www.chabad.org.il/Lessons/Yom.asp';
        if (date) {
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          targetUrl += `?SelectdDate=${day}/${month}/${year}&DateType=0`;
        }
        
        const proxyUrl = getProxyUrl(targetUrl);
        const res = await fetchWithRetry(proxyUrl);
        if (!res.ok) continue;
        const buffer = await res.arrayBuffer();
        const decoder = new TextDecoder('windows-1255');
        const data = decoder.decode(buffer);
        
        const match = data.match(/<table cellpadding=2 cellspacing=2 border=0 width='100%'>([\s\S]*?)<\/table>/i);
        if (match) {
          const content = match[1];
          const rows = content.match(/<tr><td>([\s\S]*?)<\/td><\/tr>/gi);
          if (rows) {
            const he = [];
            for (const row of rows) {
              // Split by <p> or <br> to preserve paragraphs
              const paragraphs = row.split(/<p[^>]*>|<br[^>]*>/i);
              for (const p of paragraphs) {
                const text = p.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
                if (text && text.length > 0) {
                  he.push(text);
                }
              }
            }
            if (he.length > 0) {
              return {
                ref: 'Hayom Yom',
                heRef: 'היום יום',
                he: he,
                text: []
              };
            }
          }
        }
      } catch (e) {
        console.error('Chabad Hayom Yom fetch error with proxy:', e);
      }
    }
    return null;
  };

  const fetchChabadSeferHamitzvot = async (date?: Date) => {
    const proxies = [
      (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`
    ];

    for (const getProxyUrl of proxies) {
      try {
        let targetUrl = 'https://www.chabad.org.il/Lessons/RambamMitzvot.asp';
        if (date) {
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          targetUrl += `?SelectdDate=${day}/${month}/${year}&DateType=0`;
        }
        
        const proxyUrl = getProxyUrl(targetUrl);
        const res = await fetchWithRetry(proxyUrl);
        if (!res.ok) continue;
        const buffer = await res.arrayBuffer();
        const decoder = new TextDecoder('windows-1255');
        const text = decoder.decode(buffer);
      
      // Look for the main content area - usually inside a specific table or div
      // In chabad.org.il, it's often inside a TD with a specific class or just after some headers
      
      // Try to find all blocks that look like mitzvot
      // They often start with a bold title or a specific font tag
      const mitzvot = [];
      
      const cleanHtmlText = (html: string) => {
        let cleaned = html
          .replace(/<br\s*\/?>/gi, ' ')
          .replace(/<\/p>|<\/div>|<\/td>|<\/tr>/gi, ' ')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
          
        // Fix spaced out words like "מ צ ו ה"
        while (cleaned.match(/(?<=^|\s)([א-ת])\s+(?=[א-ת](?:\s|$))/)) {
          cleaned = cleaned.replace(/(?<=^|\s)([א-ת])\s+(?=[א-ת](?:\s|$))/g, '$1');
        }
        return cleaned;
      };
      
      // Split by common separators or look for patterns
      // A more generic approach: find all paragraphs, divs, and spans
      const blocks = text.match(/<(?:P|DIV|SPAN|TD)[^>]*>([\s\S]*?)<\/(?:P|DIV|SPAN|TD)>/gi) || [];
      
      let currentMitzvah: any = null;
      
      for (const block of blocks) {
        let cleanBlock = cleanHtmlText(block);
        if (cleanBlock.length < 10) continue;
        
        if (cleanBlock.includes('נא לשמור על קדושת הדף') || cleanBlock.includes('דרונט דיגיטל')) {
          cleanBlock = cleanBlock.split('נא לשמור על קדושת הדף')[0].split('דרונט דיגיטל')[0].trim();
          if (!cleanBlock) continue;
        }
        
        // Check if this block is a title
        const titleMatch = cleanBlock.match(/^((?:מצוה|מצווה|מצוות|מצות|לא תעשה|עשה|מל"ת|מ"ע)\s+(?:עשה\s+|לא תעשה\s+)?(?:מצוה\s+|מצווה\s+)?(?:[א-ת"']+))(?:\s*[:-]\s*(.*))?$/i);
        const isHeader = (cleanBlock.includes('מצות עשה') || cleanBlock.includes('מצות לא תעשה') || 
                         cleanBlock.includes('מצווה עשה') || cleanBlock.includes('מצווה לא תעשה') ||
                         cleanBlock.includes('מל"ת') || cleanBlock.includes('מ"ע')) && cleanBlock.length < 100;
        
        if (titleMatch) {
          if (currentMitzvah) mitzvot.push(currentMitzvah);
          currentMitzvah = { 
            heRef: titleMatch[1], 
            he: titleMatch[2] || '' 
          };
        } else if (isHeader) {
          if (currentMitzvah) mitzvot.push(currentMitzvah);
          currentMitzvah = { heRef: cleanBlock, he: '' };
        } else if (currentMitzvah) {
          // Append to current mitzvah
          currentMitzvah.he += (currentMitzvah.he ? ' ' : '') + cleanBlock;
        } else if (cleanBlock.startsWith('מצו')) {
          // Start a new mitzvah even if not a perfect title match
          currentMitzvah = { heRef: 'מצוה', he: cleanBlock };
        }
      }
      
      if (currentMitzvah) mitzvot.push(currentMitzvah);
      
      // Post-process: if any mitzvah has no content, try to split the title
      const processedMitzvot = mitzvot.map(m => {
        if (m.he.length < 10) {
          const splitMatch = m.heRef.match(/^((?:מצוה|מצווה|מצוות|מצות|לא תעשה|עשה)\s+(?:עשה\s+|לא תעשה\s+)?(?:מצוה\s+|מצווה\s+)?(?:[א-ת"']+))\s*[:-]\s*(.*)/i);
          if (splitMatch) {
            return { heRef: splitMatch[1], he: splitMatch[2] };
          }
        }
        return m;
      }).filter(m => m.he.length > 20 && m.heRef !== 'מצוות נדירות' && !m.he.includes('לבית היהודי ולעסק'));
      
      if (processedMitzvot.length > 0) {
        return {
          ref: 'Sefer HaMitzvot',
          heRef: processedMitzvot.map(m => m.heRef).join('; '),
          he: processedMitzvot,
          text: []
        };
      }
      
      // Fallback: if the above failed, try the old P-tag method but more refined
      const pTags = text.match(/<P[^>]*>([\s\S]*?)<\/P>/gi) || [];
      const fallbackMitzvot = [];
      for (const p of pTags) {
        const cleanP = cleanHtmlText(p);
        if (cleanP.length < 30) continue;
        
        if (cleanP.includes('מצו') || cleanP.includes('לא תעשה')) {
          const splitMatch = cleanP.match(/^((?:מצוה|מצווה|מצוות|מצות|לא תעשה|עשה)\s+(?:עשה\s+|לא תעשה\s+)?(?:מצוה\s+|מצווה\s+)?(?:[א-ת"']+))\s*[:-]\s*(.*)/i);
          if (splitMatch) {
            fallbackMitzvot.push({ heRef: splitMatch[1], he: splitMatch[2] });
          } else {
            fallbackMitzvot.push({ heRef: 'מצוה', he: cleanP });
          }
        }
      }
      
      if (fallbackMitzvot.length > 0) {
        return {
          ref: 'Sefer HaMitzvot',
          heRef: fallbackMitzvot.map(m => m.heRef).join('; '),
          he: fallbackMitzvot,
          text: []
        };
      }

      throw new Error('No mitzvot found in Chabad.org.il response');
    } catch (e) {
      console.error('Chabad fetch error with proxy:', e);
      continue;
    }
  }
  return null;
};

  useEffect(() => {
    let isMounted = true;

    async function fetchDailyStudy() {
      try {
        const dateKey = getLocalIsoDate(currentDate) + '-' + rambamChapters;
        if (dataCache.has(dateKey)) {
          const cached = dataCache.get(dateKey);
          setHebrewDate(cached.hebrewDate);
          setData(cached.data);
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);

        const dateStr = getLocalIsoDate(currentDate);
        const tomorrow = new Date(currentDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = getLocalIsoDate(tomorrow);

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const day = currentDate.getDate();
        
        const tomorrowYear = tomorrow.getFullYear();
        const tomorrowMonth = tomorrow.getMonth() + 1;
        const tomorrowDay = tomorrow.getDate();

        // Fetch Sefaria Calendar for today and tomorrow, and Hebrew date info in parallel
        const [calRes, calTomorrowRes, todayHeb, tomorrowHeb] = await Promise.all([
          fetchWithRetry(`https://www.sefaria.org/api/calendars?timezone=Asia/Jerusalem&year=${year}&month=${month}&day=${day}`),
          fetchWithRetry(`https://www.sefaria.org/api/calendars?timezone=Asia/Jerusalem&year=${tomorrowYear}&month=${tomorrowMonth}&day=${tomorrowDay}`),
          fetchWithRetry(`https://www.hebcal.com/converter?cfg=json&date=${dateStr}&g2h=1&strict=1`).then(r => r.json()),
          fetchWithRetry(`https://www.hebcal.com/converter?cfg=json&date=${tomorrowStr}&g2h=1&strict=1`).then(r => r.json())
        ]);
        
        if (!calRes.ok || !calTomorrowRes.ok) throw new Error('Failed to fetch calendar');
        const calData = await calRes.json();
        const calTomorrowData = await calTomorrowRes.json();
        
        if (isMounted) setHebrewDate(todayHeb.hebrew);

        // 1. Chumash (Daily Aliyah)
        const parashaItem = calData.calendar_items.find((item: any) => item.title.en === "Parashat Hashavua");
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday...
        let chumashRef = parashaItem?.extraDetails?.aliyot?.[dayOfWeek];
        if (!chumashRef) chumashRef = parashaItem?.url; // Fallback to whole parasha
        
        const rashiRef = `Rashi on ${chumashRef}`;
        const onkelosRef = `Onkelos ${chumashRef}`;

        // 2. Tehillim (Hebrew Date)
        let tehillimChapters = tehillimMap[todayHeb.hd] || "1";
        if (todayHeb.hd === 29 && tomorrowHeb.hd === 1) {
          tehillimChapters = "140-150";
        }
        const tehillimRef = `Psalms.${tehillimChapters}`;

        // 3. Tanya
        const tanyaItem = calData.calendar_items.find((item: any) => item.title.en === "Tanya Yomi");
        const tanyaTomorrowItem = calTomorrowData.calendar_items.find((item: any) => item.title.en === "Tanya Yomi");
        
        let tanyaRef = tanyaItem?.url || "Tanya, Part I; Likkutei Amarim 1";
        
        // 4. Rambam
        const rambamItem1 = calData.calendar_items.find((item: any) => item.title.en === "Daily Rambam");
        const rambamItem3 = calData.calendar_items.find((item: any) => item.title.en === "Daily Rambam (3 Chapters)");
        
        const rambamRef = rambamChapters === 1 
          ? (rambamItem1?.url || "Mishneh Torah, Sabbath 1")
          : (rambamItem3?.url || "Mishneh Torah, Sabbath 1-3");

        const isToday = currentDate.toDateString() === new Date().toDateString();

        const getSeferHamitzvotData = async () => {
          // Try Chabad first for any date
          const chabadData = await fetchChabadSeferHamitzvot(currentDate);
          if (chabadData) return chabadData;

          // Fallback to Sefaria
          const seferHamitzvotItem = calData.calendar_items.find((item: any) => 
            item.title.en.toLowerCase().includes("sefer hamitzvot") || 
            item.title.en.toLowerCase().includes("book of mitzvot")
          );
          let refs = seferHamitzvotItem?.url ? [seferHamitzvotItem.url] : [];
          if (refs.length === 0) {
            try {
              const rambam3ChaptersRef = rambamItem3?.url || "Mishneh Torah, Sabbath 1-3";
              const refPromise = getChabadSeferHamitzvotRef(currentDate, rambam3ChaptersRef);
              const timeoutPromise = new Promise<string[]>((_, reject) => 
                setTimeout(() => reject(new Error('Timeout fetching Sefer HaMitzvot ref')), 20000)
              );
              refs = await Promise.race([refPromise, timeoutPromise]);
            } catch (e) {
              refs = ["Sefer HaMitzvot, Positive Commandments 1"];
            }
          }
          return fetchMultipleTexts(refs);
        };

        const [chumashText, rashiText, onkelosText, tehillimText, rambamText, seferHamitzvotText, hayomYomText] = await Promise.all([
          fetchText(chumashRef).catch(() => ({ he: [], text: [], heRef: chumashRef, error: true })),
          fetchText(rashiRef).catch(() => ({ he: [], text: [], heRef: rashiRef, error: true })), 
          fetchText(onkelosRef).catch(() => ({ he: [], text: [], heRef: onkelosRef, error: true })), 
          fetchText(tehillimRef).catch(() => ({ he: [], text: [], heRef: tehillimRef, error: true })),
          fetchText(rambamRef).catch(() => ({ he: [], text: [], heRef: rambamRef, error: true })),
          getSeferHamitzvotData().catch(() => ({ he: [], text: [], heRef: 'Sefer HaMitzvot', error: true })),
          fetchChabadHayomYom(currentDate).catch(() => ({ ref: 'Hayom Yom', he: [], text: [], heRef: 'היום יום', error: true }))
        ]);

        // Fetch Tanya with special logic for daily segments
        let tanyaTextData: any = { he: [], heRef: "" };
        if (tanyaItem?.url) {
          const parts = tanyaItem.url.split('.');
          const book = parts[0];
          const chapter = parseInt(parts[1]);
          const verse = parseInt(parts[2]) || 1;
          
          const tomorrowParts = tanyaTomorrowItem?.url?.split('.') || [];
          const tomorrowBook = tomorrowParts[0];
          const tomorrowChapter = parseInt(tomorrowParts[1]);
          const tomorrowVerse = parseInt(tomorrowParts[2]) || 1;
          
          if (!isNaN(chapter)) {
            const chapterRef = `${book}.${chapter}`;
            const chapterData = await fetchText(chapterRef);
            
            if (chapterData.he && Array.isArray(chapterData.he)) {
              let endVerse = chapterData.he.length;
              if (book === tomorrowBook && chapter === tomorrowChapter) {
                endVerse = tomorrowVerse - 1;
              }
              tanyaTextData = {
                ref: tanyaItem.url,
                heRef: chapterData.heRef,
                he: chapterData.he.slice(verse - 1, endVerse)
              };
            } else {
              tanyaTextData = chapterData;
            }
          } else {
            tanyaTextData = await fetchText(tanyaRef);
          }
        } else {
          tanyaTextData = await fetchText(tanyaRef);
        }

        // Vocalize Sefer Hamitzvot and Hayom Yom
        let vocalizedSeferHamitzvot = seferHamitzvotText.he;
        let nowVocalizedSH = false;
        try {
          if (seferHamitzvotText.he && Array.isArray(seferHamitzvotText.he) && seferHamitzvotText.he.length > 0) {
            vocalizedSeferHamitzvot = await vocalizeArray(seferHamitzvotText.he);
            nowVocalizedSH = true;
          }
        } catch (e) {
          console.error("Vocalization error for Sefer Hamitzvot:", e);
        }

        let vocalizedHayomYom = hayomYomText?.he;
        let nowVocalizedHY = false;
        try {
          if (hayomYomText?.he && Array.isArray(hayomYomText.he) && hayomYomText.he.length > 0) {
            vocalizedHayomYom = await vocalizeArray(hayomYomText.he);
            nowVocalizedHY = true;
          }
        } catch (e) {
          console.error("Vocalization error for Hayom Yom:", e);
        }

        if (!isMounted) return;

        const aliyotNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שביעי"];
        const aliyahName = aliyotNames[currentDate.getDay()];

        const finalData = {
          chumash: { 
            ref: chumashRef, 
            text: cleanHebrewText(chumashText.he), 
            heRef: chumashText.heRef ? `${chumashText.heRef} - ${aliyahName}` : aliyahName, 
            rashiText: cleanHebrewText(rashiText.he), 
            onkelosText: cleanHebrewText(onkelosText.he) 
          },
          tehillim: { 
            ref: tehillimRef, 
            text: cleanHebrewText(tehillimText.he), 
            heRef: tehillimText.heRef 
          },
          tanya: { 
            ref: tanyaRef, 
            text: cleanHebrewText(tanyaTextData.he), 
            heRef: tanyaTextData.heRef 
          },
          rambam: { 
            ref: rambamRef, 
            text: cleanHebrewText(rambamText.he), 
            heRef: rambamText.heRef 
          },
          seferHamitzvot: { 
            ref: seferHamitzvotText.ref, 
            text: cleanHebrewText(vocalizedSeferHamitzvot), 
            heRef: seferHamitzvotText.heRef,
            vocalized: nowVocalizedSH
          },
          hayomYom: {
            ref: hayomYomText?.ref || 'Hayom Yom',
            text: cleanHebrewText(vocalizedHayomYom || []),
            heRef: hayomYomText?.heRef || 'היום יום',
            vocalized: nowVocalizedHY
          }
        };

        dataCache.set(dateKey, { hebrewDate: todayHeb.hebrew, data: finalData });
        if (isMounted) {
          setData(finalData);
        }

      } catch (err: any) {
        if (!isMounted) return;
        console.error(err);
        setError(err.message || 'אירעה שגיאה בטעינת הנתונים');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchDailyStudy();
    return () => { isMounted = false; };
  }, [currentDate, rambamChapters]);

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    let ticking = false;

    const handleScroll = () => {
      if (isResettingRef.current) return;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          setIsAtTop(prev => {
            const isNowAtTop = currentScrollY < 100;
            return prev === isNowAtTop ? prev : isNowAtTop;
          });
          ticking = false;
        });
        ticking = true;
      }

      // Debounce saving exact scroll position and progress to avoid constant re-renders
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (isResettingRef.current) return;
        const currentScrollY = window.scrollY;
        
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (totalHeight > 0) {
          const progress = Math.round((currentScrollY / totalHeight) * 100);
          setTabProgress(prev => {
            const currentVal = prev[activeTab] || 0;
            const newVal = Math.max(currentVal, Math.min(100, progress));
            if (currentVal !== newVal) {
              return { ...prev, [activeTab]: newVal };
            }
            return prev;
          });
        }

        if (currentScrollY > 100) {
          const dateKey = getLocalIsoDate(currentDate);
          const bookmarkKey = `${dateKey}_${activeTab}`;
          setLastScrollPos(prev => {
            if (prev[bookmarkKey] === currentScrollY) return prev;
            return {
              ...prev,
              [bookmarkKey]: currentScrollY
            };
          });
        }
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [activeTab, data, currentDate]);

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
    window.scrollTo(0, 0);
  };

  const handleShare = async () => {
    const url = getShareUrl();
    
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  const getShareUrl = () => {
    const dateStr = getLocalIsoDate(currentDate);
    return `${window.location.origin}${window.location.pathname}?date=${dateStr}&tab=${activeTab}`;
  };

  const resumeStudy = () => {
    const dateKey = getLocalIsoDate(currentDate);
    const bookmarkKey = `${dateKey}_${activeTab}`;
    const savedPos = lastScrollPos[bookmarkKey];
    if (savedPos) {
      window.scrollTo({
        top: savedPos,
        behavior: 'smooth'
      });
    }
  };

  const resetProgress = () => {
    isResettingRef.current = true;
    
    setTabProgress(prev => ({
      ...prev,
      [activeTab]: 0
    }));
    
    // Also clear the bookmark for this tab
    const dateKey = getLocalIsoDate(currentDate);
    const bookmarkKey = `${dateKey}_${activeTab}`;
    setLastScrollPos(prev => {
      const next = { ...prev };
      delete next[bookmarkKey];
      return next;
    });
    
    // Scroll to top
    window.scrollTo(0, 0);
    
    // Re-enable scroll tracking after animation completes
    setTimeout(() => {
      isResettingRef.current = false;
    }, 100);
  };

  const shareWhatsApp = () => {
    const url = getShareUrl();
    const text = `שיעור ${tabs.find(t => t.id === activeTab)?.label} יומי - ${data?.[activeTab].heRef}: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareFacebook = () => {
    const url = getShareUrl();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  const shareEmail = () => {
    const url = getShareUrl();
    const subject = `שיעור ${tabs.find(t => t.id === activeTab)?.label} יומי`;
    const body = `שלום,\n\nמצורף קישור לשיעור ${tabs.find(t => t.id === activeTab)?.label} יומי - ${data?.[activeTab].heRef}:\n${url}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const handleSendFeedback = () => {
    if (!feedbackText.trim()) return;
    const subject = 'משוב על אפליקציית חת"ת ורמב"ם יומי';
    const body = feedbackText;
    window.open(`mailto:shlomi777031@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    setShowFeedbackModal(false);
    setFeedbackText('');
  };

  const highlightText = (text: string): React.ReactNode => {
    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };

  const stripHtml = (html: string): string => {
    if (!html) return "";
    return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const renderChumashWithCommentaries = (chumash: any, rashi: any, onkelos: any, verseOffset: number = 1): React.ReactNode => {
    if (!chumash) return null;
    
    if (typeof chumash === 'string') {
      const rashiComments = Array.isArray(rashi) ? rashi : (rashi ? [rashi] : []);
      const onkelosVerse = onkelos || '';
      
      const verseKey = `chumash_${verseOffset}_${stripHtml(chumash).substring(0, 20)}`;
      
      return (
        <div className="mb-10 print:mb-6 relative group">
          <div 
            onClick={() => handlePshatClick(chumash, `פירוש פשט - פסוק ${numberToHebrew(verseOffset)}`, 'chumash')}
            className={`mb-5 leading-[var(--leading-sacred)] flex items-start gap-3 font-bold text-[var(--color-luxury-ink)] group ${showChumashPshat ? 'cursor-help hover:bg-[var(--color-luxury-gold-light)] p-2 rounded-xl transition-colors' : ''}`}
          >
            <span className="text-sm text-[var(--color-luxury-gold)] font-bold mt-1 select-none min-w-[28px] opacity-70">
              {numberToHebrew(verseOffset)}
            </span>
            <span className="flex-1">
              {highlightText(chumash)}
            </span>
          </div>
          
          {enableChumashImages && (
            <div className="mr-10 mb-4 print:hidden">
              {!chumashImages[verseKey] && !loadingImages[verseKey] && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleGenerateImage(chumash, verseKey); }}
                  className="flex items-center gap-2 text-xs font-bold text-[var(--color-luxury-gold)] bg-[var(--color-luxury-gold-light)] px-3 py-1.5 rounded-full hover:bg-[var(--color-luxury-gold)] hover:text-white transition-colors border border-[var(--color-luxury-gold)]/30"
                >
                  <Sparkles className="w-3 h-3" />
                  צור תמונה לפסוק
                </button>
              )}
              {loadingImages[verseKey] && (
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full inline-flex">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  מייצר תמונה (ננו בננה 2)...
                </div>
              )}
              {chumashImages[verseKey] && (
                <div className="mt-3 rounded-xl overflow-hidden border border-[var(--color-luxury-border)] shadow-sm relative group/img">
                  <img 
                    src={chumashImages[verseKey]} 
                    alt={`תמונה לפסוק ${numberToHebrew(verseOffset)}`} 
                    className="w-full h-auto max-h-[400px] object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover/img:opacity-100 transition-opacity">
                    ננו בננה 2
                  </div>
                </div>
              )}
            </div>
          )}
          
          {showOnkelos && onkelosVerse && (
            <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 p-4 rounded-xl text-[var(--color-luxury-ink)] mb-4 mr-10 italic leading-relaxed" style={{ fontSize: `${Math.max(14, fontSize * 0.9)}px` }}>
              <div className="font-bold text-xs text-gray-400 mb-1 flex items-center gap-2">
                <ScrollText className="w-3 h-3" />
                תרגום אונקלוס:
              </div>
              {highlightText(onkelosVerse)}
            </div>
          )}

          {showRashi && rashiComments.length > 0 && rashiComments.some(c => c) && (
            <div className="bg-[var(--color-luxury-gold-light)] border border-[var(--color-luxury-border)] p-6 rounded-2xl text-[var(--color-luxury-ink)] shadow-sm mr-10 relative overflow-hidden print:bg-gray-50 print:mr-4 print:p-4" style={{ fontSize: `${Math.max(14, fontSize * 0.8)}px` }}>
              <div className="absolute top-0 right-0 w-1 h-full bg-[var(--color-luxury-gold)]"></div>
              <div className="font-bold text-sm text-[var(--color-luxury-gold)] mb-3 flex items-center gap-2 print:text-black">
                <BookOpen className="w-4 h-4" />
                פירוש רש"י:
              </div>
              {rashiComments.map((comment: any, i: number) => (
                comment ? <div key={i} className="mb-3 last:mb-0 leading-relaxed text-justify">
                  {highlightText(comment)}
                </div> : null
              ))}
            </div>
          )}
        </div>
      );
    }
    
    if (Array.isArray(chumash)) {
      if (chumash.length > 0 && Array.isArray(chumash[0])) {
        // It's a 2D array (multiple chapters)
        let currentVerseOffset = verseOffset;
        return chumash.map((chapter, chapterIndex) => {
          const chapterRashi = rashi ? rashi[chapterIndex] : null;
          const chapterOnkelos = onkelos ? onkelos[chapterIndex] : null;
          const renderedChapter = renderChumashWithCommentaries(chapter, chapterRashi, chapterOnkelos, currentVerseOffset);
          currentVerseOffset += chapter.length;
          return <React.Fragment key={chapterIndex}>{renderedChapter}</React.Fragment>;
        });
      } else {
        // It's a 1D array (verses in a single chapter)
        return chumash.map((item, index) => (
          <React.Fragment key={index}>
            {renderChumashWithCommentaries(item, rashi ? rashi[index] : null, onkelos ? onkelos[index] : null, verseOffset + index)}
          </React.Fragment>
        ));
      }
    }
    
    return null;
  };

  const renderTehillim = (text: any, ref: string): React.ReactNode => {
    if (!text) return null;
    
    let startChapter = 1;
    const match = ref?.match(/(\d+)(?:-(\d+))?$/);
    if (match) {
      startChapter = parseInt(match[1]);
    }

    if (typeof text === 'string') {
      return <div className="mb-6 leading-[var(--leading-sacred)] font-bold text-[var(--color-luxury-ink)]">{highlightText(text)}</div>;
    }
    
    if (Array.isArray(text)) {
      if (text.length > 0 && Array.isArray(text[0])) {
        // Multiple chapters
        return text.map((chapter, chapterIndex) => (
          <div key={chapterIndex} className="mb-10 print:mb-6">
            <h3 className="text-2xl font-black mb-6 text-[var(--color-luxury-gold)] border-b border-[var(--color-luxury-border)] pb-2 inline-block print:text-black">פרק {numberToHebrew(startChapter + chapterIndex)}</h3>
            <div className="text-justify leading-[var(--leading-sacred)]">
              {chapter.map((verse: string, verseIndex: number) => (
                <span key={verseIndex} className="inline font-bold text-[var(--color-luxury-ink)]">
                  <span className="text-sm text-[var(--color-luxury-gold)] font-bold select-none opacity-70 print:text-black ml-1.5">
                    {numberToHebrew(verseIndex + 1)}
                  </span>
                  <span className="ml-3 inline">
                    {highlightText(verse)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ));
      } else {
        // Single chapter
        return (
          <div className="mb-10 print:mb-6">
            <h3 className="text-2xl font-black mb-6 text-[var(--color-luxury-gold)] border-b border-[var(--color-luxury-border)] pb-2 inline-block print:text-black">פרק {numberToHebrew(startChapter)}</h3>
            <div className="text-justify leading-[var(--leading-sacred)]">
              {text.map((verse: string, verseIndex: number) => (
                <span key={verseIndex} className="inline font-bold text-[var(--color-luxury-ink)]">
                  <span className="text-sm text-[var(--color-luxury-gold)] font-bold select-none opacity-70 print:text-black ml-1.5">
                    {numberToHebrew(verseIndex + 1)}
                  </span>
                  <span className="ml-3 inline">
                    {highlightText(verse)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        );
      }
    }
    return null;
  };

  const renderHayomYom = (text: any): React.ReactNode => {
    if (!text || (Array.isArray(text) && text.length === 0)) {
      return (
        <div className="text-center text-gray-500 mt-8">
          לא נמצא תוכן ליום זה
        </div>
      );
    }
    
    if (Array.isArray(text)) {
      return (
        <div className="space-y-6">
          {text.map((item, index) => {
            const isHeader = item.startsWith('ליום');
            return (
              <div key={index} className={`leading-[var(--leading-sacred)] text-[var(--color-luxury-ink)] text-justify px-4 md:px-8 ${isHeader ? 'font-black text-xl text-center text-[var(--color-luxury-gold)] mt-8 mb-4' : 'font-bold border-r-4 border-[var(--color-luxury-gold)]/20'}`}>
                {highlightText(item)}
              </div>
            );
          })}
        </div>
      );
    }
    
    if (typeof text === 'string') {
      const isHeader = text.startsWith('ליום');
      return (
        <div className={`leading-[var(--leading-sacred)] text-[var(--color-luxury-ink)] text-justify px-4 md:px-8 ${isHeader ? 'font-black text-xl text-center text-[var(--color-luxury-gold)] mt-8 mb-4' : 'font-bold border-r-4 border-[var(--color-luxury-gold)]/20'}`}>
          {highlightText(text)}
        </div>
      );
    }
    
    return null;
  };

  const renderSeferHamitzvot = (text: any): React.ReactNode => {
    if (!text) return null;
    
    // Handle the object structure from fetchMultipleTexts or fetchChabadSeferHamitzvot
    if (typeof text === 'object' && !Array.isArray(text) && text.heRef && text.he) {
      // Extract the mitzvah name from heRef (e.g., "ספר המצוות, מצוות עשה א׳" -> "מצוות עשה א׳")
      let mitzvahTitle = text.heRef;
      if (mitzvahTitle.includes(',')) {
        const parts = mitzvahTitle.split(',');
        mitzvahTitle = parts[parts.length - 1].trim();
      }
      
      return (
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-[var(--color-luxury-gold)] to-transparent opacity-30"></div>
            <div className="flex flex-col items-center">
              <span className="text-[var(--color-luxury-gold)] font-black text-2xl px-8 py-3 bg-[var(--color-luxury-surface)] rounded-full border-2 border-[var(--color-luxury-gold)] shadow-md transform hover:scale-105 transition-transform duration-300">
                {highlightText(mitzvahTitle)}
              </span>
            </div>
            <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-[var(--color-luxury-gold)] to-transparent opacity-30"></div>
          </div>
          <div className="space-y-6">
            {typeof text.he === 'string' ? (
              <div 
                onClick={() => handlePshatClick(text.he, `פירוש פשט - ${mitzvahTitle}`, 'seferHamitzvot')}
                className={`leading-[var(--leading-sacred)] font-bold text-[var(--color-luxury-ink)] text-justify px-4 md:px-8 border-r-4 border-[var(--color-luxury-gold)]/20 ${showSeferHamitzvotPshat ? 'cursor-help hover:bg-[var(--color-luxury-gold-light)] p-2 rounded-xl transition-colors' : ''}`}
              >
                {highlightText(text.he)}
              </div>
            ) : renderSeferHamitzvot(text.he)}
          </div>
        </div>
      );
    }
    
    if (typeof text === 'string') {
      // Improved regex to catch more variations of Mitzvah titles
      const mitzvahMatch = text.match(/^((?:מצוה|מצווה|מצוות|מצות|לא תעשה|עשה)\s+(?:עשה\s+|לא תעשה\s+)?(?:מצוה\s+|מצווה\s+)?(?:[א-ת"']+))\s*[:-]\s*(.*)/i);
      
      if (mitzvahMatch) {
        return (
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-[var(--color-luxury-gold)] to-transparent opacity-30"></div>
              <div className="flex flex-col items-center">
                <span className="text-[var(--color-luxury-gold)] font-black text-2xl px-8 py-3 bg-[var(--color-luxury-surface)] rounded-full border-2 border-[var(--color-luxury-gold)] shadow-md transform hover:scale-105 transition-transform duration-300">
                  {highlightText(mitzvahMatch[1])}
                </span>
              </div>
              <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-[var(--color-luxury-gold)] to-transparent opacity-30"></div>
            </div>
            <div 
              onClick={() => handlePshatClick(mitzvahMatch[2], `פירוש פשט - ${mitzvahMatch[1]}`, 'seferHamitzvot')}
              className={`leading-[var(--leading-sacred)] font-bold text-[var(--color-luxury-ink)] text-justify px-4 md:px-8 border-r-4 border-[var(--color-luxury-gold)]/20 ${showSeferHamitzvotPshat ? 'cursor-help hover:bg-[var(--color-luxury-gold-light)] p-2 rounded-xl transition-colors' : ''}`}
            >
              {highlightText(mitzvahMatch[2])}
            </div>
          </div>
        );
      }

      return (
        <div 
          onClick={() => handlePshatClick(text, 'פירוש פשט - ספר המצוות', 'seferHamitzvot')}
          className={`mb-6 leading-[var(--leading-sacred)] font-bold text-[var(--color-luxury-ink)] text-justify px-4 md:px-8 ${showSeferHamitzvotPshat ? 'cursor-help hover:bg-[var(--color-luxury-gold-light)] p-2 rounded-xl transition-colors' : ''}`}
        >
          {highlightText(text)}
        </div>
      );
    }
    
    if (Array.isArray(text)) {
      return (
        <div className="space-y-8 mt-4">
          {text.map((item, index) => (
            <div key={index} className="relative">
              {renderSeferHamitzvot(item)}
            </div>
          ))}
        </div>
      );
    }
    
    return null;
  };

  const renderText = (text: any): React.ReactNode => {
    if (!text) return null;
    if (typeof text === 'string') {
      return highlightText(text + ' ');
    }
    if (Array.isArray(text)) {
      return text.map((item, index) => (
        <div key={index} className="mb-6 leading-[var(--leading-sacred)] font-bold text-[var(--color-luxury-ink)]">
          {renderText(item)}
        </div>
      ));
    }
    return null;
  };

  const handleGenerateImage = async (verseText: string, verseKey: string) => {
    if (!verseText.trim()) return;

    setLoadingImages(prev => ({ ...prev, [verseKey]: true }));
    try {
      const imageUrl = await generateChumashImage(verseText);
      setChumashImages(prev => ({ ...prev, [verseKey]: imageUrl }));
    } catch (error: any) {
      console.error("Failed to generate image:", error);
      if (error.message === "API_KEY_REQUIRED" || error.message?.includes("Requested entity was not found")) {
        alert("שגיאה: מפתח API חסר. אנא הגדר VITE_GEMINI_API_KEY בהגדרות הסביבה.");
      } else {
        alert("Failed to generate image. Please try again.");
      }
    } finally {
      setLoadingImages(prev => ({ ...prev, [verseKey]: false }));
    }
  };

  const handlePshatClick = async (originalText: any, title: string, type: 'rambam' | 'chumash' | 'seferHamitzvot' | 'tanya', lengthOverride?: 'short' | 'long') => {
    // Convert array to string if needed
    const textToProcess = Array.isArray(originalText) ? originalText.join(' ') : String(originalText || '');
    if (!textToProcess.trim()) return;

    const cleanOriginal = stripHtml(textToProcess);

    setPshatLoading(true);
    setActivePshat({ title, text: '', original: cleanOriginal, type });
    
    try {
      let pshat = "";
      if (type === 'rambam') pshat = await getRambamPshat(textToProcess, lengthOverride || rambamExplanationLength);
      else if (type === 'chumash') pshat = await getChumashPshat(textToProcess);
      else if (type === 'seferHamitzvot') pshat = await getSeferHamitzvotPshat(textToProcess);
      else if (type === 'tanya') pshat = await getTanyaPshat(textToProcess);
      
      setActivePshat(prev => prev ? { ...prev, text: pshat } : null);
    } catch (error) {
      console.error("Error getting pshat:", error);
    } finally {
      setPshatLoading(false);
    }
  };

  const renderTanya = (text: any): React.ReactNode => {
    if (!text) return null;
    if (typeof text === 'string') {
      return (
        <div 
          onClick={() => handlePshatClick(text, 'פירוש פשט - תניא', 'tanya')}
          className={`mb-6 leading-[var(--leading-sacred)] font-bold text-[var(--color-luxury-ink)] ${showTanyaPshat ? 'cursor-help hover:bg-[var(--color-luxury-gold-light)] p-2 rounded-xl transition-colors' : ''}`}
        >
          {highlightText(text + ' ')}
        </div>
      );
    }
    if (Array.isArray(text)) {
      return text.map((item, index) => (
        <div key={index}>
          {renderTanya(item)}
        </div>
      ));
    }
    return null;
  };

  const renderRambam = (text: any, ref: string): React.ReactNode => {
    if (!text) return null;
    
    let startChapter = 1;
    const match = ref?.match(/(\d+)(?:-(\d+))?$/);
    if (match) {
      startChapter = parseInt(match[1]);
    }

    if (typeof text === 'string') {
      return <div className="mb-6 leading-[var(--leading-sacred)] font-bold text-[var(--color-luxury-ink)]">{highlightText(text)}</div>;
    }
    if (Array.isArray(text)) {
      if (text.length > 0 && Array.isArray(text[0])) {
        return text.map((chapter, chapterIndex) => (
          <div key={chapterIndex} className="mb-10 print:mb-6">
            <h3 className="text-2xl font-black mb-6 text-[var(--color-luxury-gold)] border-b border-[var(--color-luxury-border)] pb-2 inline-block print:text-black">פרק {numberToHebrew(startChapter + chapterIndex)}</h3>
            {chapter.map((halacha: string, halachaIndex: number) => (
              <div 
                key={halachaIndex} 
                onClick={() => handlePshatClick(halacha, `פירוש פשט - הלכה ${numberToHebrew(halachaIndex + 1)}`, 'rambam')}
                className={`mb-5 leading-[var(--leading-sacred)] flex items-start gap-3 font-bold text-[var(--color-luxury-ink)] group ${showRambamPshat ? 'cursor-help hover:bg-[var(--color-luxury-gold-light)] p-2 rounded-xl transition-colors' : ''}`}
              >
                <span className="text-sm text-[var(--color-luxury-gold)] font-bold mt-1 select-none min-w-[28px] opacity-70">
                  {numberToHebrew(halachaIndex + 1)}
                </span>
                <span className="flex-1">
                  {highlightText(halacha)}
                </span>
              </div>
            ))}
          </div>
        ));
      } else {
        return (
          <div className="mb-10 print:mb-6">
            <h3 className="text-2xl font-black mb-6 text-[var(--color-luxury-gold)] border-b border-[var(--color-luxury-border)] pb-2 inline-block print:text-black">פרק {numberToHebrew(startChapter)}</h3>
            {text.map((halacha, index) => (
              <div 
                key={index} 
                onClick={() => handlePshatClick(halacha as string, `פירוש פשט - הלכה ${numberToHebrew(index + 1)}`, 'rambam')}
                className={`mb-5 leading-[var(--leading-sacred)] flex items-start gap-3 font-bold text-[var(--color-luxury-ink)] group ${showRambamPshat ? 'cursor-help hover:bg-[var(--color-luxury-gold-light)] p-2 rounded-xl transition-colors' : ''}`}
              >
                <span className="text-sm text-[var(--color-luxury-gold)] font-bold mt-1 select-none min-w-[28px] opacity-70">
                  {numberToHebrew(index + 1)}
                </span>
                <span className="flex-1">
                  {highlightText(halacha as string)}
                </span>
              </div>
            ))}
          </div>
        );
      }
    }
    return null;
  };

  const tabs = [
    { id: 'chumash', label: 'חומש', icon: BookOpen },
    { id: 'tehillim', label: 'תהילים', icon: ScrollText },
    { id: 'tanya', label: 'תניא', icon: Book },
    { id: 'rambam', label: 'רמב"ם', icon: Library },
    { id: 'seferHamitzvot', label: 'ספר המצוות', icon: ShieldCheck },
    { id: 'hayomYom', label: 'היום יום', icon: Sun },
  ] as const;

  return (
    <div className="min-h-[100dvh] bg-[var(--color-luxury-bg)] text-[var(--color-luxury-ink)] font-sans selection:bg-[var(--color-luxury-gold-light)] selection:text-[var(--color-luxury-ink)] transition-colors duration-300" dir="rtl">
      {/* Header */}
      <header className="bg-white dark:bg-black shadow-sm sticky top-0 z-10 border-b border-[var(--color-luxury-border)] print:hidden">
        <div className="max-w-6xl mx-auto px-2 md:px-4 py-2 text-center">
          <div className="flex flex-row items-start justify-between relative mb-2 md:mb-0.5 gap-2 md:gap-0 min-h-[40px] md:min-h-[32px]">
            <div className="flex flex-col items-start md:items-center md:justify-center flex-1 md:w-full md:absolute md:inset-0 md:pointer-events-none pr-1">
              <h1 className="text-sm sm:text-base md:text-xl font-black text-[var(--color-luxury-ink)] font-serif tracking-tight leading-tight md:leading-normal line-clamp-2 md:line-clamp-none">
                שיעורי חת"ת ורמב"ם היומי
              </h1>
              <div className="text-[8px] md:text-[9px] text-gray-400 font-serif italic opacity-70">
                לע״נ ר׳ נדב יהודה בן אבישי
              </div>
            </div>
            
            {/* Empty div to balance flex-between on desktop if needed, but we use absolute for title on desktop */}
            <div className="hidden md:block w-1/3"></div>

            <div className="flex items-center justify-end gap-0.5 md:gap-1 flex-wrap flex-shrink-0 md:w-1/3 relative z-10 pl-1">
              {/* Zoom Controls */}
              <div className="flex items-center ml-1 md:ml-2 border-r border-[var(--color-luxury-border)] pr-1 md:pr-2">
                <button onClick={() => setFontSize(f => Math.min(f + 2, 40))} className="p-1.5 md:p-2 rounded-full hover:bg-[var(--color-luxury-gold-light)] text-[var(--color-luxury-gold)] transition-colors" title="הגדל טקסט">
                  <ZoomIn className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <button onClick={() => setFontSize(f => Math.max(f - 2, 14))} className="p-1.5 md:p-2 rounded-full hover:bg-[var(--color-luxury-gold-light)] text-[var(--color-luxury-gold)] transition-colors" title="הקטן טקסט">
                  <ZoomOut className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>

              {/* Share Button */}
              <div className="relative">
                <button 
                  onClick={() => setShowShareMenu(!showShareMenu)} 
                  className="p-1.5 md:p-2 rounded-full hover:bg-[var(--color-luxury-gold-light)] text-[var(--color-luxury-gold)] transition-colors" 
                  title="שתף"
                >
                  <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                {showShareMenu && (
                  <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-[var(--color-luxury-border)] rounded-2xl shadow-xl p-2 flex gap-2 z-30 animate-share-menu">
                    <button 
                      onClick={() => { shareWhatsApp(); setShowShareMenu(false); }} 
                      className="p-2 hover:bg-green-50 dark:hover:bg-green-900/30 text-green-600 rounded-full transition-colors" 
                      title="שתף בווצאפ"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => { shareFacebook(); setShowShareMenu(false); }} 
                      className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 rounded-full transition-colors" 
                      title="שתף בפייסבוק"
                    >
                      <Facebook className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => { shareEmail(); setShowShareMenu(false); }} 
                      className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full transition-colors" 
                      title="שתף במייל"
                    >
                      <Mail className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => { handleShare(); setShowShareMenu(false); }} 
                      className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full transition-colors" 
                      title="העתק קישור"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowFeedbackModal(true)} 
                className="p-1.5 md:p-2 rounded-full hover:bg-[var(--color-luxury-gold-light)] text-[var(--color-luxury-gold)] transition-colors"
                title="שלח משוב"
              >
                <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button 
                onClick={() => setShowSettings(true)} 
                className="p-1.5 md:p-2 rounded-full hover:bg-[var(--color-luxury-gold-light)] text-[var(--color-luxury-gold)] transition-colors"
                title="הגדרות תצוגה"
              >
                <SettingsIcon className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>
          
          {/* Date Navigation */}
          <div className="flex flex-col items-center justify-center mb-0.5 mt-1 md:mt-0">
            <div className="flex items-center justify-center gap-4 md:gap-6">
              <button 
                onClick={() => changeDate(-1)}
                className="p-1 rounded-full hover:bg-[var(--color-luxury-gold-light)] text-[var(--color-luxury-ink)] transition-colors border border-transparent hover:border-[var(--color-luxury-border)]"
                aria-label="היום הקודם"
              >
                <ChevronRight className="w-5 h-5 font-bold" />
              </button>
              
              <div className="tracking-wide text-center">
                {hebrewDate && <div className="text-base md:text-lg font-black text-[var(--color-luxury-gold)] font-serif">{hebrewDate}</div>}
                <div className="text-[10px] md:text-xs font-medium text-gray-400 dark:text-gray-500 opacity-80 mt-0.5">{new Intl.DateTimeFormat('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(currentDate)}</div>
              </div>
              
              <button 
                onClick={() => changeDate(1)}
                className="p-1 rounded-full hover:bg-[var(--color-luxury-gold-light)] text-[var(--color-luxury-ink)] transition-colors border border-transparent hover:border-[var(--color-luxury-border)]"
                aria-label="היום הבא"
              >
                <ChevronLeft className="w-5 h-5 font-bold" />
              </button>
            </div>
          </div>
          
          {currentDate.toDateString() !== new Date().toDateString() && (
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="text-xs text-[var(--color-luxury-gold)] hover:text-[var(--color-luxury-ink)] transition-colors font-medium border-b border-transparent hover:border-[var(--color-luxury-ink)] pb-0.5"
            >
              חזור להיום
            </button>
          )}
        </div>
        
        {/* Tabs */}
        <div className="flex overflow-x-auto border-t border-[var(--color-luxury-border)] hide-scrollbar bg-white dark:bg-black relative">
          {/* Progress Bar for Active Tab */}
          <div 
            className="absolute top-0 right-0 h-0.5 bg-[var(--color-luxury-gold)] transition-all duration-300 z-20" 
            style={{ width: `${tabProgress[activeTab]}%` }}
          ></div>
          
          <div className="flex max-w-5xl mx-auto w-full px-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const progress = tabProgress[tab.id];
              const isCompleted = progress >= 95; // 95% is practically completed

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    window.scrollTo(0, 0);
                  }}
                  className={`flex-1 flex flex-col items-center justify-center py-1 px-2 min-w-[70px] transition-all duration-300 border-b-2 relative ${
                    isActive 
                      ? 'border-[var(--color-luxury-gold)] text-[var(--color-luxury-gold)] bg-[var(--color-luxury-gold-light)]' 
                      : 'border-transparent text-gray-400 hover:text-[var(--color-luxury-ink)] hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
                >
                  <div className="relative">
                    <Icon className="w-3.5 h-3.5 mb-0.5" />
                    {isCompleted && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5 border border-white">
                        <Check className="w-2 h-2" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] md:text-xs font-bold tracking-wide">{tab.label}</span>
                    <div className="w-10 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-[var(--color-luxury-gold)]'}`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-2 md:px-4 py-2 pb-24 print:pb-0 print:pt-0 print:max-w-none print:px-0 min-h-[60vh]">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-[var(--color-luxury-gold)] print:hidden"
            >
              <Loader2 className="w-12 h-12 animate-spin mb-6" />
              <p className="font-serif text-lg">טוען את שיעורי היום...</p>
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 px-6 bg-[var(--color-luxury-bg)] text-center animate-in fade-in duration-500 print:hidden"
            >
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6 text-red-600 animate-pulse">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black mb-4 text-[var(--color-luxury-ink)]">אופס! משהו השתבש</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md leading-relaxed">
                {error}
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-[var(--color-luxury-gold)] text-white rounded-full font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                נסה שוב
              </button>
            </motion.div>
          ) : data ? (
            <motion.div 
              key={activeTab + getLocalIsoDate(currentDate)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white dark:bg-black rounded-2xl md:rounded-3xl shadow-lg border border-[var(--color-luxury-border)] p-3 md:p-6 relative overflow-hidden print:shadow-none print:border-none print:p-0 print:rounded-none">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[var(--color-luxury-gold)] via-[var(--color-luxury-gold-light)] to-[var(--color-luxury-gold)] opacity-50 print:hidden"></div>
              
              {/* Resume Bookmark Button */}
              {(() => {
                const dateKey = getLocalIsoDate(currentDate);
                const bookmarkKey = `${dateKey}_${activeTab}`;
                const savedPos = lastScrollPos[bookmarkKey];
                // Only show if we have a saved position and we are currently at the top
                return savedPos && savedPos > 200 && isAtTop ? (
                  <div className="mb-2 animate-in slide-in-from-top-2 duration-500 print:hidden">
                    <button 
                      onClick={resumeStudy}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-[var(--color-luxury-gold-light)] border border-[var(--color-luxury-gold)]/30 text-[var(--color-luxury-gold)] rounded-2xl font-bold hover:bg-[var(--color-luxury-gold)] hover:text-white transition-all group"
                    >
                      <Bookmark className="w-4 h-4 group-hover:fill-current" />
                      המשך מהנקודה האחרונה שקראת
                    </button>
                  </div>
                ) : null;
              })()}

              <div className="mb-2 border-b border-[var(--color-luxury-border)] pb-2 print:hidden">
                <div className="flex items-center justify-center">
                  <h2 className="text-xl md:text-2xl font-black text-[var(--color-luxury-ink)] font-serif text-center flex-1 print:text-black flex items-center justify-center gap-2">
                    {data[activeTab].heRef}
                    {((activeTab === 'seferHamitzvot' && data.seferHamitzvot.vocalized) || (activeTab === 'hayomYom' && data.hayomYom.vocalized)) && (
                      <span title="נוקד באמצעות בינה מלאכותית">
                        <Sparkles className="w-5 h-5 text-[var(--color-luxury-gold)] animate-pulse" />
                      </span>
                    )}
                  </h2>
                </div>
                
                {activeTab === 'rambam' && (
                  <div className="mt-2 flex justify-center gap-3 print:hidden">
                    <button
                      onClick={() => setRambamChapters(1)}
                      className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                        rambamChapters === 1 
                          ? 'bg-[var(--color-luxury-ink)] text-[var(--color-luxury-gold)] border border-[var(--color-luxury-ink)]' 
                          : 'bg-white dark:bg-gray-800 text-[var(--color-luxury-ink)] border border-[var(--color-luxury-border)] hover:bg-[var(--color-luxury-gold-light)]'
                      }`}
                    >
                      פרק אחד
                    </button>
                    <button
                      onClick={() => setRambamChapters(3)}
                      className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                        rambamChapters === 3 
                          ? 'bg-[var(--color-luxury-ink)] text-[var(--color-luxury-gold)] border border-[var(--color-luxury-ink)]' 
                          : 'bg-white dark:bg-gray-800 text-[var(--color-luxury-ink)] border border-[var(--color-luxury-border)] hover:bg-[var(--color-luxury-gold-light)]'
                      }`}
                    >
                      3 פרקים
                    </button>
                  </div>
                )}
              </div>
              
              <div 
                className="leading-[var(--leading-sacred)] text-[var(--color-luxury-ink)] font-serif text-justify print:text-black print:text-base"
                style={{ fontSize: `${fontSize}px` }}
              >
                {activeTab === 'chumash' 
                  ? (
                      <div className="animate-in slide-in-from-bottom-4 duration-200">
                        {renderChumashWithCommentaries(data.chumash.text, data.chumash.rashiText, data.chumash.onkelosText, data.chumash.ref.match(/:(\d+)/) ? parseInt(data.chumash.ref.match(/:(\d+)/)![1], 10) : 1)}
                      </div>
                    )
                  : activeTab === 'tehillim'
                    ? renderTehillim(data.tehillim.text, data.tehillim.ref)
                    : activeTab === 'tanya'
                      ? renderTanya(data.tanya.text)
                      : activeTab === 'rambam'
                        ? (
                            <div className="animate-in slide-in-from-bottom-4 duration-200">
                              {renderRambam(data.rambam.text, data.rambam.ref)}
                              
                              {data.hayomYom && (
                                <div className="mt-16 pt-12 border-t-2 border-[var(--color-luxury-gold)]/20">
                                  <div className="mb-10 text-center">
                                    <div className="inline-block px-4 py-1 bg-[var(--color-luxury-gold-light)] text-[var(--color-luxury-gold)] text-[10px] font-black tracking-widest uppercase rounded-full mb-3">
                                      לימוד משלים
                                    </div>
                                    <h2 className="text-3xl font-black text-[var(--color-luxury-gold)] mb-2 font-serif">היום יום</h2>
                                    <div className="text-sm text-gray-400 italic">{data.hayomYom.heRef}</div>
                                    <div className="w-24 h-1 bg-[var(--color-luxury-gold)] mx-auto mt-4 rounded-full opacity-30"></div>
                                  </div>
                                  {renderHayomYom(data.hayomYom.text)}
                                </div>
                              )}
                            </div>
                          )
                        : activeTab === 'seferHamitzvot'
                          ? (
                              <div className="animate-in slide-in-from-bottom-4 duration-200">
                                <div className="mb-10 text-center">
                                  <h2 className="text-3xl font-black text-[var(--color-luxury-gold)] mb-2 font-serif">ספר המצוות להרמב"ם</h2>
                                  <div className="text-sm text-gray-400 italic">{data.seferHamitzvot.heRef}</div>
                                  <div className="w-24 h-1 bg-[var(--color-luxury-gold)] mx-auto mt-4 rounded-full opacity-30"></div>
                                </div>
                                {renderSeferHamitzvot(data.seferHamitzvot.text)}
                              </div>
                            )
                        : activeTab === 'hayomYom'
                          ? (
                              <div className="animate-in slide-in-from-bottom-4 duration-200">
                                <div className="mb-10 text-center">
                                  <h2 className="text-3xl font-black text-[var(--color-luxury-gold)] mb-2 font-serif">היום יום</h2>
                                  <div className="text-sm text-gray-400 italic">{data.hayomYom.heRef}</div>
                                  <div className="w-24 h-1 bg-[var(--color-luxury-gold)] mx-auto mt-4 rounded-full opacity-30"></div>
                                </div>
                                {renderHayomYom(data.hayomYom.text)}
                              </div>
                            )
                          : null}
                
                {/* Reset Progress Button at the end of content */}
                <div className="mt-12 pt-8 border-t border-[var(--color-luxury-border)] flex justify-center print:hidden">
                  <button
                    onClick={resetProgress}
                    className="flex items-center gap-2 px-6 py-3 bg-[var(--color-luxury-gold-light)] text-[var(--color-luxury-gold)] rounded-full font-bold hover:bg-[var(--color-luxury-gold)] hover:text-white transition-all shadow-sm group"
                  >
                    <RotateCcw className="w-4 h-4 group-hover:rotate-[-180deg] transition-transform duration-500" />
                    <span>איפוס התקדמות בשיעור זה</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Settings Modal */}
        {showSettings && (
          <div 
            onClick={() => setShowSettings(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-100"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--color-luxury-surface)] w-full max-w-md rounded-3xl shadow-2xl border border-[var(--color-luxury-border)] overflow-hidden animate-in zoom-in-95 duration-100 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-[var(--color-luxury-ink)] font-serif">הגדרות תצוגה</h3>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--color-luxury-gold-light)] rounded-full transition-colors text-[var(--color-luxury-ink)]"
                  >
                    <span className="text-sm font-bold">סגור</span>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Dark Mode Toggle */}
                  <div className="flex items-center justify-between p-3 bg-[var(--color-luxury-bg)] rounded-xl border border-[var(--color-luxury-border)]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--color-luxury-surface)] rounded-lg shadow-sm">
                        {darkMode ? <Moon className="w-4 h-4 text-[var(--color-luxury-gold)]" /> : <Sun className="w-4 h-4 text-[var(--color-luxury-gold)]" />}
                      </div>
                      <span className="font-bold text-sm text-[var(--color-luxury-ink)]">מצב לילה</span>
                    </div>
                    <button 
                      onClick={() => setDarkMode(!darkMode)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${darkMode ? 'bg-[var(--color-luxury-gold)]' : 'bg-[var(--color-luxury-border)]'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${darkMode ? 'right-5.5' : 'right-0.5'}`}></div>
                    </button>
                  </div>

                  {/* Night Vision Toggle */}
                  <div className="flex items-center justify-between p-3 bg-[var(--color-luxury-bg)] rounded-xl border border-[var(--color-luxury-border)]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--color-luxury-surface)] rounded-lg shadow-sm">
                        <Eye className={`w-4 h-4 ${nightVision ? 'text-green-500' : 'text-[var(--color-luxury-gold)]'}`} />
                      </div>
                      <span className="font-bold text-sm text-[var(--color-luxury-ink)]">ראיית לילה</span>
                    </div>
                    <button 
                      onClick={() => setNightVision(!nightVision)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${nightVision ? 'bg-green-600' : 'bg-[var(--color-luxury-border)]'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${nightVision ? 'right-5.5' : 'right-0.5'}`}></div>
                    </button>
                  </div>

                  {/* Rashi Toggle */}
                  <div className="flex items-center justify-between p-3 bg-[var(--color-luxury-bg)] rounded-xl border border-[var(--color-luxury-border)]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--color-luxury-surface)] rounded-lg shadow-sm">
                        <BookOpen className="w-4 h-4 text-[var(--color-luxury-gold)]" />
                      </div>
                      <span className="font-bold text-sm text-[var(--color-luxury-ink)]">הצג רש"י</span>
                    </div>
                    <button 
                      onClick={() => setShowRashi(!showRashi)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${showRashi ? 'bg-[var(--color-luxury-gold)]' : 'bg-[var(--color-luxury-border)]'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${showRashi ? 'right-5.5' : 'right-0.5'}`}></div>
                    </button>
                  </div>

                  {/* Onkelos Toggle */}
                  <div className="flex items-center justify-between p-3 bg-[var(--color-luxury-bg)] rounded-xl border border-[var(--color-luxury-border)]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--color-luxury-surface)] rounded-lg shadow-sm">
                        <ScrollText className="w-4 h-4 text-[var(--color-luxury-gold)]" />
                      </div>
                      <span className="font-bold text-sm text-[var(--color-luxury-ink)]">הצג אונקלוס</span>
                    </div>
                    <button 
                      onClick={() => setShowOnkelos(!showOnkelos)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${showOnkelos ? 'bg-[var(--color-luxury-gold)]' : 'bg-[var(--color-luxury-border)]'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${showOnkelos ? 'right-5.5' : 'right-0.5'}`}></div>
                    </button>
                  </div>

                  {/* Rambam Pshat Toggle */}
                  <div className="flex items-center justify-between p-3 bg-[var(--color-luxury-bg)] rounded-xl border border-[var(--color-luxury-border)]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--color-luxury-surface)] rounded-lg shadow-sm">
                        <Sparkles className="w-4 h-4 text-[var(--color-luxury-gold)]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-[var(--color-luxury-ink)]">פירוש פשט (רמב"ם)</span>
                        <span className="text-[10px] text-gray-400">בלחיצה ברמב"ם</span>
                        <span className="text-[9px] text-red-500/70 leading-tight">מבוסס על בינה מלאכותית - ללא אחריות כלל!</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowRambamPshat(!showRambamPshat)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${showRambamPshat ? 'bg-[var(--color-luxury-gold)]' : 'bg-[var(--color-luxury-border)]'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${showRambamPshat ? 'right-5.5' : 'right-0.5'}`}></div>
                    </button>
                  </div>

                  {/* Chumash Pshat Toggle */}
                  <div className="flex items-center justify-between p-3 bg-[var(--color-luxury-bg)] rounded-xl border border-[var(--color-luxury-border)]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--color-luxury-surface)] rounded-lg shadow-sm">
                        <Sparkles className="w-4 h-4 text-[var(--color-luxury-gold)]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-[var(--color-luxury-ink)]">פירוש פשט (חומש)</span>
                        <span className="text-[10px] text-gray-400">בלחיצה על פסוק</span>
                        <span className="text-[9px] text-red-500/70 leading-tight">מבוסס על בינה מלאכותית - ללא אחריות כלל!</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowChumashPshat(!showChumashPshat)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${showChumashPshat ? 'bg-[var(--color-luxury-gold)]' : 'bg-[var(--color-luxury-border)]'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${showChumashPshat ? 'right-5.5' : 'right-0.5'}`}></div>
                    </button>
                  </div>

                  {/* Sefer Hamitzvot Pshat Toggle */}
                  <div className="flex items-center justify-between p-3 bg-[var(--color-luxury-bg)] rounded-xl border border-[var(--color-luxury-border)]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--color-luxury-surface)] rounded-lg shadow-sm">
                        <Sparkles className="w-4 h-4 text-[var(--color-luxury-gold)]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-[var(--color-luxury-ink)]">פירוש פשט (ספר המצוות)</span>
                        <span className="text-[10px] text-gray-400">בלחיצה על מצווה</span>
                        <span className="text-[9px] text-red-500/70 leading-tight">מבוסס על בינה מלאכותית - ללא אחריות כלל!</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowSeferHamitzvotPshat(!showSeferHamitzvotPshat)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${showSeferHamitzvotPshat ? 'bg-[var(--color-luxury-gold)]' : 'bg-[var(--color-luxury-border)]'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${showSeferHamitzvotPshat ? 'right-5.5' : 'right-0.5'}`}></div>
                    </button>
                  </div>

                  {/* Tanya Pshat Toggle */}
                  <div className="flex items-center justify-between p-3 bg-[var(--color-luxury-bg)] rounded-xl border border-[var(--color-luxury-border)]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--color-luxury-surface)] rounded-lg shadow-sm">
                        <Sparkles className="w-4 h-4 text-[var(--color-luxury-gold)]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-[var(--color-luxury-ink)]">פירוש פשט (תניא)</span>
                        <span className="text-[10px] text-gray-400">בלחיצה בתניא</span>
                        <span className="text-[9px] text-red-500/70 leading-tight">מבוסס על בינה מלאכותית - ללא אחריות כלל!</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowTanyaPshat(!showTanyaPshat)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${showTanyaPshat ? 'bg-[var(--color-luxury-gold)]' : 'bg-[var(--color-luxury-border)]'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${showTanyaPshat ? 'right-5.5' : 'right-0.5'}`}></div>
                    </button>
                  </div>

                  {/* Chumash Images Toggle */}
                  <div className="flex items-center justify-between p-3 bg-[var(--color-luxury-bg)] rounded-xl border border-[var(--color-luxury-border)]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--color-luxury-surface)] rounded-lg shadow-sm">
                        <Sparkles className="w-4 h-4 text-[var(--color-luxury-gold)]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-[var(--color-luxury-ink)]">תמונות לפסוקי חומש</span>
                        <span className="text-[10px] text-gray-400">יצירת תמונות מננו בננה 2</span>
                        <span className="text-[9px] text-red-500/70 leading-tight">דורש מפתח API</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setEnableChumashImages(!enableChumashImages)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${enableChumashImages ? 'bg-[var(--color-luxury-gold)]' : 'bg-[var(--color-luxury-border)]'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${enableChumashImages ? 'right-5.5' : 'right-0.5'}`}></div>
                    </button>
                  </div>

                </div>

                {/* Font Size Control */}
                <div className="mt-6 p-4 bg-[var(--color-luxury-bg)] rounded-xl border border-[var(--color-luxury-border)]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-[var(--color-luxury-surface)] rounded-lg shadow-sm">
                      <Type className="w-4 h-4 text-[var(--color-luxury-gold)]" />
                    </div>
                    <span className="font-bold text-sm text-[var(--color-luxury-ink)]">גודל גופן</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setFontSize(f => Math.max(f - 2, 14))}
                      className="p-2 bg-[var(--color-luxury-surface)] border border-[var(--color-luxury-border)] rounded-lg hover:bg-[var(--color-luxury-gold-light)] transition-colors text-[var(--color-luxury-gold)]"
                    >
                      <ZoomOut className="w-5 h-5" />
                    </button>
                    <div className="flex-1 h-2 bg-[var(--color-luxury-border)] rounded-full relative">
                      <div 
                        className="absolute top-0 right-0 h-full bg-[var(--color-luxury-gold)] rounded-full transition-all"
                        style={{ width: `${((fontSize - 14) / (40 - 14)) * 100}%` }}
                      ></div>
                    </div>
                    <button 
                      onClick={() => setFontSize(f => Math.min(f + 2, 40))}
                      className="p-2 bg-[var(--color-luxury-surface)] border border-[var(--color-luxury-border)] rounded-lg hover:bg-[var(--color-luxury-gold-light)] transition-colors text-[var(--color-luxury-gold)]"
                    >
                      <ZoomIn className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="text-center mt-2 text-xs font-bold text-[var(--color-luxury-gold)]">
                    {fontSize}px
                  </div>
                </div>
                
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full mt-6 py-4 bg-[var(--color-luxury-gold)] text-white dark:text-[var(--color-luxury-bg)] rounded-2xl font-bold text-base hover:opacity-90 transition-all shadow-lg"
                >
                  סגור
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rambam Pshat Modal */}
        {activePshat && (
          <div 
            onClick={() => setActivePshat(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-100"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--color-luxury-surface)] w-full max-w-sm rounded-3xl shadow-2xl border border-[var(--color-luxury-border)] overflow-hidden animate-in zoom-in-95 duration-100 flex flex-col max-h-[85vh]"
            >
              <div className="p-5 flex-shrink-0 border-b border-[var(--color-luxury-border)]">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-[var(--color-luxury-gold-light)] rounded-lg">
                      <Sparkles className="w-4 h-4 text-[var(--color-luxury-gold)]" />
                    </div>
                    <h3 className="text-base font-black text-[var(--color-luxury-ink)] font-serif">{activePshat.title}</h3>
                  </div>
                  <button 
                    onClick={() => setActivePshat(null)}
                    className="p-1.5 hover:bg-[var(--color-luxury-bg)] rounded-full transition-colors text-[var(--color-luxury-ink)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="p-5 overflow-y-auto flex-1">
                {activePshat.type === 'rambam' && (
                  <div className="flex bg-[var(--color-luxury-bg)] rounded-xl p-1 mb-4 border border-[var(--color-luxury-border)]">
                    <button
                      onClick={() => {
                        setRambamExplanationLength('short');
                        handlePshatClick(activePshat.original, activePshat.title, activePshat.type, 'short');
                      }}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${rambamExplanationLength === 'short' ? 'bg-[var(--color-luxury-gold)] text-white shadow-sm' : 'text-[var(--color-luxury-ink)] hover:bg-[var(--color-luxury-gold-light)]'}`}
                    >
                      הסבר קצר
                    </button>
                    <button
                      onClick={() => {
                        setRambamExplanationLength('long');
                        handlePshatClick(activePshat.original, activePshat.title, activePshat.type, 'long');
                      }}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${rambamExplanationLength === 'long' ? 'bg-[var(--color-luxury-gold)] text-white shadow-sm' : 'text-[var(--color-luxury-ink)] hover:bg-[var(--color-luxury-gold-light)]'}`}
                    >
                      הסבר מורחב
                    </button>
                  </div>
                )}

                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-200 dark:border-gray-800 italic text-xs opacity-70">
                  "{activePshat.original.substring(0, 100)}{activePshat.original.length > 100 ? '...' : ''}"
                </div>

                <div className="min-h-[80px] flex flex-col items-stretch justify-center">
                  {pshatLoading ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-6">
                      <Loader2 className="w-6 h-6 animate-spin text-[var(--color-luxury-gold)]" />
                      <p className="text-xs text-gray-500 font-serif">מכין פירוש פשט...</p>
                    </div>
                  ) : (
                    <div className="text-base leading-relaxed text-[var(--color-luxury-ink)] font-serif text-justify bg-[var(--color-luxury-gold-light)] p-4 rounded-xl border border-[var(--color-luxury-gold)]/20 shadow-inner markdown-body">
                      <ReactMarkdown>{activePshat.text}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-5 flex-shrink-0 border-t border-[var(--color-luxury-border)]">
                <button
                  onClick={() => setActivePshat(null)}
                  className="w-full py-2.5 bg-[var(--color-luxury-gold)] text-white dark:text-[var(--color-luxury-bg)] rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-md"
                >
                  הבנתי, תודה
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Modal */}
        {showFeedbackModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-100">
            <div className="bg-[var(--color-luxury-surface)] w-full max-w-md rounded-3xl shadow-2xl border border-[var(--color-luxury-border)] overflow-hidden animate-in zoom-in-95 duration-100">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-[var(--color-luxury-ink)] font-serif">שלח משוב</h3>
                  <button 
                    onClick={() => setShowFeedbackModal(false)}
                    className="p-2 hover:bg-[var(--color-luxury-bg)] rounded-full transition-colors text-[var(--color-luxury-ink)]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <p className="text-sm text-[var(--color-luxury-ink)] opacity-70 mb-4 font-serif">
                  נשמח לשמוע את דעתך על האפליקציה, הצעות לשיפור או דיווח על תקלות.
                </p>
                
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="כתוב את המשוב שלך כאן..."
                  className="w-full h-40 p-4 bg-[var(--color-luxury-bg)] border border-[var(--color-luxury-border)] rounded-2xl focus:ring-2 focus:ring-[var(--color-luxury-gold)] focus:border-transparent outline-none transition-all resize-none text-base font-serif text-[var(--color-luxury-ink)]"
                  dir="rtl"
                />
                
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={handleSendFeedback}
                    disabled={!feedbackText.trim()}
                    className="flex-1 py-3 bg-[var(--color-luxury-gold)] text-white dark:text-[var(--color-luxury-bg)] rounded-xl font-bold hover:bg-[var(--color-luxury-ink)] dark:hover:text-white transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    שלח משוב
                  </button>
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="flex-1 py-3 bg-[var(--color-luxury-bg)] text-[var(--color-luxury-ink)] rounded-xl font-bold hover:bg-[var(--color-luxury-border)] transition-all"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        :root {
          --color-luxury-bg: #FDFCF9;
          --color-luxury-ink: #1C1C1C;
          --color-luxury-gold: #B8860B;
          --color-luxury-gold-light: #F9F4E8;
          --color-luxury-border: #E5D5B0;
        }
        
        .dark {
          --color-luxury-bg: #000000;
          --color-luxury-ink: #FFFFFF;
          --color-luxury-gold: #D4AF37;
          --color-luxury-gold-light: #1A1A1A;
          --color-luxury-border: #333333;
        }
        
        .dark .bg-white {
          background-color: #000000 !important;
        }
        
        .dark .text-gray-400 {
          color: #888888 !important;
        }
        
        .dark .bg-gray-100 {
          background-color: #222222 !important;
        }

        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-share-menu {
          animation: fadeInDown 0.2s ease-out forwards;
        }

        @media print {
          body {
            background: white !important;
            color: black !important;
            font-size: 12pt;
          }
          .page-break-before-always {
            page-break-before: always;
          }
          @page {
            margin: 1.5cm;
          }
          .print-header {
            display: block !important;
            text-align: center;
            margin-bottom: 2rem;
            border-bottom: 2px solid black;
            padding-bottom: 1rem;
          }
          .print-footer {
            display: block !important;
            text-align: center;
            margin-top: 2rem;
            font-size: 10pt;
            border-top: 1px solid #ccc;
            padding-top: 1rem;
          }
        }
      `}} />
      
      {/* Print-only header/footer */}
      <div className="hidden print-header">
        <h1 className="text-3xl font-black mb-2">שיעורי חת"ת ורמב"ם היומי</h1>
        <div className="text-xl">{hebrewDate} | {new Intl.DateTimeFormat('he-IL', { dateStyle: 'full' }).format(currentDate)}</div>
      </div>
      <div className="hidden print-footer">
        <div>הופק באמצעות אפליקציית שיעורי חת"ת ורמב"ם היומי</div>
        <div className="mt-1 italic">לע״נ נשמת ר׳ נדב יהודה בן אבישי</div>
      </div>
    </div>
  );
}

