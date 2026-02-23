import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../lib/config";
import { useLocale } from "../contexts/useLocale";
import AuthShell from "../components/AuthShell";
import { devError } from "../lib/devLog";

const ResetPassword: React.FC = () => {
  const { locale } = useLocale();
  const isArabic = locale === "ar";
  const translate = (en: string, ar: string) => (isArabic ? ar : en);

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialToken = params.get("token") || "";

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      toast.error(
        translate(
          "Invalid reset link. Please request a new password reset email.",
          "رابط إعادة التعيين غير صالح. يرجى طلب بريد إلكتروني جديد لإعادة تعيين كلمة المرور."
        )
      );
      return;
    }
    if (!password || !confirmPassword) {
      toast.error(
        translate(
          "Please complete all fields before submitting.",
          "يرجى تعبئة جميع الحقول قبل الإرسال."
        )
      );
      return;
    }

    if (password !== confirmPassword) {
      toast.error(
        translate("The passwords do not match.", "كلمتا المرور غير متطابقتين.")
      );
      return;
    }

    if (password.length < 8) {
      toast.error(
        translate(
          "Password must be at least 8 characters.",
          "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل."
        )
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(
        `${API_BASE_URL}/auth/reset-password`,
        { token, password },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      toast.success(
        translate(
          "Your password has been reset. You can log in with the new password.",
          "تمت إعادة تعيين كلمة المرور. يمكنك تسجيل الدخول باستخدام الكلمة الجديدة."
        )
      );
      navigate("/login");
    } catch (error: unknown) {
      devError("[ResetPassword] request failed:", error);
      toast.error(
        translate(
          "We couldn't reset your password. Please verify the token and try again.",
          "تعذر إعادة تعيين كلمة المرور. يرجى التحقق من الرمز والمحاولة مرة أخرى."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={translate("Reset your password", "إعادة تعيين كلمة المرور")}
      subtitle={translate(
        "Choose a new password for your account.",
        "اختر كلمة مرور جديدة لحسابك."
      )}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm text-slate-700 dark:text-slate-200">
            {translate("New password", "كلمة المرور الجديدة")}
          </label>
          <input
            id="password"
            type="password"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm dark:border-transparent dark:bg-slate-800/60 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="confirm" className="text-sm text-slate-700 dark:text-slate-200">
            {translate("Confirm new password", "تأكيد كلمة المرور الجديدة")}
          </label>
          <input
            id="confirm"
            type="password"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm dark:border-transparent dark:bg-slate-800/60 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 transition text-white font-semibold py-3 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? translate("Resetting password...", "جارٍ إعادة التعيين...")
            : translate("Reset password", "إعادة تعيين كلمة المرور")}
        </button>
      </form>

      <div className="text-sm text-slate-500 dark:text-slate-300 flex flex-col gap-2">
        <span>
          {translate("Lost your token?", "فقدت الرمز؟")}{" "}
          <Link
            to="/forgot-password"
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
          >
            {translate("Request another reset email.", "اطلب إعادة تعيين جديدة.")}
          </Link>
        </span>
        <Link
          to="/login"
          className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200 self-start"
        >
          {translate("Back to login", "العودة لتسجيل الدخول")}
        </Link>
      </div>
    </AuthShell>
  );
};

export default ResetPassword;

