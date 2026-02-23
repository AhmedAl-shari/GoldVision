import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import {
  YemenSettingsProvider,
  useYemenSettings,
} from "../YemenSettingsContext";
import { LocaleProvider } from "../LocaleContext";
import { vi } from "vitest";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock URLSearchParams
const mockSearchParams = {
  get: vi.fn(),
  set: vi.fn(),
  clear: vi.fn(),
  toString: vi.fn(() => ""),
};
const mockSetSearchParams = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
  };
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <BrowserRouter>
    <LocaleProvider>
      <YemenSettingsProvider>{children}</YemenSettingsProvider>
    </LocaleProvider>
  </BrowserRouter>
);

describe("YemenSettingsContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.clear();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe("Unit Conversions", () => {
    it("should convert between different units correctly", () => {
      const { result } = renderHook(() => useYemenSettings(), { wrapper });

      // Test gram to ounce conversion
      const gramToOunce = result.current.convertPrice(
        31.1034768,
        "gram",
        "ounce"
      );
      expect(gramToOunce).toBeCloseTo(1, 6);

      // Test ounce to gram conversion
      const ounceToGram = result.current.convertPrice(1, "ounce", "gram");
      expect(ounceToGram).toBeCloseTo(31.1034768, 6);

      // Test gram to tola conversion
      const gramToTola = result.current.convertPrice(
        11.6638038,
        "gram",
        "tola"
      );
      expect(gramToTola).toBeCloseTo(1, 6);

      // Test tola to gram conversion
      const tolaToGram = result.current.convertPrice(1, "tola", "gram");
      expect(tolaToGram).toBeCloseTo(11.6638038, 6);

      // Test gram to mithqal conversion
      const gramToMithqal = result.current.convertPrice(
        4.25,
        "gram",
        "mithqal"
      );
      expect(gramToMithqal).toBeCloseTo(1, 6);

      // Test mithqal to gram conversion
      const mithqalToGram = result.current.convertPrice(1, "mithqal", "gram");
      expect(mithqalToGram).toBeCloseTo(4.25, 6);
    });

    it("should convert between different karats correctly", () => {
      const { result } = renderHook(() => useYemenSettings(), { wrapper });

      // Test 24K to 22K conversion
      const price24K = 1000;
      const price22K = result.current.convertPrice(
        price24K,
        "gram",
        "gram",
        24,
        22
      );
      expect(price22K).toBeCloseTo(916.6666666666666, 6);

      // Test 22K to 24K conversion
      const price22KTo24K = result.current.convertPrice(
        price22K,
        "gram",
        "gram",
        22,
        24
      );
      expect(price22KTo24K).toBeCloseTo(price24K, 6);

      // Test 24K to 21K conversion
      const price21K = result.current.convertPrice(
        price24K,
        "gram",
        "gram",
        24,
        21
      );
      expect(price21K).toBeCloseTo(875, 6);

      // Test 24K to 18K conversion
      const price18K = result.current.convertPrice(
        price24K,
        "gram",
        "gram",
        24,
        18
      );
      expect(price18K).toBeCloseTo(750, 6);
    });

    it("should handle combined unit and karat conversions", () => {
      const { result } = renderHook(() => useYemenSettings(), { wrapper });

      // Convert 1 ounce of 24K gold to grams of 22K gold
      const ounce24KToGram22K = result.current.convertPrice(
        1,
        "ounce",
        "gram",
        24,
        22
      );
      const expected = (31.1034768 * 22) / 24; // 1 ounce * 31.1034768 grams/ounce * 22/24 karat ratio
      expect(ounce24KToGram22K).toBeCloseTo(expected, 6);

      // Convert 1 tola of 22K gold to ounces of 24K gold
      const tola22KToOunce24K = result.current.convertPrice(
        1,
        "tola",
        "ounce",
        22,
        24
      );
      const expected2 = (11.6638038 / 31.1034768) * (24 / 22); // 1 tola * grams/tola / grams/ounce * karat ratio
      expect(tola22KToOunce24K).toBeCloseTo(expected2, 6);
    });
  });

  describe("Price Formatting", () => {
    it("should format USD prices with 2 decimal places", () => {
      const { result } = renderHook(() => useYemenSettings(), { wrapper });

      const formattedUSD = result.current.formatPrice(1234.567, "USD");
      expect(formattedUSD).toBe("$1234.57");
    });

    it("should format YER prices with 0 decimal places", () => {
      const { result } = renderHook(() => useYemenSettings(), { wrapper });

      const formattedYER = result.current.formatPrice(1234.567, "YER");
      expect(formattedYER).toBe("1,235 YER");
    });

    it("should handle edge cases in price formatting", () => {
      const { result } = renderHook(() => useYemenSettings(), { wrapper });

      // Test very small numbers
      const smallUSD = result.current.formatPrice(0.001, "USD");
      expect(smallUSD).toBe("$0.00");

      const smallYER = result.current.formatPrice(0.001, "YER");
      expect(smallYER).toBe("0 YER");

      // Test very large numbers
      const largeUSD = result.current.formatPrice(1234567.89, "USD");
      expect(largeUSD).toBe("$1234567.89");

      const largeYER = result.current.formatPrice(1234567.89, "YER");
      expect(largeYER).toBe("1,234,568 YER");
    });
  });

  describe("URL Persistence", () => {
    it("should load settings from URL parameters", () => {
      mockSearchParams.get.mockImplementation((key: string) => {
        const params: Record<string, string> = {
          region: "SANAA",
          unit: "tola",
          karat: "22",
        };
        return params[key] || null;
      });

      const { result } = renderHook(() => useYemenSettings(), { wrapper });

      expect(result.current.settings.region).toBe("SANAA");
      expect(result.current.settings.unit).toBe("tola");
      expect(result.current.settings.karat).toBe(22);
    });

    it("should fallback to localStorage when no URL params", () => {
      mockSearchParams.get.mockReturnValue(null);
      const savedSettings = {
        region: "TAIZ",
        unit: "ounce",
        karat: 21,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedSettings));

      const { result } = renderHook(() => useYemenSettings(), { wrapper });

      expect(result.current.settings.region).toBe("TAIZ");
      expect(result.current.settings.unit).toBe("ounce");
      expect(result.current.settings.karat).toBe(21);
    });

    it("should use defaults when no URL params or localStorage", () => {
      mockSearchParams.get.mockReturnValue(null);
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useYemenSettings(), { wrapper });

      expect(result.current.settings.region).toBe("ADEN");
      expect(result.current.settings.unit).toBe("gram");
      expect(result.current.settings.karat).toBe(24);
    });

    it("should update URL when settings change", () => {
      const { result } = renderHook(() => useYemenSettings(), { wrapper });

      act(() => {
        result.current.updateSettings({
          region: "IBB",
          unit: "mithqal",
          karat: 18,
        });
      });

      expect(mockSetSearchParams).toHaveBeenCalledWith(
        expect.any(URLSearchParams),
        { replace: true }
      );
    });
  });

  describe("Conversion Tooltips", () => {
    it("should generate correct tooltips for unit conversions", () => {
      const { result } = renderHook(() => useYemenSettings(), { wrapper });

      const tooltip = result.current.getConversionTooltip(
        "gram",
        "ounce",
        24,
        24
      );
      expect(tooltip).toBe("1 gram = 0.032 ounce");

      const tooltip2 = result.current.getConversionTooltip(
        "tola",
        "gram",
        24,
        24
      );
      expect(tooltip2).toBe("1 tola = 11.6638038 grams");
    });

    it("should generate correct tooltips for karat conversions", () => {
      const { result } = renderHook(() => useYemenSettings(), { wrapper });

      const tooltip = result.current.getConversionTooltip(
        "gram",
        "gram",
        24,
        22
      );
      expect(tooltip).toBe("22K = 24K × (22/24)");

      const tooltip2 = result.current.getConversionTooltip(
        "gram",
        "gram",
        22,
        18
      );
      expect(tooltip2).toBe("18K = 22K × (18/22)");
    });

    it("should generate combined tooltips for unit and karat conversions", () => {
      const { result } = renderHook(() => useYemenSettings(), { wrapper });

      const tooltip = result.current.getConversionTooltip(
        "gram",
        "ounce",
        24,
        22
      );
      expect(tooltip).toBe("1 gram = 0.032 ounce; 22K = 24K × (22/24)");
    });
  });

  describe("FX Badges", () => {
    it("should generate correct FX badges for different regions", () => {
      const { result } = renderHook(() => useYemenSettings(), { wrapper });

      const adenBadge = result.current.getFXBadge("ADEN");
      expect(adenBadge).toMatch(/Commercial \| Mid \| as-of \d{2}:\d{2}/);

      const sanaanBadge = result.current.getFXBadge("SANAA");
      expect(sanaanBadge).toMatch(/Official \| Mid \| as-of \d{2}:\d{2}/);

      const taizBadge = result.current.getFXBadge("TAIZ");
      expect(taizBadge).toMatch(/Regional \| Mid \| as-of \d{2}:\d{2}/);
    });

    it("should use provided timestamp in FX badge", () => {
      const { result } = renderHook(() => useYemenSettings(), { wrapper });

      const timestamp = "2025-01-20T10:32:00Z";
      const badge = result.current.getFXBadge("ADEN", timestamp);
      // The timestamp should be converted to local time, so we'll check for the pattern
      expect(badge).toMatch(/Commercial \| Mid \| as-of \d{2}:\d{2}/);
    });
  });

  describe("Regional Price Differences", () => {
    it("should handle different regional pricing logic", () => {
      const { result } = renderHook(() => useYemenSettings(), { wrapper });

      // Test that different regions can have different base prices
      // This would typically be handled by the backend, but we can test the context
      const basePrice = 2000;

      // Aden (Commercial) - typically higher due to port fees
      act(() => {
        result.current.updateSettings({ region: "ADEN" });
      });
      const adenPrice = result.current.convertPrice(basePrice);

      // Sana'a (Official) - typically standard pricing
      act(() => {
        result.current.updateSettings({ region: "SANAA" });
      });
      const sanaanPrice = result.current.convertPrice(basePrice);

      // Both should return the same price since conversion doesn't change base price
      // Regional differences would be handled at the data source level
      expect(adenPrice).toBe(basePrice);
      expect(sanaanPrice).toBe(basePrice);
    });
  });
});
