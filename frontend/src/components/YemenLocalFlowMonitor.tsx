import React, { useMemo } from "react";
import {
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Shield,
  RefreshCw,
} from "lucide-react";
import { useLocale } from "../contexts/useLocale";
import {
  useYemenLocalFlow,
  type YemenLocalFlowReport,
} from "../lib/api";

type FlowTrend = "inbound" | "outbound";

type ConfidenceLevel = "high" | "medium" | "low";

type RegionDetail = {
  label: { en: string; ar: string };
  fallbackNote: { en: string; ar: string };
  fallbackTrend: FlowTrend;
  fallbackPercentage: number;
  fallbackConfidence: ConfidenceLevel;
};

const REGION_ORDER = ["SANAA", "ADEN", "TAIZ", "MARIB"] as const;

const REGION_DETAILS: Record<string, RegionDetail> = {
  SANAA: {
    label: { en: "Sanaa (Wholesale)", ar: "صنعاء (الجملة)" },
    fallbackNote: {
      en: "Healthy inflow from Gulf suppliers",
      ar: "تدفق قوي من موردي الخليج",
    },
    fallbackTrend: "inbound",
    fallbackPercentage: 8.2,
    fallbackConfidence: "high",
  },
  ADEN: {
    label: { en: "Aden Markets", ar: "أسواق عدن" },
    fallbackNote: {
      en: "Seasonal demand draining inventory",
      ar: "الطلب الموسمي يقلل المخزون",
    },
    fallbackTrend: "outbound",
    fallbackPercentage: 3.4,
    fallbackConfidence: "medium",
  },
  TAIZ: {
    label: { en: "Taiz Retail", ar: "تعز (القطاع التجاري)" },
    fallbackNote: {
      en: "Recovery after recent shortages",
      ar: "تعافي بعد نقص الإمدادات",
    },
    fallbackTrend: "inbound",
    fallbackPercentage: 5.1,
    fallbackConfidence: "medium",
  },
  MARIB: {
    label: { en: "Marib Refiners", ar: "مأرب (المصافي)" },
    fallbackNote: {
      en: "Limited refinery output available",
      ar: "إنتاج المصافي محدود",
    },
    fallbackTrend: "inbound",
    fallbackPercentage: 2.7,
    fallbackConfidence: "low",
  },
};

interface FlowMetric {
  regionCode: string;
  region: string;
  trend: FlowTrend;
  percentage: number;
  confidence: ConfidenceLevel;
  note: string;
  reportDate: string | null;
  supplyPressure?: number | null;
  demandPressure?: number | null;
}

const DEFAULT_REFRESH_INTERVAL_HOURS = 6;

