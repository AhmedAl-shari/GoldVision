import React from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useSettings } from "../contexts/SettingsContext";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Bell,
  AlertTriangle,
  X,
  Save,
  Loader2,
} from "lucide-react";

interface AlertFormData {
  rule_type: "price_above" | "price_below";
  threshold: number;
  direction: "above" | "below";
}

interface AlertFormProps {
  onSubmit: (data: AlertFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: {
    rule_type: "price_above" | "price_below";
    threshold: number;
  };
}

const AlertForm = ({
  onSubmit,
  onCancel,
  isLoading,
  initialData,
}: AlertFormProps) => {
  const { settings } = useSettings();
  const currencyLabel = settings.currency === "YER" ? "YER" : "USD";
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<AlertFormData>({
    defaultValues: initialData || {
      rule_type: "price_above",
      threshold: 0,
    },
  });

  // Reset form when initialData changes
  React.useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const ruleType = watch("rule_type");

  const handleFormSubmit = (data: AlertFormData) => {
    try {
      // Automatically set direction based on rule_type
      const formData = {
        ...data,
        direction: data.rule_type === "price_above" ? "above" : "below",
      };
      onSubmit(formData);
      if (initialData) {
        toast.success("Alert updated successfully!");
      } else {
        toast.success("Alert created successfully!");
      }
    } catch {
      toast.error(
        initialData ? "Failed to update alert" : "Failed to create alert"
      );
    }
  };

  return (
    <div
      className="p-8"
      data-testid="alert-form"
      role="dialog"
      aria-labelledby="alert-form-title"
      aria-describedby="alert-form-description"
    >
      <div className="flex items-center space-x-3 mb-6">
        <div
          className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg"
          aria-hidden="true"
        >
          <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3
            id="alert-form-title"
            className="text-2xl font-bold text-gray-900 dark:text-white"
          >
            {initialData ? "Edit Alert" : "Create New Alert"}
          </h3>
          <p
            id="alert-form-description"
            className="text-gray-600 dark:text-gray-400"
          >
            {initialData
              ? "Update your price monitoring alert"
              : `Set up intelligent price monitoring for ${currencyLabel}`}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="space-y-6"
        aria-label="Alert creation form"
      >
        {/* Alert Type Selection */}
        <fieldset className="space-y-3">
          <legend
            id="alert-type-legend"
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
          >
            Alert Type
          </legend>
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            role="radiogroup"
            aria-labelledby="alert-type-legend"
          >
            <label
              className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                ruleType === "price_above"
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                  : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
              }`}
            >
              <input
                type="radio"
                value="price_above"
                {...register("rule_type", {
                  required: "Alert type is required",
                })}
                className="sr-only"
                data-testid="alert-type-above"
                aria-describedby="price-above-description"
              />
              <div className="flex items-center space-x-3">
                <div
                  className="p-2 bg-green-100 dark:bg-green-900 rounded-lg"
                  aria-hidden="true"
                >
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Price Above
                  </div>
                  <div
                    id="price-above-description"
                    className="text-sm text-gray-600 dark:text-gray-400"
                  >
                    Alert when price rises above threshold
                  </div>
                </div>
              </div>
            </label>

            <label
              className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                ruleType === "price_below"
                  ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                  : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
              }`}
            >
              <input
                type="radio"
                value="price_below"
                {...register("rule_type", {
                  required: "Alert type is required",
                })}
                className="sr-only"
                data-testid="alert-type-below"
                aria-describedby="price-below-description"
              />
              <div className="flex items-center space-x-3">
                <div
                  className="p-2 bg-red-100 dark:bg-red-900 rounded-lg"
                  aria-hidden="true"
                >
                  <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Price Below
                  </div>
                  <div
                    id="price-below-description"
                    className="text-sm text-gray-600 dark:text-gray-400"
                  >
                    Alert when price falls below threshold
                  </div>
                </div>
              </div>
            </label>
          </div>
          {errors.rule_type && (
            <p
              className="text-sm text-red-600 dark:text-red-400 flex items-center space-x-1"
              role="alert"
              aria-live="polite"
            >
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              <span>{errors.rule_type.message}</span>
            </p>
          )}
        </fieldset>

        {/* Threshold Price */}
        <div className="space-y-3">
          <label
            htmlFor="threshold-input"
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
          >
            Threshold Price ({currencyLabel})
          </label>
          <div className="relative">
            <div
              className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              aria-hidden="true"
            >
              <DollarSign className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="threshold-input"
              type="number"
              step="0.01"
              min="0"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={`Enter price threshold in ${currencyLabel}`}
              data-testid="threshold-input"
              aria-label={`Threshold price in ${currencyLabel}`}
              aria-required="true"
              aria-describedby={
                errors.threshold
                  ? "threshold-error"
                  : settings.currency === "YER"
                  ? "yer-note"
                  : undefined
              }
              {...register("threshold", {
                required: "Threshold is required",
                min: { value: 0.01, message: "Threshold must be positive" },
              })}
            />
          </div>
          {errors.threshold && (
            <p
              id="threshold-error"
              className="text-sm text-red-600 dark:text-red-400 flex items-center space-x-1"
              role="alert"
              aria-live="polite"
            >
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              <span>{errors.threshold.message}</span>
            </p>
          )}

          {settings.currency === "YER" && (
            <div
              id="yer-note"
              className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
              role="note"
              aria-label="Yemen currency note"
            >
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Alert compares against YER-converted spot
                using the latest USD→YER FX rate.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div
          className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700"
          role="group"
          aria-label="Form actions"
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex items-center space-x-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            data-testid="cancel-alert-button"
            aria-label="Cancel alert creation"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            <span>Cancel</span>
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            data-testid="submit-alert-button"
            aria-label={
              isLoading ? "Creating alert, please wait" : "Create alert"
            }
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>{initialData ? "Updating..." : "Creating..."}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" aria-hidden="true" />
                <span>{initialData ? "Update Alert" : "Create Alert"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AlertForm;
