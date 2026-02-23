import React, { useState, useRef, useEffect } from "react";
import { useLocale } from "../contexts/useLocale";
import { tokens } from "../lib/design-tokens";
import { Globe, Check } from "lucide-react";

interface LanguageOption {
  code: string;
  label: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ar", label: "العربية", flag: "🇾🇪" },
];

const LanguageSwitcher: React.FC = () => {
  const { locale, setLocale, isRTL } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentLanguage =
    languages.find((lang) => lang.code === locale) || languages[0];

  const handleLanguageChange = (newLocale: string) => {
    setLocale(newLocale);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      // Calculate position before opening to prevent movement
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isOpen) {
      // Update position on scroll or resize
      const updatePosition = () => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + 8,
            right: window.innerWidth - rect.right,
          });
        }
      };
      
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2"
        style={{
          borderRadius: tokens.radius.md,
          padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
          fontSize: tokens.typography.fontSize.sm[0],
          fontWeight: tokens.typography.fontWeight.medium,
        }}
        aria-label="Change language"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe size={16} />
        <span className="hidden sm:inline">{currentLanguage.flag}</span>
        <span className="hidden md:inline">{currentLanguage.label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div
            className="fixed w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-[9999]"
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
              borderRadius: tokens.radius.md,
              boxShadow: tokens.shadow.lg,
              minWidth: "12rem",
            }}
            role="menu"
            aria-orientation="vertical"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                    locale === language.code
                      ? "bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  style={{
                    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                    fontSize: tokens.typography.fontSize.sm[0],
                    direction: language.code === "ar" ? "rtl" : "ltr",
                  }}
                  role="menuitem"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-lg flex-shrink-0">{language.flag}</span>
                    <span 
                      className="font-medium" 
                      style={{ 
                        fontFamily: language.code === "ar" ? '"Noto Sans Arabic", "Segoe UI", "Arial Unicode MS", system-ui, sans-serif' : 'inherit',
                        direction: language.code === "ar" ? "rtl" : "ltr"
                      }}
                    >
                      {language.label}
                    </span>
                  </div>
                  {locale === language.code && (
                    <Check
                      size={16}
                      className="text-gold-600 dark:text-gold-400 flex-shrink-0"
                      style={{
                        marginLeft: language.code === "ar" ? "0.5rem" : "0",
                        marginRight: language.code === "ar" ? "0" : "0.5rem",
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;