const YemenLocalFlowMonitor: React.FC = () => {
  const { locale } = useLocale();
  const isArabic = locale === "ar";
  const translate = (en: string, ar: string) => (isArabic ? ar : en);

  const { data, isLoading, isError } = useYemenLocalFlow();
  const metadata = data?.metadata;
  const refreshInterval = metadata?.refreshIntervalHours ?? DEFAULT_REFRESH_INTERVAL_HOURS;

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale]
  );

  const lastUpdatedFormatted = useMemo(() => {
    if (!metadata?.lastReportDate) return null;
    try {
      return dateTimeFormatter.format(new Date(metadata.lastReportDate));
    } catch (error) {
      return metadata.lastReportDate;
    }
  }, [metadata?.lastReportDate, dateTimeFormatter]);

  const fallbackMetrics = useMemo<FlowMetric[]>(
    () =>
      REGION_ORDER.map((code) => {
        const details = REGION_DETAILS[code];
        return {
          regionCode: code,
          region: isArabic ? details.label.ar : details.label.en,
          trend: details.fallbackTrend,
          percentage: details.fallbackPercentage,
          confidence: details.fallbackConfidence,
          note: isArabic ? details.fallbackNote.ar : details.fallbackNote.en,
          reportDate: null,
        };
      }),
    [isArabic]
  );

  const remoteMetrics = useMemo<FlowMetric[] | null>(() => {
    if (!data?.data?.length) {
      return null;
    }

    const orderWeight = new Map<string, number>(
      REGION_ORDER.map((code, index) => [code, index])
    );

    const normalizeReport = (report: YemenLocalFlowReport): FlowMetric => {
      const details = REGION_DETAILS[report.region];
      const label = details
        ? isArabic
          ? details.label.ar
          : details.label.en
        : report.region;
      const fallbackNote = details
        ? isArabic
          ? details.fallbackNote.ar
          : details.fallbackNote.en
        : translate("No note provided yet.", "لا توجد ملاحظات متاحة بعد.");

      const percentage =
        typeof report.percentage === "number" && !Number.isNaN(report.percentage)
          ? Math.abs(report.percentage)
          : typeof report.netFlow === "number" && !Number.isNaN(report.netFlow)
          ? Math.abs(report.netFlow)
          : 0;

      const confidence: ConfidenceLevel = ["high", "medium", "low"].includes(
        report.confidence
      )
        ? (report.confidence as ConfidenceLevel)
        : "medium";

      return {
        regionCode: report.region,
        region: label,
        trend: report.trend === "outbound" ? "outbound" : "inbound",
        percentage,
        confidence,
        note:
          report.note && report.note.trim().length > 0
            ? report.note
            : fallbackNote,
        reportDate: report.reportDate,
        supplyPressure: report.supplyPressure,
        demandPressure: report.demandPressure,
      };
    };

    const normalized = data.data.map(normalizeReport);

    normalized.sort((a, b) => {
      const aOrder = orderWeight.has(a.regionCode)
        ? orderWeight.get(a.regionCode)!
        : REGION_ORDER.length + 1;
      const bOrder = orderWeight.has(b.regionCode)
        ? orderWeight.get(b.regionCode)!
        : REGION_ORDER.length + 1;

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      if (a.reportDate && b.reportDate) {
        return (
          new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
        );
      }

      return b.percentage - a.percentage;
    });

    return normalized;
  }, [data, isArabic, translate]);

  const flowMetrics =
    remoteMetrics && remoteMetrics.length > 0 ? remoteMetrics : fallbackMetrics;
  const usingDynamicData = Boolean(remoteMetrics && remoteMetrics.length > 0);

  const averageFlow = useMemo(() => {
    const inbound = flowMetrics.filter((metric) => metric.trend === "inbound");
    const outbound = flowMetrics.filter((metric) => metric.trend === "outbound");

    const avg = (items: FlowMetric[]) =>
      items.reduce((acc, item) => acc + item.percentage, 0) /
      (items.length || 1);

    return {
      inbound: Number(avg(inbound).toFixed(1)),
      outbound: Number(avg(outbound).toFixed(1)),
    };
  }, [flowMetrics]);

  const formatReportDate = (value: string | null) => {
    if (!value) return null;
    try {
      return dateTimeFormatter.format(new Date(value));
    } catch (error) {
      return value;
    }
  };

  return (
    <section
      className="card !p-6 bg-gradient-to-br from-amber-50 via-white to-rose-50 dark:from-amber-900/20 dark:via-gray-900 dark:to-rose-900/20"
      aria-labelledby="yemen-local-flow-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-300 uppercase tracking-wide">
            <MapPin className="h-4 w-4" />
            {translate("Yemen Supply Pulse", "نبض الإمدادات اليمنية")}
          </div>
          <h3
            id="yemen-local-flow-heading"
            className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white"
          >
            {translate("Local Flow Monitor", "مراقبة تدفق الذهب المحلي")}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            {translate(
              "Snapshot of wholesale and retail movement across key Yemeni hubs. Forecasts are blended from trader sentiment, field reports, and GoldVision telemetry.",
              "نظرة عامة على حركة الجملة والتجزئة عبر أهم المراكز اليمنية. يتم دمج التوقعات من آراء التجار والتقارير الميدانية وبيانات GoldVision."
            )}
          </p>
        </div>
        <div className="flex flex-col gap-1 px-4 py-3 rounded-2xl bg-white/70 dark:bg-white/5 border border-amber-100 dark:border-white/10 shadow-sm min-w-[200px]">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            {translate("Next update", "التحديث القادم")}
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {translate(`${refreshInterval} hours`, `خلال ${refreshInterval} ساعة`)}
          </div>
          {lastUpdatedFormatted && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {translate("Last report", "آخر تقرير")}: {lastUpdatedFormatted}
            </div>
          )}
          {isLoading && (
            <div className="text-xs text-gray-400 dark:text-gray-500">
              {translate("Refreshing live reports…", "جارٍ تحديث التقارير الحية...")}
            </div>
          )}
        </div>
      </div>

      {isError && (
        <div className="mb-4 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/80 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {translate(
            "Live field reports are temporarily unavailable. Showing baseline estimates instead.",
            "التقارير الميدانية الحية غير متاحة مؤقتًا. يتم عرض تقديرات أساسية بدلاً من ذلك."
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {flowMetrics.map((metric) => {
          const formattedReportDate = formatReportDate(metric.reportDate);
          return (
            <article
              key={metric.regionCode}
              className="rounded-2xl border border-amber-100/80 dark:border-amber-800/50 bg-white dark:bg-gray-800 p-5 shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {metric.region}
                  </h4>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {metric.note}
                  </p>
                  {formattedReportDate && (
                    <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                      {translate("Updated", "آخر تحديث")}: {formattedReportDate}
                    </p>
                  )}
                </div>
                <div
                  className={`p-2 rounded-lg ${
                    metric.trend === "inbound"
                      ? "bg-green-500/15 text-green-700 dark:bg-green-500/25 dark:text-green-200"
                      : "bg-red-500/15 text-red-600 dark:bg-red-500/25 dark:text-red-200"
                  }`}
                >
                  {metric.trend === "inbound" ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {metric.percentage.toFixed(1)}%
                </span>
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {metric.trend === "inbound"
                    ? translate("Inbound", "وارد")
                    : translate("Outbound", "صادر")}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span>
                    {translate("Confidence", "درجة الثقة")}: {" "}
                    {metric.confidence === "high"
                      ? translate("High", "مرتفعة")
                      : metric.confidence === "medium"
                      ? translate("Medium", "متوسطة")
                      : translate("Low", "منخفضة")}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <Activity className="h-3 w-3" />
                  <span>{translate("Flow Index", "مؤشر التدفق")}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-amber-100 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-900/20 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 text-sm text-amber-800 dark:text-amber-200">
          <Shield className="h-4 w-4" />
          <span>
            {translate(
              usingDynamicData
                ? "Live reports show inbound supply outpacing outbound demand across major hubs."
                : "Inbound supply is outpacing outbound demand. Traders in Sanaa and Taiz report stable availability with moderate premiums.",
              usingDynamicData
                ? "التقارير الحية تُظهر أن المعروض الوارد يتجاوز الطلب الصادر في المراكز الرئيسية."
                : "التدفق الوارد يتجاوز الطلب الصادر. يذكر التجار في صنعاء وتعز توافرًا مستقرًا مع هوامش معتدلة."
            )}
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm font-semibold text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-300" />
            <span>
              {translate("Avg inbound", "متوسط الوارد")}: {averageFlow.inbound.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowDownRight className="h-4 w-4 text-red-500 dark:text-red-300" />
            <span>
              {translate("Avg outbound", "متوسط الصادر")}: {averageFlow.outbound.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {!usingDynamicData && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {translate(
            "Using baseline demo scenarios until live local-flow reports are published.",
            "يتم استخدام سيناريوهات توضيحية حتى يتم نشر التقارير الحية لتدفق الأسواق المحلية."
          )}
        </p>
      )}
    </section>
  );
};

export default YemenLocalFlowMonitor;

