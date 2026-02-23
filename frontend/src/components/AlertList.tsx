import toast from "react-hot-toast";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Copy,
  Edit,
  Share2,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { AlertData } from "../lib/api";
import { useLocale } from "../contexts/useLocale";
import {
  downloadAlertICS,
  generateGoogleCalendarLink,
  generateWhatsAppShare,
} from "../utils/calendarExport";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const formatMoney = (value: number | string) => {
  const amount = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(amount) ? currencyFormatter.format(amount) : "—";
};

interface AlertListProps {
  alerts: AlertData[];
  onDelete: (id: number) => void;
  onEdit?: (alert: AlertData) => void;
  onCopy?: (alert: AlertData) => void;
  isLoading?: boolean;
}

const AlertList = ({
  alerts,
  onDelete,
  onEdit,
  onCopy,
  isLoading,
}: AlertListProps) => {
  const { formatDate } = useLocale();

  // Format date with time for alerts
  const formatDateWithTime = (date: string) => {
    const dateObj = new Date(date);
    const dateStr = formatDate(dateObj);
    const timeStr = dateObj.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateStr} ${timeStr}`;
  };

  const handleDownloadICS = async (alert: AlertData) => {
    try {
      await downloadAlertICS(alert as any, "en");
      toast.success("Calendar event downloaded (.ics)");
    } catch (error) {
      console.error("Failed to download ICS:", error);
      toast.error("Failed to generate calendar event");
    }
  };

  const handleGoogleCalendar = (alert: AlertData) => {
    const link = generateGoogleCalendarLink(alert as any, "en");
    window.open(link, "_blank", "noopener,noreferrer");
    toast.success("Opening Google Calendar…");
  };

  const handleWhatsAppShare = (alert: AlertData) => {
    const link = generateWhatsAppShare(alert as any, "en");
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const getAlertDescription = (alert: AlertData) => {
    const direction = alert.direction === "above" ? "above" : "below";
    const threshold =
      typeof alert.threshold === "number"
        ? alert.threshold
        : Number.parseFloat(alert.threshold as string) || 0;
    return `Alert when price goes ${direction} $${threshold.toFixed(2)}`;
  };

  const handleCopy = (alert: AlertData) => {
    const alertText = `Alert: ${getAlertDescription(
      alert
    )} - Threshold: ${formatMoney(alert.threshold)}`;
    navigator.clipboard
      .writeText(alertText)
      .then(() => {
        toast.success("Alert details copied to clipboard!");
      })
      .catch(() => {
        toast.error("Failed to copy alert details");
      });
  };

  const isDark =
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false;

  const statusBadge = (alert: AlertData) => {
    const triggered = Boolean(alert.triggered_at);
    const tone = triggered
      ? isDark
        ? "bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/30"
        : "bg-rose-100 text-rose-700 ring-1 ring-rose-300/60"
      : isDark
      ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30"
      : "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300/60";
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${tone}`}
      >
        {triggered ? (
          <>
            <AlertTriangle className="h-3.5 w-3.5" />
            Triggered
          </>
        ) : (
          <>
            <CheckCircle className="h-3.5 w-3.5" />
            Active
          </>
        )}
      </span>
    );
  };

  const directionIcon = (alert: AlertData) =>
    alert.direction === "above" ? (
      <TrendingUp className="h-5 w-5" />
    ) : (
      <TrendingDown className="h-5 w-5" />
    );

  if (alerts.length === 0) {
    const emptyContainer = isDark
      ? "border-slate-500/40 bg-slate-900/20 text-slate-400"
      : "border-slate-200 bg-slate-50 text-slate-500";
    const emptyIcon = isDark
      ? "bg-slate-800 text-slate-500"
      : "bg-white text-slate-400";

    return (
      <div
        className={`rounded-2xl border border-dashed py-12 text-center text-sm ${emptyContainer}`}
      >
        <div
          className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${emptyIcon}`}
        >
          <TrendingUp className="h-10 w-10" />
        </div>
        No alerts created yet. Use “Create Alert” to start tracking levels that
        matter to you.
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="alert-list">
      {alerts.map((alert) => {
        const triggered = Boolean(alert.triggered_at);
        const cardTone = triggered
          ? isDark
            ? "border-rose-400/35 bg-rose-500/5 shadow-rose-500/20"
            : "border-rose-200 bg-rose-50 shadow-rose-100"
          : isDark
          ? "border-slate-200/15 bg-slate-900/40 shadow-blue-500/10"
          : "border-slate-200 bg-white shadow-blue-100/40";
        const hoverTone = isDark
          ? "hover:border-blue-400/40"
          : "hover:border-blue-300/60";
        const iconTone = triggered
          ? isDark
            ? "bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/40"
            : "bg-rose-100 text-rose-600 ring-1 ring-rose-300/60"
          : isDark
          ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/40"
          : "bg-emerald-100 text-emerald-600 ring-1 ring-emerald-300/60";
        const thresholdCard = isDark
          ? "border-white/10 bg-slate-900/40 text-slate-200"
          : "border-slate-200 bg-slate-50 text-slate-700";
        const thresholdLabel = isDark ? "text-slate-400" : "text-slate-500";
        const thresholdValue = isDark ? "text-white" : "text-slate-900";

        const downloadButton = isDark
          ? "inline-flex items-center gap-1 rounded-lg bg-blue-500/15 px-3 py-1.5 text-blue-100 transition hover:bg-blue-500/25"
          : "inline-flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-1.5 text-blue-700 transition hover:bg-blue-200";
        const googleButton = isDark
          ? "inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-emerald-100 transition hover:bg-emerald-500/25"
          : "inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-emerald-700 transition hover:bg-emerald-200";
        const whatsappButton = isDark
          ? "inline-flex items-center gap-1 rounded-lg bg-slate-500/20 px-3 py-1.5 text-slate-100 transition hover:bg-slate-500/30"
          : "inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-slate-700 transition hover:bg-slate-200";

        const toolbarButton = isDark
          ? "rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
          : "rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600";

        return (
          <article
            key={alert.id}
            className={`relative overflow-hidden rounded-2xl border px-6 py-6 backdrop-blur transition hover:-translate-y-0.5 ${hoverTone} ${cardTone}`}
            data-testid={`alert-item-${alert.id}`}
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-1 gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconTone}`}
                >
                  {directionIcon(alert)}
                </div>

                <div className="flex-1 space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {getAlertDescription(alert)}
                    </h4>
                    {statusBadge(alert)}
                  </div>

                  <div
                    className={`flex flex-wrap gap-4 text-xs ${
                      isDark ? "text-slate-500" : "text-slate-600"
                    }`}
                  >
                    <span>
                      Created:{" "}
                      <strong
                        className={`font-medium ${
                          isDark ? "text-slate-100" : "text-slate-800"
                        }`}
                      >
                        {formatDateWithTime(alert.created_at)}
                      </strong>
                    </span>
                    {alert.triggered_at && (
                      <span
                        className={isDark ? "text-rose-300" : "text-rose-600"}
                      >
                        Triggered: {formatDateWithTime(alert.triggered_at)}
                      </span>
                    )}
                  </div>

                  <div
                    className={`rounded-xl border px-4 py-3 text-sm shadow-inner ${thresholdCard}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs uppercase tracking-wide ${thresholdLabel}`}
                      >
                        Threshold Price
                      </span>
                      <span
                        className={`text-lg font-semibold ${thresholdValue}`}
                      >
                        {formatMoney(alert.threshold)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-medium">
                    <button
                      onClick={() => handleDownloadICS(alert)}
                      className={downloadButton}
                      title="Download .ics file"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Download .ics
                    </button>
                    <button
                      onClick={() => handleGoogleCalendar(alert)}
                      className={googleButton}
                      title="Add to Google Calendar"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Google Calendar
                    </button>
                    <button
                      onClick={() => handleWhatsAppShare(alert)}
                      className={whatsappButton}
                      title="Share via WhatsApp"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      WhatsApp
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <button
                  onClick={() => (onCopy ? onCopy(alert) : handleCopy(alert))}
                  className={toolbarButton}
                  title="Copy alert details"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onEdit && !triggered) {
                      onEdit(alert);
                    }
                  }}
                  disabled={triggered || !onEdit}
                  className={`${toolbarButton} ${
                    triggered || !onEdit ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  title={
                    triggered ? "Cannot edit triggered alerts" : "Edit alert"
                  }
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(alert.id)}
                  disabled={isLoading}
                  className={`${toolbarButton} disabled:opacity-50`}
                  title="Delete alert"
                  data-testid={`delete-alert-${alert.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default AlertList;
