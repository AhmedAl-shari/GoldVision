import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Lock, Loader2, CheckCircle, X } from "lucide-react";
import toast from "react-hot-toast";

interface StripeCheckoutProps {
  planName: string;
  price: number;
  isEnterprise?: boolean;
  onClose: () => void;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  planName,
  price,
  isEnterprise,
  onClose,
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "processing" | "success">("form");
  const [formData, setFormData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvc: "",
    name: "",
    email: "",
  });

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === "cardNumber") {
      setFormData({ ...formData, [field]: formatCardNumber(value) });
    } else if (field === "expiryDate") {
      setFormData({ ...formData, [field]: formatExpiry(value) });
    } else if (field === "cvc") {
      setFormData({ ...formData, [field]: value.replace(/\D/g, "").slice(0, 3) });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("processing");

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setStep("success");
    toast.success("Payment successful!");

    // Redirect to success page after 1.5 seconds
    setTimeout(() => {
      navigate(`/checkout-success?plan=${planName}&price=${price}`);
      onClose();
    }, 1500);
  };

  if (step === "success") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Payment Successful!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Your {planName} subscription is now active.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Complete Payment
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Secure checkout powered by Stripe
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Summary */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Order Summary
          </h3>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">
              {planName} Plan
            </span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              ${price}/month
            </span>
          </div>
        </div>

        {/* Enterprise Note */}
        {isEnterprise && (
          <div className="px-6 py-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              💼 Enterprise plans include custom setup. Our team will contact you after payment.
            </p>
          </div>
        )}

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="you@example.com"
            />
          </div>

          {/* Card Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Card Number
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required
                value={formData.cardNumber}
                onChange={(e) => handleInputChange("cardNumber", e.target.value)}
                maxLength={19}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="4242 4242 4242 4242"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Use test card: 4242 4242 4242 4242
            </p>
          </div>

          {/* Expiry and CVC */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expiry Date
              </label>
              <input
                type="text"
                required
                value={formData.expiryDate}
                onChange={(e) => handleInputChange("expiryDate", e.target.value)}
                maxLength={5}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="MM/YY"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CVC
              </label>
              <input
                type="text"
                required
                value={formData.cvc}
                onChange={(e) => handleInputChange("cvc", e.target.value)}
                maxLength={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="123"
              />
            </div>
          </div>

          {/* Cardholder Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cardholder Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="John Doe"
            />
          </div>

          {/* Security Badge */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Lock className="w-4 h-4" />
            <span>Your payment information is secure and encrypted</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={step === "processing"}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {step === "processing" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                Pay ${price}/month
              </>
            )}
          </button>

          {/* Test Card Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-2">
              💳 Test Mode - Use these test cards:
            </p>
            <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Success: 4242 4242 4242 4242</li>
              <li>• Any future expiry date (e.g., 12/34)</li>
              <li>• Any 3-digit CVC</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StripeCheckout;

