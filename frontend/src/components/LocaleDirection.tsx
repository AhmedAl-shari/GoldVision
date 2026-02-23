import { useEffect } from "react";

const RTL_LOCALES = ["ar", "fa", "he", "ur"];

interface LocaleDirectionProps {
  locale: string;
  forceLTR?: boolean;
}

export function LocaleDirection({
  locale,
  forceLTR = false,
}: LocaleDirectionProps) {
  useEffect(() => {
    const html = document.documentElement;
    const isRTL =
      !forceLTR &&
      RTL_LOCALES.some((code) => locale?.toLowerCase().startsWith(code));

    html.setAttribute("dir", isRTL ? "rtl" : "ltr");
    html.setAttribute("lang", locale || "en");
  }, [locale, forceLTR]);

  return null;
}

export default LocaleDirection;

