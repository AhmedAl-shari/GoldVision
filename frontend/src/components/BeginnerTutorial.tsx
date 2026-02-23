import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, X, ChevronRight, ChevronLeft, CheckCircle, 
  Home, TrendingUp, Bell, Calculator, Sparkles 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../contexts/useLocale';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  content: string;
  action?: {
    label: string;
    link: string;
  };
  icon: React.ReactNode;
}

const BeginnerTutorial: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { locale } = useLocale();

  // Listen for tutorial open events from navbar
  useEffect(() => {
    const handleOpenTutorial = () => {
      setIsOpen(true);
    };
    
    window.addEventListener('openTutorial', handleOpenTutorial);
    return () => window.removeEventListener('openTutorial', handleOpenTutorial);
  }, []);

  // Debug: Check tutorial status on mount and render
  useEffect(() => {
    const tutorialCompleted = localStorage.getItem('tutorial_completed');
    console.log('[Tutorial] Status check:', { 
      tutorialCompleted, 
      isOpen,
      locale,
      willShowButton: tutorialCompleted !== 'true' || isOpen,
      buttonPosition: 'bottom-24 right-4 (96px from bottom, 16px from right)',
      zIndex: 100
    });
  }, [isOpen, locale]);

  const tutorialSteps: TutorialStep[] = useMemo(() => {
    const isArabic = locale === "ar";
    return [
    {
      id: 'welcome',
        title: isArabic ? 'مرحباً بك في GoldVision' : 'Welcome to GoldVision',
        description: isArabic ? 'تعلم أساسيات تداول الذهب' : 'Learn the basics of gold trading',
        content: isArabic 
          ? `يساعدك GoldVision على تتبع أسعار الذهب، وتعيين التنبيهات، واتخاذ قرارات مستنيرة.
                سيقودك هذا البرنامج التعليمي عبر الميزات الأساسية في 5 دقائق.

                سواء كنت تشتري الذهب للاستثمار، أو تحسب الزكاة، أو تتداول بشكل احترافي،
                يوفر GoldVision الأدوات التي تحتاجها.`
          : `GoldVision helps you track gold prices, set alerts, and make informed decisions. 
                This tutorial will take you through the essential features in 5 minutes.

                Whether you're buying gold for investment, calculating Zakat, or trading professionally, 
                GoldVision provides the tools you need.`,
      icon: <Home className="w-6 h-6" />,
    },
    {
      id: 'prices',
        title: isArabic ? 'فهم أسعار الذهب' : 'Understanding Gold Prices',
        description: isArabic ? 'كيفية قراءة وتفسير الأسعار' : 'How to read and interpret prices',
        content: isArabic
          ? `يتم عرض أسعار الذهب بتنسيقات متعددة:
                • السعر الفوري: سعر السوق الحالي للأونصة
                • الأسعار الإقليمية: الأسعار المعدلة لمنطقتك (اليمن)
                • أسعار العيار: مستويات نقاء مختلفة (24 قيراط، 22 قيراط، 21 قيراط، 18 قيراط)
                • تحويلات الوحدات: الجرام، الأونصة، التولة، المثقال

                السعر الذي تراه يعكس قيمة السوق الحالية، محدث في الوقت الفعلي.`
          : `Gold prices are shown in multiple formats:
                • Spot Price: Current market price per ounce
                • Regional Prices: Prices adjusted for your region (Yemen)
                • Karat Prices: Different purity levels (24k, 22k, 21k, 18k)
                • Unit Conversions: Gram, Ounce, Tola, Mithqal

                The price you see reflects the current market value, updated in real-time.`,
        action: { label: isArabic ? 'عرض الأسعار' : 'View Prices', link: '/dashboard' },
      icon: <TrendingUp className="w-6 h-6" />,
    },
    {
      id: 'alerts',
        title: isArabic ? 'تعيين تنبيهات الأسعار' : 'Setting Price Alerts',
        description: isArabic ? 'احصل على إشعارات عند تغيير الأسعار' : 'Get notified when prices change',
        content: isArabic
          ? `قم بتعيين التنبيهات لإشعارك عندما:
                • ترتفع أسعار الذهب فوق سعر معين (وقت جيد للبيع)
                • تنخفض أسعار الذهب دون سعر معين (وقت جيد للشراء)
                • تتغير بنسبة مئوية
                
                ستحصل على إشعارات بريد إلكتروني ودفع عند استيفاء شروط التنبيه الخاصة بك.`
          : `Set alerts to notify you when gold prices:
                • Rise above a certain price (good time to sell)
                • Drop below a certain price (good time to buy)
                • Change by a percentage
                
                You'll receive email and push notifications when your alert conditions are met.`,
        action: { label: isArabic ? 'إنشاء تنبيه' : 'Create Alert', link: '/alerts' },
      icon: <Bell className="w-6 h-6" />,
    },
    {
      id: 'calculator',
        title: isArabic ? 'استخدام الآلات الحاسبة' : 'Using Calculators',
        description: isArabic ? 'احسب الأسعار والزكاة' : 'Calculate prices and Zakat',
        content: isArabic
          ? `يتضمن GoldVision آلات حاسبة مفيدة:
                • حاسبة سعر الذهب: تحويل بين الوحدات والعيارات
                • حاسبة الزكاة: احسب الزكاة الإسلامية على ممتلكات الذهب
                • التسعير الإقليمي: شاهد الأسعار لمناطق اليمن المختلفة
                
                تساعدك هذه الأدوات على اتخاذ قرارات مستنيرة بشأن شراء وبيع وإدارة الذهب.`
          : `GoldVision includes helpful calculators:
                • Gold Rate Calculator: Convert between units and karats
                • Zakat Calculator: Calculate Islamic zakat on gold holdings
                • Regional Pricing: See prices for different Yemen regions
                
                These tools help you make informed decisions about buying, selling, and managing gold.`,
        action: { label: isArabic ? 'جرب الآلة الحاسبة' : 'Try Calculator', link: '/calculator' },
      icon: <Calculator className="w-6 h-6" />,
    },
    {
      id: 'forecasts',
        title: isArabic ? 'توقعات الأسعار' : 'Price Forecasts',
        description: isArabic ? 'توقعات الأسعار المدعومة بالذكاء الاصطناعي' : 'AI-powered price predictions',
        content: isArabic
          ? `تتنبأ نماذج الذكاء الاصطناعي لدينا بأسعار الذهب المستقبلية:
                • توقعات قصيرة المدى لمدة 7 أيام
                • توقعات متوسطة المدى لمدة 30 يوماً
                • فترات الثقة تُظهر نطاقات التنبؤ
                • الدقة التاريخية: 97%+ لتوقعات 7 أيام
                
                استخدم التوقعات لتخطيط قرارات الشراء والبيع الخاصة بك.`
          : `Our AI models predict future gold prices:
                • 7-day short-term forecasts
                • 30-day medium-term forecasts
                • Confidence intervals show prediction ranges
                • Historical accuracy: 97%+ for 7-day forecasts
                
                Use forecasts to plan your buying and selling decisions.`,
        action: { label: isArabic ? 'عرض التوقعات' : 'View Forecasts', link: '/trends' },
      icon: <TrendingUp className="w-6 h-6" />,
    },
  ];
  }, [locale]);

  useEffect(() => {
    // Check if tutorial was already completed or banner dismissed
    const tutorialCompleted = localStorage.getItem('tutorial_completed');
    const bannerDismissed = localStorage.getItem('tutorial_banner_dismissed');
    
    // Auto-open tutorial for first-time users:
    // - Only if tutorial not completed
    // - Only if banner not dismissed (to avoid annoying users who dismissed it)
    // - After 5 seconds to let page load
    if (tutorialCompleted === 'true' || bannerDismissed === 'true') {
      return;
    }
    
    // Show tutorial on first visit (after 5 seconds to let page load)
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      setCompletedSteps(new Set([...completedSteps, tutorialSteps[currentStep].id]));
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setCompletedSteps(new Set([...completedSteps, tutorialSteps[currentStep].id]));
    localStorage.setItem('tutorial_completed', 'true');
    setIsOpen(false);
  };

  const handleSkip = () => {
    localStorage.setItem('tutorial_completed', 'true');
    setIsOpen(false);
  };

  const handleActionClick = (link: string) => {
    setIsOpen(false);
    navigate(link);
  };

  // Check if tutorial was completed and banner dismissed
  const tutorialCompleted = localStorage.getItem('tutorial_completed');
  const bannerDismissed = localStorage.getItem('tutorial_banner_dismissed');
  
  // Show floating button only if:
  // 1. Tutorial not completed AND banner dismissed (fallback option)
  // 2. Or if user wants quick access (smaller, less prominent)
  // Make it smaller and less prominent since we have the banner
  if (!isOpen) {
    // Only show floating button if banner is dismissed and tutorial not completed
    // This provides a fallback option without being intrusive
    if (bannerDismissed === 'true' && tutorialCompleted !== 'true') {
      return (
        <div 
          className="fixed bottom-24 right-4 z-[50] md:bottom-24 lg:bottom-24"
          style={{ 
            zIndex: 50,
            position: 'fixed'
          }}
        >
          <button
            onClick={() => {
              setIsOpen(true);
            }}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-2 md:px-4 md:py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2 hover:scale-105"
            aria-label="Start tutorial"
            title="Start Tutorial"
          >
            <BookOpen className="w-4 h-4" />
            <span className="font-medium text-xs md:text-sm hidden sm:inline">
              {locale === "ar" ? "البرنامج التعليمي" : "Tutorial"}
            </span>
          </button>
        </div>
      );
    }
    // Don't show floating button if banner is visible or tutorial is completed
    return null;
  }

  const currentTutorial = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  // Force re-render when locale changes by using locale in the key
  return (
    <div key={`tutorial-${locale}`} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div key={`tutorial-content-${locale}`} className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center text-white">
              {currentTutorial.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold">{currentTutorial.title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {locale === "ar" 
                  ? `الخطوة ${currentStep + 1} من ${tutorialSteps.length}`
                  : `Step ${currentStep + 1} of ${tutorialSteps.length}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close tutorial"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
              {currentTutorial.description}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
              {currentTutorial.content}
            </p>
          </div>

          {currentTutorial.action && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-medium">
                💡 {locale === "ar" ? "جربه الآن:" : "Try it now:"}
              </p>
              <button
                onClick={() => handleActionClick(currentTutorial.action!.link)}
                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-colors"
              >
                {currentTutorial.action.label}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t p-4 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {locale === "ar" ? "السابق" : "Previous"}
          </button>

          <div className="flex gap-2">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-yellow-500 w-6'
                    : index < currentStep
                    ? 'bg-green-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          {currentStep === tutorialSteps.length - 1 ? (
            <button
              onClick={handleComplete}
              className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 font-semibold"
            >
              <CheckCircle className="w-4 h-4" />
              {locale === "ar" ? "إكمال" : "Complete"}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 font-semibold"
            >
              {locale === "ar" ? "التالي" : "Next"}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BeginnerTutorial;

