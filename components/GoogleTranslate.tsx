'use client';

import { useEffect } from 'react';

export default function GoogleTranslate() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if script is already injected
      if (document.querySelector('script[src*="translate_a/element.js"]')) {
        return;
      }

      // Initialize Google Translate
      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            autoDisplay: false,
          },
          'google_translate_element'
        );
      };

      // Append script
      const script = document.createElement('script');
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <>
      {/* Container for Google Translate element */}
      <div id="google_translate_element" style={{ display: 'none', position: 'absolute', zIndex: -9999 }}></div>
      
      {/* Global CSS to hide the Google Translate widget and top banner */}
      <style dangerouslySetInnerHTML={{ __html: `
        .skiptranslate iframe {
          display: none !important;
        }
        body {
          top: 0 !important;
        }
        #goog-gt-tt {
          display: none !important;
        }
        .goog-te-balloon-frame {
          display: none !important;
        }
        .goog-text-highlight {
          background-color: transparent !important;
          box-shadow: none !important;
        }
        font {
          background: transparent !important;
        }
      `}} />
    </>
  );
}
