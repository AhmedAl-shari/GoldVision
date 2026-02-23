import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { useLocale } from "../contexts/useLocale";
import { validateGmailEmail } from "../lib/validation";

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const { t } = useLocale();
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [rememberMe, setRememberMe] = useState(true);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value as any,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Strict: require explicit credentials; no demo autofill
      const email = (formData.email || "").trim();
      const password = formData.password;
      if (!email || !password) {
        setError("Please enter email and password.");
        setIsLoading(false);
        return;
      }
      
      // Validate Gmail email
      const emailValidation = validateGmailEmail(email);
      if (!emailValidation.isValid) {
        setError(emailValidation.error || "Invalid email.");
        setIsLoading(false);
        return;
      }
      
      await login(email, password);
      try {
        if (rememberMe)
          localStorage.setItem("gv_email", formData.email || email);
      } catch {}
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loginFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-focus email field on mount and check for OAuth errors
  useEffect(() => {
    if (emailRef.current) emailRef.current.focus();
    try {
      const savedRemember = localStorage.getItem("gv_remember_me");
      if (savedRemember) setRememberMe(savedRemember === "1");
    } catch {}

    // Check for OAuth error in URL params
    const oauthError = searchParams.get("error");
    if (oauthError === "oauth_not_configured") {
      setError(
        "Google sign-in is not configured. Please use email/password authentication instead."
      );
    } else if (oauthError === "oauth_failed") {
      setError(
        "Google sign-in failed. Please try again or use email/password authentication."
      );
    }
  }, [searchParams]);

  useEffect(() => {
    try {
      localStorage.setItem("gv_remember_me", rememberMe ? "1" : "0");
    } catch {}
  }, [rememberMe]);

  const handleGoogleLogin = () => {
    setIsLoading(true);
    // If backend supports Google OAuth, redirect; otherwise show graceful fallback
    try {
      const backendUrl =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      window.location.href = `${backendUrl}/auth/google`;
    } catch {
      setIsLoading(false);
    }
  };

  // No automatic credential filling; user controls input

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex items-center justify-center py-10 px-4">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-3xl overflow-hidden shadow-2xl bg-white border border-gray-200 dark:border-transparent dark:ring-1 dark:ring-white/10 dark:bg-white/5 dark:backdrop-blur">
        {/* Left: Form panel */}
        <div className="bg-white lg:border-r lg:border-gray-200 dark:border-transparent dark:bg-slate-900/30 p-8 sm:p-12">
          <div className="max-w-md mx-auto">
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Hello!
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Sign in to your account
            </p>

            <form
              className="mt-8 space-y-6"
              onSubmit={handleSubmit}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  (e.currentTarget as HTMLFormElement).requestSubmit();
                }
              }}
            >
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-slate-900 dark:border-transparent dark:bg-slate-800/60 dark:text-slate-100 placeholder-slate-400 shadow-sm dark:shadow-[inset_6px_6px_16px_rgba(0,0,0,0.08),inset_-6px_-6px_16px_rgba(255,255,255,0.35)] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  ref={emailRef}
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  onKeyUp={(e) =>
                    setCapsOn(
                      (e as any).getModifierState &&
                        (e as any).getModifierState("CapsLock")
                    )
                  }
                  placeholder="Enter your password"
                  className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-slate-900 dark:border-transparent dark:bg-slate-800/60 dark:text-slate-100 placeholder-slate-400 shadow-sm dark:shadow-[inset_6px_6px_16px_rgba(0,0,0,0.08),inset_-6px_-6px_16px_rgba(255,255,255,0.35)] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <div className="flex items-center justify-between mt-1">
                  <span
                    className="text-xs text-amber-600"
                    role="alert"
                    aria-live="polite"
                  >
                    {capsOn ? t("capsLockOn") : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    {showPassword ? t("hidePassword") : t("showPassword")}{" "}
                    password
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2">
                {/* Remember / Forgot */}
                <div className="flex items-center justify-between mb-4">
                  <label className="flex items-center text-sm text-slate-600 dark:text-slate-300 select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Remember me
                  </label>
                  <a
                    href="/forgot-password"
                    className="text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    Forgot password?
                  </a>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3 shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? t("signingIn") : t("signIn")}
                </button>
                <p className="mt-2 text-center text-xs text-slate-500">
                  {t("tipKeyboard")}{" "}
                  {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}
                  +Enter to sign in
                </p>
                {/* SSO Divider */}
                <div className="relative my-6">
                  <div
                    className="absolute inset-0 flex items-center"
                    aria-hidden="true"
                  >
                    <div className="w-full border-t border-gray-200 dark:border-white/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs text-gray-500 dark:bg-transparent dark:text-gray-300">
                      Or continue with
                    </span>
                  </div>
                </div>
                {/* Google SSO */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white py-3 text-slate-700 hover:bg-gray-50 shadow-sm dark:border-white/20 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="h-5 w-5"
                  >
                    <path
                      fill="#FFC107"
                      d="M43.611,20.083H42V20H24v8h11.303C33.826,31.91,29.337,35,24,35c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,5.053,29.268,3,24,3C12.955,3,4,11.955,4,23 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                    />
                    <path
                      fill="#FF3D00"
                      d="M6.306,14.691l6.571,4.814C14.655,16.108,18.961,13,24,13c3.059,0,5.842,1.154,7.961,3.039 l5.657-5.657C34.046,7.053,29.268,5,24,5C16.318,5,9.656,9.337,6.306,14.691z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24,43c5.258,0,10.053-2.015,13.699-5.301l-6.332-5.346C29.309,34.521,26.833,35,24,35 c-5.304,0-9.78-3.367-11.387-8.055l-6.6,5.086C9.329,38.556,16.199,43,24,43z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.611,20.083H42V20H24v8h11.303c-1.091,3.266-3.591,5.773-6.636,6.996l6.332,5.346 C37.311,37.621,40,32.678,40,27C40,24.341,39.862,23.032,43.611,20.083z"
                    />
                  </svg>
                  Sign in with Google
                </button>
              </div>

              {/* Sign up */}
              <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-300">
                Don’t have an account?{" "}
                <a
                  href="/signup"
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  Create one
                </a>
              </p>
            </form>
          </div>
        </div>

        {/* Right: Welcome hero */}
        <div className="relative hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(1000px 400px at -10% 20%, rgba(255,255,255,0.25) 0%, transparent 60%), radial-gradient(800px 320px at 110% 80%, rgba(255,255,255,0.2) 0%, transparent 60%)",
            }}
          />
          <div className="relative h-full w-full p-12 text-white flex flex-col items-center justify-center text-center">
            <h3 className="text-5xl font-extrabold drop-shadow-md">
              Welcome Back!
            </h3>
            <p className="mt-4 max-w-sm text-white/90">
              Stay on top of gold markets with fast forecasts, alerts, and
              realistic pricing tools built for professionals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
