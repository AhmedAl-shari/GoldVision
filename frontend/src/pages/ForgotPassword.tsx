import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { Mail, CheckCircle2, Code, Copy } from "lucide-react";
import { API_BASE_URL } from "../lib/config";
import { useLocale } from "../contexts/useLocale";
import { copyToClipboard } from "../lib/clipboard";
import AuthShell from "../components/AuthShell";
import { devError } from "../lib/devLog";

const ForgotPassword: React.FC = () => {
  const { locale } = useLocale();
  const isArabic = locale === "ar";
  const translate = (en: string, ar: string) => (isArabic ? ar : en);

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) {
      toast.error(
        translate("Please enter your email address.", "يرجى إدخال بريدك الإلكتروني.")
      );
      return;
    }
    setIsSubmitting(true);
    setDevToken(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/forgot-password`,
        { email },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setSubmitted(true);
      if (response.data?.token && import.meta.env.DEV) {
        setDevToken(response.data.token as string);
      }
      toast.success(
        translate(
          "If that address exists in our system, a reset link is on its way.",
          "إذا كان البريد الإلكتروني مسجلاً لدينا، فسيصلك رابط لإعادة تعيين كلمة المرور."
        )
      );
    } catch (error: unknown) {
      devError("[ForgotPassword] request failed:", error);
      toast.error(
        translate(
          "We couldn't process your request. Please try again shortly.",
          "تعذر معالجة الطلب. يرجى المحاولة مرة أخرى بعد قليل."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={translate("Forgot your password?", "نسيت كلمة المرور؟")}
      subtitle={translate(
        "Enter the email you use for GoldVision and we’ll send instructions to reset your password.",
        "أدخل البريد الإلكتروني المستخدم في GoldVision وسنرسل لك تعليمات إعادة التعيين."
      )}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm text-slate-700 dark:text-slate-200">
            {translate("Email address", "البريد الإلكتروني")}
          </label>
          <input
            id="email"
            type="email"
            dir="ltr"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm dark:border-transparent dark:bg-slate-800/60 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 transition text-white font-semibold py-3 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? translate("Sending instructions...", "جارٍ إرسال التعليمات...")
            : translate("Send reset link", "إرسال رابط إعادة التعيين")}
        </button>
      </form>

      {submitted && (
        <div className="rounded-xl border-2 border-emerald-300/50 bg-gradient-to-br from-emerald-50 to-emerald-100/50 px-5 py-4 text-sm text-emerald-800 dark:border-emerald-500/50 dark:from-emerald-900/20 dark:to-emerald-800/10 dark:text-emerald-200 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                {translate("Check your email", "تحقق من بريدك الإلكتروني")}
              </p>
              <p className="leading-relaxed">
                {translate(
                  "If the email exists, you'll receive a message with the next steps. Please check your inbox (and spam folder).",
                  "إذا كان البريد موجوداً، ستصلك رسالة تحتوي على الخطوات التالية. تفقّد بريدك الوارد (والمجلد غير الهام)."
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {devToken && (
        <div className="rounded-xl border-2 border-amber-300/50 bg-gradient-to-br from-amber-50 to-orange-50/50 px-5 py-4 text-xs text-amber-900 dark:border-amber-500/50 dark:from-amber-900/20 dark:to-orange-900/10 dark:text-amber-200 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="font-semibold text-amber-900 dark:text-amber-100">
                {translate(
                  "Development token (not shown in production):",
                  "رمز التطوير (لن يظهر في بيئة الإنتاج):"
                )}
              </p>
            </div>
            <div className="relative group">
              <code className="block break-all text-xs font-mono bg-amber-100/50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2.5 text-amber-800 dark:text-amber-200 pr-10">
                {devToken}
              </code>
              <button
                onClick={async () => {
                  const result = await copyToClipboard(devToken);
                  if (result.success) {
                    toast.success(translate("Token copied!", "تم نسخ الرمز!"));
                  }
                }}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-amber-200/50 dark:bg-amber-800/50 hover:bg-amber-300/50 dark:hover:bg-amber-700/50 transition-colors"
                title={translate("Copy token", "نسخ الرمز")}
              >
                <Copy className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
              </button>
            </div>
            <Link
              to={`/reset-password?token=${devToken}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 underline decoration-amber-400/50 hover:decoration-amber-500 transition-colors"
            >
              <Mail className="w-4 h-4" />
              {translate("Open reset form", "فتح نموذج إعادة التعيين")}
            </Link>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-300">
        <Link to="/login" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200">
          {translate("Back to login", "العودة لتسجيل الدخول")}
        </Link>
        <span>
          {translate("Need help?", "تحتاج مساعدة؟")}{" "}
          <a
            href="mailto:support@goldvision.ai"
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
          >
            support@goldvision.ai
          </a>
        </span>
      </div>
    </AuthShell>
  );
};

export default ForgotPassword;

