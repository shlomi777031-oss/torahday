import React, { useState, useEffect } from 'react';
import { Book, Loader2, AlertCircle, ExternalLink } from 'lucide-react';

const SeferHamitzvotWidget: React.FC = () => {
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRSS = async () => {
      try {
        setLoading(true);
        // Using a proxy to bypass CORS and Cloudflare if possible
        const targetUrl = 'https://www.chabad.org/rss/daily-study/sefer-hamitzvot.xml';
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Failed to fetch RSS');
        
        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        
        const items = xmlDoc.querySelectorAll('item');
        const parsedItems = Array.from(items).map(item => ({
          title: item.querySelector('title')?.textContent || '',
          description: item.querySelector('description')?.textContent || '',
          link: item.querySelector('link')?.textContent || '',
          pubDate: item.querySelector('pubDate')?.textContent || '',
        }));
        
        setContent(parsedItems);
        setError(null);
      } catch (err) {
        console.error('RSS Fetch Error:', err);
        setError('לא ניתן היה לטעון את ה-RSS. ייתכן שיש חסימת גישה מצד השרת.');
      } finally {
        setLoading(false);
      }
    };

    fetchRSS();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-[var(--color-luxury-border)] overflow-hidden max-w-md mx-auto my-8">
      <div className="bg-[var(--color-luxury-gold)] p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Book className="w-5 h-5" />
          <h3 className="font-black text-lg">ספר המצוות היומי</h3>
        </div>
        <div className="text-white/80 text-xs font-serif">חב"ד</div>
      </div>
      
      <div className="p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--color-luxury-gold)]">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="text-sm font-serif">טוען נתונים מה-RSS...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{error}</p>
            <p className="text-xs text-gray-500">נשתמש במידע הקיים באפליקציה במקום.</p>
          </div>
        ) : content.length > 0 ? (
          <div className="space-y-6">
            {content.slice(0, 1).map((item, idx) => (
              <div key={idx} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h4 className="text-[var(--color-luxury-ink)] font-bold text-lg mb-3 border-b border-[var(--color-luxury-border)] pb-2">
                  {item.title}
                </h4>
                <div 
                  className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4 line-clamp-6"
                  dangerouslySetInnerHTML={{ __html: item.description }}
                />
                <a 
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[var(--color-luxury-gold)] font-bold text-xs hover:underline"
                >
                  קרא עוד באתר חב"ד
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">אין נתונים זמינים כרגע.</p>
        )}
      </div>
      
      <div className="bg-gray-50 dark:bg-gray-800/50 p-3 text-center border-t border-[var(--color-luxury-border)]">
        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Sefer HaMitzvot Widget</p>
      </div>
    </div>
  );
};

export default SeferHamitzvotWidget;
