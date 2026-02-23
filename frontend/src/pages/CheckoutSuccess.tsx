import React from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, ArrowRight, Sparkles } from "lucide-react";

const CheckoutSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const planName = searchParams.get("plan") || "Professional";
  const price = searchParams.get("price") || "9";

  const professionalFeatures = [
    "Unlimited alerts",
    "Email notifications",
    "Priority support",
    "Advanced analytics",
  ];

  const enterpriseFeatures = [
    "Unlimited everything",
    "Custom integrations",
    "24/7 dedicated support",
    "Team collaboration",
  ];

  const features = planName === "Enterprise" ? enterpriseFeatures : professionalFeatures;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 md:p-12">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to {planName}!
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Your subscription is now active. You can start using all {planName} features immediately.
          </p>

          {/* Features List */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-8 text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              What's Included:
            </h3>
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/alerts"
              className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              Set Up Alerts
            </Link>
          </div>

          {/* Note */}
          <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
            This is a demo payment. No actual charges were made.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;

