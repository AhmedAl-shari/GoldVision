/**
 * Push Notification Button Component
 * Allows users to enable/disable Arabic push notifications
 */

import React, { useState, useEffect } from "react";
import { Bell, BellOff, Loader, CheckCircle, XCircle } from "lucide-react";
import { useLocale } from "../contexts/useLocale";
import toast from "react-hot-toast";
import axios from "axios";
import { API_BASE_URL } from "../lib/config";

const PushNotificationButton: React.FC = () => {
  const { locale } = useLocale();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  const isArabic = locale === "ar";

  useEffect(() => {
    checkPushSupport();
    checkSubscriptionStatus();
  }, []);

  const checkPushSupport = () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setIsSupported(false);
      console.warn("[Push] Push notifications not supported in this browser");
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      if (!("serviceWorker" in navigator)) {
        setIsSubscribed(false);
        return;
      }

      // Wait for service worker to be ready (with timeout)
      let registration: ServiceWorkerRegistration;
      try {
        registration = (await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Service worker timeout")), 3000)
          ),
        ])) as ServiceWorkerRegistration;
      } catch (timeoutError: any) {
        // Silently handle timeout - this is normal in development with React strict mode
        // Only log if it's not a timeout (actual error)
        if (!timeoutError?.message?.includes("timeout")) {
          console.warn("[Push] Service worker error:", timeoutError);
        }
        setIsSubscribed(false);
        return;
      }

      const subscription = await registration.pushManager.getSubscription();

      // If we have a local subscription, verify it's still valid
      if (subscription && registration.active) {
        setIsSubscribed(true);
      } else {
        setIsSubscribed(false);
      }
    } catch (error: any) {
      console.error("[Push] Error checking subscription:", error);
      setIsSubscribed(false);
      // Ensure loading is reset if it was set
      setIsLoading(false);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribe = async () => {
    // Prevent multiple simultaneous clicks
    if (isLoading) {
      console.warn("[Push] Subscribe already in progress, ignoring click");
      return;
    }

    setIsLoading(true);

    // Global timeout to ensure loading state is always reset
    const globalTimeout = setTimeout(() => {
      console.error("[Push] Global timeout: subscribe operation took too long");
      setIsLoading(false);
      toast.error(
        isArabic
          ? "انتهت مهلة العملية. يرجى تحديث الصفحة والمحاولة مرة أخرى."
          : "Operation timed out. Please refresh the page and try again.",
        { duration: 6000 }
      );
    }, 30000); // 30 second global timeout

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        clearTimeout(globalTimeout);
        toast.error(
          isArabic ? "تم رفض إذن الإشعارات" : "Notification permission denied"
        );
        setIsLoading(false);
        return;
      }

      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        console.log("[Push] Registering service worker...");
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        // Wait for service worker to be ready with timeout
        await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Service worker registration timeout")),
              8000
            )
          ),
        ]);

        // Double-check registration is active
        registration = await navigator.serviceWorker.getRegistration();
        if (!registration || !registration.active) {
          throw new Error("Service worker registered but not active");
        }

        console.log("[Push] Service worker registered and ready");
      } else {
        // Ensure existing registration is ready
        await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Service worker ready timeout")),
              3000
            )
          ),
        ]);
      }

      // Get VAPID public key from server with timeout
      console.log("[Push] Fetching VAPID public key...");
      const {
        data: { publicKey },
      } = (await Promise.race([
        axios.get(`${API_BASE_URL}/push/vapid-public-key`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          timeout: 10000,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("VAPID key request timeout")),
            10000
          )
        ),
      ])) as { data: { publicKey: string } };

      const cleanedPublicKey = (publicKey || "").trim();
      if (!cleanedPublicKey) {
        throw new Error("VAPID public key not received");
      }

      // Validate VAPID key format (should be base64url encoded, ~87 characters)
      if (cleanedPublicKey.length < 80 || cleanedPublicKey.length > 100) {
        console.warn(
          "[Push] VAPID key length seems unusual:",
          cleanedPublicKey.length
        );
      }

      console.log(
        "[Push] VAPID public key received:",
        cleanedPublicKey.substring(0, 20) + "..."
      );

      // Subscribe to push notifications
      console.log("[Push] Creating push subscription...");
      let subscription;
      try {
        const applicationServerKey = urlBase64ToUint8Array(cleanedPublicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
        console.log("[Push] Push subscription created");
      } catch (subscribeError: any) {
        // Catch browser errors during subscription
        console.error("[Push] Browser subscription error:", subscribeError);
        if (
          subscribeError?.name === "AbortError" ||
          subscribeError?.message?.includes(
            "could not retrieve the public key"
          ) ||
          subscribeError?.message?.includes("Registration failed")
        ) {
          throw new Error(
            "Browser blocked push subscription. This can happen if:\n" +
              "1. Adblocker or privacy extension is blocking the request\n" +
              "2. Browser privacy settings prevent push notifications\n" +
              "3. Service worker registration is incomplete\n" +
              "Try disabling extensions or using a different browser."
          );
        }
        throw subscribeError;
      }

      // Send subscription to server with timeout
      console.log("[Push] Sending subscription to server...");
      const subscribeResponse = (await Promise.race([
        axios.post(
          `${API_BASE_URL}/push/subscribe`,
          { subscription },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
            timeout: 10000,
          }
        ),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Subscription request timeout")),
            10000
          )
        ),
      ])) as { data: { success: boolean } };

      if (subscribeResponse.data.success) {
        clearTimeout(globalTimeout);
        setIsSubscribed(true);
        console.log("[Push] Subscription successful");
        toast.success(
          isArabic
            ? "✅ تم تفعيل إشعارات الدفع!"
            : "✅ Push notifications enabled!",
          { duration: 3000 }
        );
      } else {
        throw new Error("Subscription not saved on server");
      }
    } catch (error: any) {
      clearTimeout(globalTimeout);
      console.error("[Push] Subscribe error:", error);

      let errorMessage = isArabic
        ? "فشل تفعيل الإشعارات"
        : "Failed to enable notifications";

      if (error.message?.includes("timeout")) {
        errorMessage = isArabic
          ? "انتهت مهلة الطلب. يرجى المحاولة مرة أخرى."
          : "Request timeout. Please try again.";
      } else if (error.response?.status === 400) {
        errorMessage = isArabic
          ? "بيانات الاشتراك غير صحيحة"
          : "Invalid subscription data";
      } else if (error.response?.status === 401) {
        errorMessage = isArabic
          ? "يرجى تسجيل الدخول أولاً"
          : "Please log in first";
      } else if (error.response?.status === 404) {
        errorMessage = isArabic
          ? "خدمة الإشعارات غير متاحة. يرجى المحاولة لاحقاً."
          : "Push notification service not available. Please try again later.";
      } else if (error.message?.includes("VAPID")) {
        errorMessage = isArabic
          ? "خطأ في إعدادات الإشعارات. يرجى المحاولة لاحقاً."
          : "Notification configuration error. Please try again later.";
      } else if (
        error?.name === "AbortError" ||
        error?.message?.includes("could not retrieve the public key") ||
        error?.message?.includes("Browser blocked push subscription") ||
        error?.message?.includes("Registration failed")
      ) {
        // Chromium-based browsers (and Brave Shields / some networks) can block the
        // underlying push service request and surface this generic AbortError.
        // Check if we have a more specific error message
        if (error?.message?.includes("Browser blocked")) {
          errorMessage = error.message;
        } else {
          errorMessage = isArabic
            ? "فشل الاشتراك في خدمة الدفع. جرّب تعطيل مانع الإعلانات/الحماية (Shields) أو VPN ثم أعد المحاولة."
            : "Push service subscription failed. Try disabling adblock/shields or VPN and retry.";
        }
      }

      toast.error(errorMessage, { duration: 5000 });
      setIsSubscribed(false);
    } finally {
      clearTimeout(globalTimeout);
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    // Prevent multiple simultaneous clicks
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      const registration = (await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Service worker timeout")), 5000)
        ),
      ])) as ServiceWorkerRegistration;

      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Notify server with timeout
        try {
          await Promise.race([
            axios.post(
              `${API_BASE_URL}/push/unsubscribe`,
              { endpoint: subscription.endpoint },
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem(
                    "access_token"
                  )}`,
                },
                timeout: 10000,
              }
            ),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error("Unsubscribe request timeout")),
                10000
              )
            ),
          ]);
        } catch (serverError: any) {
          // If server request fails, we still unsubscribe locally
          console.warn(
            "[Push] Failed to notify server of unsubscribe:",
            serverError
          );
        }
      }

      setIsSubscribed(false);
      toast.success(
        isArabic ? "تم إلغاء إشعارات الدفع" : "Push notifications disabled"
      );
    } catch (error: any) {
      console.error("[Push] Unsubscribe error:", error);

      let errorMessage = isArabic
        ? "فشل إلغاء الإشعارات"
        : "Failed to disable notifications";

      if (error.message?.includes("timeout")) {
        errorMessage = isArabic
          ? "انتهت مهلة الطلب. يرجى المحاولة مرة أخرى."
          : "Request timeout. Please try again.";
      }

      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    setIsLoading(true);
    try {
      // Check notification permission first
      if (Notification.permission !== "granted") {
        toast.error(
          isArabic
            ? "⚠️ يرجى منح إذن الإشعارات أولاً. تحقق من إعدادات المتصفح."
            : "⚠️ Please grant notification permission first. Check your browser settings.",
          { duration: 6000 }
        );
        setIsLoading(false);
        return;
      }

      // Verify service worker is ready
      let registration: ServiceWorkerRegistration | null = null;
      try {
        registration = await navigator.serviceWorker.ready;
        if (!registration) {
          throw new Error("Service worker not ready");
        }
      } catch (swError) {
        toast.error(
          isArabic
            ? "⚠️ Service Worker غير جاهز. يرجى تحديث الصفحة."
            : "⚠️ Service Worker not ready. Please refresh the page.",
          { duration: 5000 }
        );
        setIsLoading(false);
        return;
      }

      // Ensure we have a subscription saved on the server before testing.
      // The UI can show "Enabled" if the browser has a local subscription, but the DB may not
      // (e.g., after DB reset, or if the prior subscribe request failed). This prevents the
      // backend from returning "No push subscriptions found".
      try {
        const localSub = await registration.pushManager.getSubscription();
        if (!localSub) {
          toast.error(
            isArabic
              ? "⚠️ لا يوجد اشتراك إشعارات. يرجى تفعيل الإشعارات أولاً."
              : "⚠️ No push subscription found. Please enable notifications first.",
            { duration: 6000 }
          );
          setIsLoading(false);
          return;
        }

        await axios.post(
          `${API_BASE_URL}/push/subscribe`,
          { subscription: localSub },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
            timeout: 10000,
          }
        );

        // Keep UI state consistent
        setIsSubscribed(true);
      } catch (syncError: any) {
        console.warn(
          "[Push] Failed to sync subscription before test:",
          syncError
        );
        // Continue anyway — the test endpoint will report a clear error if needed.
      }

      const response = await axios.post(
        `${API_BASE_URL}/push/test`,
        { locale },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (response.data.success) {
        // Handle both old and new response formats
        const hasNewFormat =
          response.data.push !== undefined || response.data.email !== undefined;

        // If old format, try to infer push success from message
        let pushResult = response.data.push || {};
        let emailResult = response.data.email || {};

        if (!hasNewFormat) {
          // Old format: message like "Test notification sent to 1 device(s)"
          const message = response.data.message || "";
          if (message.includes("device")) {
            const match = message.match(/(\d+)\s*device/);
            const sentCount = match ? parseInt(match[1]) : 1;
            pushResult = { success: true, sentCount };
            console.warn(
              "[Push] Backend returned old response format. Please restart the backend server to enable email notifications."
            );
          } else {
            pushResult = { success: false, error: "Unknown response format" };
          }
        }

        // Build success message
        const parts = [];

        if (pushResult.success) {
          const sentCount = pushResult.sentCount || 0;
          parts.push(
            isArabic
              ? `إشعار الدفع: ${sentCount} جهاز`
              : `Push: ${sentCount} device(s)`
          );
        }

        if (emailResult.success) {
          parts.push(
            emailResult.mode === "ethereal"
              ? isArabic
                ? `البريد الإلكتروني: تم الإرسال (معاينة)`
                : `Email: Sent (preview)`
              : isArabic
              ? `البريد الإلكتروني: تم الإرسال`
              : `Email: Sent`
          );
        }

        let successMessage = "";
        if (parts.length > 0) {
          successMessage = isArabic
            ? `✅ تم إرسال الاختبار: ${parts.join("، ")}`
            : `✅ Test sent: ${parts.join(", ")}`;
        } else {
          successMessage = isArabic ? "✅ تم إرسال الاختبار" : "✅ Test sent";
        }

        toast.success(successMessage, { duration: 6000 });

        // Show warnings for failures
        if (!pushResult.success && pushResult.error) {
          console.warn("[Push] Push notification failed:", pushResult.error);
          if (pushResult.error !== "No push subscriptions found") {
            toast.error(
              isArabic
                ? `⚠️ فشل إشعار الدفع: ${pushResult.error}`
                : `⚠️ Push failed: ${pushResult.error}`,
              { duration: 4000 }
            );
          }
        }

        if (!emailResult.success && emailResult.error) {
          const emailError =
            emailResult.error === "Email not configured"
              ? isArabic
                ? "البريد الإلكتروني غير مُعد"
                : "Email not configured"
              : emailResult.error;
          toast.error(
            isArabic
              ? `⚠️ فشل إرسال البريد الإلكتروني: ${emailError}`
              : `⚠️ Email failed: ${emailError}`,
            { duration: 5000 }
          );
        } else if (!hasNewFormat) {
          // Show info message if backend hasn't been restarted
          toast.info(
            isArabic
              ? "ℹ️ يرجى إعادة تشغيل الخادم لتفعيل إشعارات البريد الإلكتروني"
              : "ℹ️ Please restart the backend server to enable email notifications",
            { duration: 5000 }
          );
        }

        // Log for debugging
        console.log("[Push] Test notification results:", response.data);
        console.log("[Push] Push result:", response.data.push);
        console.log("[Push] Email result:", response.data.email);
      } else {
        toast.error(
          isArabic
            ? "فشل إرسال الاختبار"
            : response.data.message || "Failed to send test",
          { duration: 5000 }
        );
      }
    } catch (error: any) {
      console.error("[Push] Test error:", error);

      // Handle specific error cases
      if (error.response?.status === 404) {
        toast.error(
          isArabic
            ? "⚠️ لم يتم العثور على اشتراك. يرجى تفعيل الإشعارات أولاً."
            : "⚠️ No subscription found. Please enable notifications first.",
          { duration: 5000 }
        );
        // Update subscription status
        setIsSubscribed(false);
      } else if (error.response?.status === 401) {
        toast.error(
          isArabic ? "يرجى تسجيل الدخول أولاً" : "Please log in first"
        );
      } else if (error.response?.data?.error) {
        toast.error(
          error.response.data.message ||
            error.response.data.error ||
            (isArabic
              ? "فشل إرسال الإشعار التجريبي"
              : "Failed to send test notification"),
          { duration: 5000 }
        );
      } else if (error.response?.data?.code === "NO_SUBSCRIPTION") {
        toast.error(
          isArabic
            ? "⚠️ يرجى تفعيل الإشعارات أولاً"
            : "⚠️ Please enable notifications first",
          { duration: 5000 }
        );
        setIsSubscribed(false);
      } else {
        toast.error(
          isArabic
            ? "فشل إرسال الإشعار التجريبي. تحقق من اتصالك بالإنترنت."
            : "Failed to send test notification. Please check your connection.",
          { duration: 5000 }
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <XCircle className="w-5 h-5" />
          <span className="text-sm">
            {isArabic
              ? "إشعارات الدفع غير مدعومة في هذا المتصفح"
              : "Push notifications not supported in this browser"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isSubscribed ? "bg-green-600" : "bg-blue-600"
            }`}
          >
            {isSubscribed ? (
              <CheckCircle className="w-5 h-5 text-white" />
            ) : (
              <Bell className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              {isArabic ? "إشعارات الدفع" : "Push Notifications"}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {isSubscribed
                ? isArabic
                  ? "مفعّل ✅"
                  : "Enabled ✅"
                : isArabic
                ? "معطّل"
                : "Disabled"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSubscribed && (
            <button
              onClick={sendTestNotification}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isLoading ? (
                <>
                  <Loader className="w-3 h-3 animate-spin" />
                  {isArabic ? "جاري..." : "Sending..."}
                </>
              ) : isArabic ? (
                "تجربة"
              ) : (
                "Test"
              )}
            </button>
          )}

          <button
            onClick={isSubscribed ? unsubscribe : subscribe}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
              isSubscribed
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                {isArabic ? "جاري..." : "Loading..."}
              </>
            ) : isSubscribed ? (
              <>
                <BellOff className="w-4 h-4" />
                {isArabic ? "إلغاء التفعيل" : "Disable"}
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                {isArabic ? "تفعيل الإشعارات" : "Enable Notifications"}
              </>
            )}
          </button>
        </div>
      </div>

      {isSubscribed && (
        <p className="mt-3 text-xs text-gray-600 dark:text-gray-400 bg-white/60 dark:bg-gray-800/60 rounded p-2">
          {isArabic
            ? "💡 ستتلقى إشعارات فورية عند تفعيل تنبيهاتك، حتى عند إغلاق التطبيق."
            : "💡 You'll receive instant notifications when your alerts trigger, even when the app is closed."}
        </p>
      )}
    </div>
  );
};

export default PushNotificationButton;
