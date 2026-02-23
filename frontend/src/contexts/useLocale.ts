import { useContext } from "react";
import { LocaleContext } from "./LocaleContext";
import type { LocaleContextType } from "./localeTypes";

export const useLocale = (): LocaleContextType => {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
};
