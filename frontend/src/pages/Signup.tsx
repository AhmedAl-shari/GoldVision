import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Shield, Check } from "lucide-react";
import { useAuth } from "../contexts/useAuth";
import { useLocale } from "../contexts/useLocale";
import { validateGmailEmail } from "../lib/validation";
import { apiClient } from "../lib/api";
import toast from "react-hot-toast";
import { devError } from "../lib/devLog";

const Signup: React.FC = () => {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [agree, setAgree] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const strength = useMemo(() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s; // 0..4
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!email || !password || !confirm) {
      setError("Please fill all required fields.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!agree) {
      setError("Please accept the Terms to continue.");
      return;
    }

    // Validate Gmail email
    const emailValidation = validateGmailEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || "Invalid email.");
      return;
    }

    setIsLoading(true);

    try {
      // Register the user with selected role
      const response = await apiClient.signup(email, password, "en", role);

      // Show success message and redirect to login
      setError(null);
      toast.success(
        t("accountCreatedSuccessfully") || "✅ Account created successfully! Please log in with your credentials."
      );

      // Navigate to login page
      navigate("/login", { replace: true });
    } catch (err: any) {
      devError("Signup error:", err);

      // Handle specific error cases
      if (err?.response?.status === 409) {
        setError(
          "An account with this email already exists. Please try logging in instead."
        );
      } else if (err?.response?.status === 400) {
        setError(
          err?.response?.data?.detail ||
            "Invalid input. Please check your information."
        );
      } else if (err?.response?.status === 429) {
        setError("Too many signup attempts. Please try again later.");
      } else {
        setError("Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex items-center justify-center py-10 px-4">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-3xl overflow-hidden shadow-2xl bg-white border border-gray-200 dark:border-transparent dark:ring-1 dark:ring-white/10 dark:bg-white/5 dark:backdrop-blur">
        {/* Left: Form panel */}
        <div className="bg-white lg:border-r lg:border-gray-200 dark:border-transparent dark:bg-slate-900/30 p-8 sm:p-12">
          <div className="max-w-md mx-auto">
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Create account
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Join GoldVision to access professional market tools.
            </p>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-slate-900 dark:border-transparent dark:bg-slate-800/60 dark:text-slate-100 placeholder-slate-400 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Password
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-slate-900 dark:border-transparent dark:bg-slate-800/60 dark:text-slate-100 placeholder-slate-400 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="At least 8 characters"
                />
                <div className="mt-2 h-1 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`${
                      strength <= 1
                        ? "bg-red-500 w-1/4"
                        : strength === 2
                        ? "bg-yellow-500 w-2/4"
                        : strength === 3
                        ? "bg-blue-500 w-3/4"
                        : "bg-green-500 w-full"
                    } h-1 transition-all`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Confirm password
                </label>
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  type="password"
                  className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-slate-900 dark:border-transparent dark:bg-slate-800/60 dark:text-slate-100 placeholder-slate-400 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Re-enter password"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                  Account Type
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <label
                    onClick={() => setRole("user")}
                    className={`relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      role === "user"
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md shadow-indigo-500/10"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-slate-800/60"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="user"
                      checked={role === "user"}
                      onChange={(e) =>
                        setRole(e.target.value as "user" | "admin")
                      }
                      className="absolute opacity-0 w-0 h-0"
                      tabIndex={-1}
                    />
                    <div className="flex items-start space-x-3 flex-1 w-full">
                      <div
                        className={`p-2.5 rounded-lg ${
                          role === "user"
                            ? "bg-indigo-100 dark:bg-indigo-900/40"
                            : "bg-gray-100 dark:bg-gray-700"
                        }`}
                      >
                        <User
                          className={`w-5 h-5 ${
                            role === "user"
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div
                            className={`font-semibold ${
                              role === "user"
                                ? "text-indigo-900 dark:text-indigo-100"
                                : "text-gray-900 dark:text-white"
                            }`}
                          >
                            Regular User
                          </div>
                          {role === "user" && (
                            <Check className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                          )}
                        </div>
                        <div
                          className={`text-sm mt-1 ${
                            role === "user"
                              ? "text-indigo-700 dark:text-indigo-300"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          Access to market data, alerts, and forecasts
                        </div>
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setRole("admin")}
                    className={`relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      role === "admin"
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md shadow-purple-500/10"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-slate-800/60"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={role === "admin"}
                      onChange={(e) =>
                        setRole(e.target.value as "user" | "admin")
                      }
                      className="absolute opacity-0 w-0 h-0"
                      tabIndex={-1}
                    />
                    <div className="flex items-start space-x-3 flex-1 w-full">
                      <div
                        className={`p-2.5 rounded-lg ${
                          role === "admin"
                            ? "bg-purple-100 dark:bg-purple-900/40"
                            : "bg-gray-100 dark:bg-gray-700"
                        }`}
                      >
                        <Shield
                          className={`w-5 h-5 ${
                            role === "admin"
                              ? "text-purple-600 dark:text-purple-400"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div
                            className={`font-semibold ${
                              role === "admin"
                                ? "text-purple-900 dark:text-purple-100"
                                : "text-gray-900 dark:text-white"
                            }`}
                          >
                            Administrator
                          </div>
                          {role === "admin" && (
                            <Check className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                          )}
                        </div>
                        <div
                          className={`text-sm mt-1 ${
                            role === "admin"
                              ? "text-purple-700 dark:text-purple-300"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          Full access including admin dashboard and system
                          management
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <label className="flex items-center text-sm text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                />
                I agree to the{" "}
                <a
                  href="#"
                  className="ml-1 text-indigo-600 hover:text-indigo-700"
                >
                  Terms
                </a>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3 shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? t("creating") : t("createAccount")}
              </button>

              <p className="text-center text-xs text-slate-500">
                By creating an account you’ll get access to alerts, trends and
                more.
              </p>

              <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-300">
                Already have an account?{" "}
                <a
                  href="/login"
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  Sign in
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
              Welcome to GoldVision
            </h3>
            <p className="mt-4 max-w-sm text-white/90">
              Create an account and start using professional-grade gold market
              intelligence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
