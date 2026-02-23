import React, { useState, useEffect, useRef } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { t } from "../lib/i18n";
import {
  MessageCircle,
  X,
  Send,
  Mic,
  MicOff,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Settings,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  tool_calls?: any[];
  tool_results?: any[];
}

interface ChatDockProps {
  isOpen: boolean;
  onClose: () => void;
  context?: {
    currentPage?: string;
    symbol?: string;
    currency?: string;
    dateRange?: string;
  };
  initialMessage?: string;
}

const ChatDock: React.FC<ChatDockProps> = ({
  isOpen,
  onClose,
  context,
  initialMessage,
}) => {
  const { settings } = useSettings();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Quick action chips based on current page
  const getQuickActions = () => {
    if (!context?.currentPage) return [];

    const actions = {
      dashboard: [
        { text: "What's the current gold price?", icon: BarChart3 },
        { text: "What's the gold price forecast?", icon: BarChart3 },
        { text: "Summarize today's market move", icon: TrendingUp },
        { text: "What is the technical analysis for gold?", icon: Settings },
        {
          text: "What is the correlation between gold and bitcoin?",
          icon: BarChart3,
        },
        { text: "What is the volatility forecast?", icon: TrendingUp },
        { text: "Run Monte Carlo simulation", icon: Settings },
        { text: "Run 14-day backtest", icon: Settings },
        { text: "ما هو سعر الذهب الحالي؟", icon: BarChart3 },
        { text: "ما هو توقع سعر الذهب؟", icon: BarChart3 },
        { text: "لخص حركة السوق اليوم", icon: TrendingUp },
        { text: "ما هو التحليل الفني للذهب؟", icon: Settings },
        { text: "ما هو الارتباط بين الذهب والبيتكوين؟", icon: BarChart3 },
        { text: "ما هو توقع التقلب؟", icon: TrendingUp },
        { text: "شغل محاكاة مونت كارلو", icon: Settings },
        { text: "شغل اختبار 14 يوم", icon: Settings },
      ],
      trends: [
        { text: "What's the gold price forecast?", icon: BarChart3 },
        { text: "Run 14-day backtest", icon: Settings },
        { text: "Run Monte Carlo simulation", icon: Settings },
        { text: "What is the technical analysis for gold?", icon: Settings },
        {
          text: "What is the correlation between gold and bitcoin?",
          icon: BarChart3,
        },
        { text: "What is the volatility forecast?", icon: TrendingUp },
        { text: "Compare models", icon: BarChart3 },
        { text: "Explain the model", icon: Settings },
        { text: "How is the model performing?", icon: TrendingUp },
        { text: "Analyze market volatility", icon: TrendingUp },
        { text: "Test trading strategy", icon: Settings },
        { text: "ما هو توقع سعر الذهب؟", icon: BarChart3 },
        { text: "شغل اختبار 14 يوم", icon: Settings },
        { text: "شغل محاكاة مونت كارلو", icon: Settings },
        { text: "ما هو التحليل الفني للذهب؟", icon: Settings },
        { text: "ما هو الارتباط بين الذهب والبيتكوين؟", icon: BarChart3 },
        { text: "ما هو توقع التقلب؟", icon: TrendingUp },
        { text: "قارن بين النماذج", icon: BarChart3 },
        { text: "ما هو تفسير النموذج؟", icon: Settings },
        { text: "ما هو أداء النموذج؟", icon: TrendingUp },
        { text: "حلل تقلب السوق", icon: TrendingUp },
        { text: "اختبر استراتيجية التداول", icon: Settings },
      ],
      alerts: [
        { text: "Create alert above $2500", icon: AlertCircle },
        { text: "Notify me when gold drops", icon: AlertCircle },
        { text: "Create volatility alert", icon: AlertCircle },
        { text: "What's the gold price forecast?", icon: BarChart3 },
        { text: "Explain today's market move", icon: TrendingUp },
        { text: "What is the technical analysis for gold?", icon: Settings },
        { text: "Run 14-day backtest", icon: Settings },
        { text: "Check existing alerts", icon: AlertCircle },
        { text: "How is the model performing?", icon: TrendingUp },
        { text: "Run Monte Carlo simulation", icon: Settings },
        { text: "أنشئ تنبيه أعلى من $2500", icon: AlertCircle },
        { text: "أعلمني عند انخفاض الذهب", icon: AlertCircle },
        { text: "أنشئ تنبيه تقلب", icon: AlertCircle },
        { text: "ما هو توقع سعر الذهب؟", icon: BarChart3 },
        { text: "قم بتحليل حركة السوق اليوم", icon: TrendingUp },
        { text: "ما هو التحليل الفني للذهب؟", icon: Settings },
        { text: "شغل اختبار 14 يوم", icon: Settings },
        { text: "تحقق من التنبيهات الموجودة", icon: AlertCircle },
        { text: "ما هو أداء النموذج؟", icon: TrendingUp },
        { text: "شغل محاكاة مونت كارلو", icon: Settings },
      ],
    };

    return actions[context.currentPage as keyof typeof actions] || [];
  };

  // Initialize with disclaimer and initial message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const disclaimerMessage: ChatMessage = {
        id: "disclaimer",
        role: "system",
        content: t("chatDisclaimer", settings.locale),
        timestamp: new Date(),
      };

      setMessages([disclaimerMessage]);

      if (initialMessage) {
        setInputValue(initialMessage);
      }
    }
  }, [isOpen, initialMessage, settings.locale]);

  // Check microphone permission
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(() => setHasPermission(true))
        .catch(() => setHasPermission(false));
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !isOpen) {
        e.preventDefault();
        // This would be handled by parent component
      }

      if (e.key === "Escape" && isOpen) {
        onClose();
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && isOpen) {
        e.preventDefault();
        handleSend();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Function to detect if text contains Arabic characters
  const isArabic = (text: string) => {
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(text);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setLoadingMessage("Analyzing your question...");

    // Create abort controller with 30 second timeout
    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }, 30000); // 30 second timeout

    // Detect if the message contains Arabic and set locale accordingly
    const detectedLocale = isArabic(inputValue.trim()) ? "ar" : settings.locale;

    try {
      setLoadingMessage("Fetching analysis...");
      
      const response = await fetch("/api/chat", {
        method: "POST",
        signal: abortControllerRef.current.signal,
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": Date.now().toString(),
          "X-Current-Page": context?.currentPage || "",
          "X-Symbol": context?.symbol || "",
          "X-Currency": context?.currency || "",
          "X-Date-Range": context?.dateRange || "",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          locale: detectedLocale,
        }),
      });

      clearTimeout(timeoutId);
      setLoadingMessage("Processing response...");

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        tool_calls: data.tool_calls,
        tool_results: data.tool_results,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("Chat error:", error);
      
      let errorContent = t("chatErrorMessage", settings.locale);
      
      if (error.name === 'AbortError') {
        errorContent = detectedLocale === 'ar' 
          ? "عذراً، انتهت مهلة الطلب بعد 30 ثانية. يرجى المحاولة مرة أخرى أو طرح سؤال أبسط."
          : "Sorry, the request timed out after 30 seconds. Please try again or ask a simpler question.";
      } else if (error.message?.includes('Failed to fetch')) {
        errorContent = detectedLocale === 'ar'
          ? "تعذر الاتصال بالخادم. يرجى التحقق من اتصال الشبكة."
          : "Unable to connect to the server. Please check your network connection.";
      }
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
      abortControllerRef.current = null;
    }
  };

  const handleQuickAction = (action: string) => {
    setInputValue(action);
    inputRef.current?.focus();
    // Auto-send if it's a quick action
    setTimeout(() => {
      if (inputValue === action) {
        handleSend();
      }
    }, 100);
  };

  const handleVoiceRecord = () => {
    if (!hasPermission) return;

    setIsRecording(!isRecording);
    // Voice recording implementation would go here
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-25"
        onClick={onClose}
      />

      {/* Chat Panel */}
      <div className="relative w-full max-w-3xl h-[550px] bg-white dark:bg-gray-800 rounded-t-xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {t("chatTitle", settings.locale)}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : message.role === "system"
                    ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {formatTime(message.timestamp)}
                </p>

                {/* Suggested questions for assistant messages */}
                {message.role === "assistant" &&
                  message.content.includes("I can help you with") && (
                    <div className="mt-3 space-y-3">
                      <p className="text-xs font-medium opacity-80">
                        Try asking:
                      </p>

                      {/* English Questions */}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          English
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {[
                            "What's the current gold price?",
                            "What's the gold price forecast?",
                            "Summarize today's market move",
                            "What is the technical analysis for gold?",
                            "What is the correlation between gold and bitcoin?",
                            "What is the volatility forecast?",
                            "Run Monte Carlo simulation",
                            "Run 14-day backtest",
                          ].map((question, index) => (
                            <button
                              key={index}
                              onClick={() => handleQuickAction(question)}
                              className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Arabic Questions */}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          العربية
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {[
                            "ما هو سعر الذهب الحالي؟",
                            "ما هو توقع سعر الذهب؟",
                            "لخص حركة السوق اليوم",
                            "ما هو التحليل الفني للذهب؟",
                            "ما هو الارتباط بين الذهب والبيتكوين؟",
                            "ما هو توقع التقلب؟",
                            "شغل محاكاة مونت كارلو",
                            "شغل اختبار 14 يوم",
                          ].map((question, index) => (
                            <button
                              key={index}
                              onClick={() => handleQuickAction(question)}
                              className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {getQuickActions().length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-3">
              {/* English Questions */}
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  English
                </p>
                <div className="flex flex-wrap gap-2">
                  {getQuickActions()
                    .filter((action) => !/[\u0600-\u06FF]/.test(action.text))
                    .map((action, index) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={index}
                          onClick={() => handleQuickAction(action.text)}
                          className="flex items-center space-x-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs hover:bg-blue-200 dark:hover:bg-blue-800"
                        >
                          <Icon className="w-3 h-3" />
                          <span>{action.text}</span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Arabic Questions */}
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  العربية
                </p>
                <div className="flex flex-wrap gap-2">
                  {getQuickActions()
                    .filter((action) => /[\u0600-\u06FF]/.test(action.text))
                    .map((action, index) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={index}
                          onClick={() => handleQuickAction(action.text)}
                          className="flex items-center space-x-1 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs hover:bg-green-200 dark:hover:bg-green-800"
                        >
                          <Icon className="w-3 h-3" />
                          <span>{action.text}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder={t("chatPlaceholder", settings.locale)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={isLoading}
              />
            </div>

            <button
              onClick={handleVoiceRecord}
              disabled={!hasPermission}
              className={`p-2 rounded-full ${
                isRecording
                  ? "bg-red-500 text-white"
                  : hasPermission
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isRecording ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatDock;
