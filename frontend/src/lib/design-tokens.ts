// Design Tokens for GoldVision
// Comprehensive design system with spacing, colors, typography, and component tokens

export const tokens = {
  // Spacing Scale (8px base unit)
  spacing: {
    xs: "0.25rem", // 4px
    sm: "0.5rem", // 8px
    md: "1rem", // 16px
    lg: "1.5rem", // 24px
    xl: "2rem", // 32px
    "2xl": "3rem", // 48px
    "3xl": "4rem", // 64px
    "4xl": "6rem", // 96px
  },

  // Border Radius Scale
  radius: {
    none: "0",
    sm: "0.125rem", // 2px
    md: "0.375rem", // 6px
    lg: "0.5rem", // 8px
    xl: "0.75rem", // 12px
    "2xl": "1rem", // 16px
    full: "9999px",
  },

  // Shadow Scale
  shadow: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
  },

  // Color Palette
  colors: {
    // Primary Gold Theme
    gold: {
      50: "#fffbeb",
      100: "#fef3c7",
      200: "#fde68a",
      300: "#fcd34d",
      400: "#fbbf24",
      500: "#f59e0b", // Primary gold
      600: "#d97706",
      700: "#b45309",
      800: "#92400e",
      900: "#78350f",
    },

    // Neutral Grays
    gray: {
      50: "#f9fafb",
      100: "#f3f4f6",
      200: "#e5e7eb",
      300: "#d1d5db",
      400: "#9ca3af",
      500: "#6b7280",
      600: "#4b5563",
      700: "#374151",
      800: "#1f2937",
      900: "#111827",
    },

    // Semantic Colors
    success: {
      50: "#ecfdf5",
      500: "#10b981",
      600: "#059669",
    },
    warning: {
      50: "#fffbeb",
      500: "#f59e0b",
      600: "#d97706",
    },
    error: {
      50: "#fef2f2",
      500: "#ef4444",
      600: "#dc2626",
    },
    info: {
      50: "#eff6ff",
      500: "#3b82f6",
      600: "#2563eb",
    },
  },

  // Typography Scale
  typography: {
    fontFamily: {
      sans: ["Inter", "system-ui", "sans-serif"],
      arabic: ["Tajawal", "system-ui", "sans-serif"],
      mono: ["JetBrains Mono", "monospace"],
    },
    fontSize: {
      xs: ["0.75rem", { lineHeight: "1rem" }],
      sm: ["0.875rem", { lineHeight: "1.25rem" }],
      base: ["1rem", { lineHeight: "1.5rem" }],
      lg: ["1.125rem", { lineHeight: "1.75rem" }],
      xl: ["1.25rem", { lineHeight: "1.75rem" }],
      "2xl": ["1.5rem", { lineHeight: "2rem" }],
      "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
      "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
      "5xl": ["3rem", { lineHeight: "1" }],
    },
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
  },

  // Component Tokens
  components: {
    button: {
      height: {
        sm: "2rem",
        md: "2.5rem",
        lg: "3rem",
      },
      padding: {
        sm: "0.5rem 1rem",
        md: "0.75rem 1.5rem",
        lg: "1rem 2rem",
      },
    },
    card: {
      padding: "1.5rem",
      borderRadius: "0.75rem",
      shadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    },
    input: {
      height: "2.5rem",
      padding: "0.75rem",
      borderRadius: "0.375rem",
      border: "1px solid #d1d5db",
    },
  },

  // Animation Tokens
  animation: {
    duration: {
      fast: "150ms",
      normal: "300ms",
      slow: "500ms",
    },
    easing: {
      ease: "cubic-bezier(0.4, 0, 0.2, 1)",
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      easeOut: "cubic-bezier(0, 0, 0.2, 1)",
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },

  // Breakpoints
  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },
} as const;

// Helper functions for token usage
export const getSpacing = (size: keyof typeof tokens.spacing) =>
  tokens.spacing[size];
export const getRadius = (size: keyof typeof tokens.radius) =>
  tokens.radius[size];
export const getShadow = (size: keyof typeof tokens.shadow) =>
  tokens.shadow[size];
export const getColor = (color: string) => {
  const [name, shade] = color.split("-");
  return (
    tokens.colors[name as keyof typeof tokens.colors]?.[
      shade as keyof typeof tokens.colors.gold
    ] || color
  );
};

// CSS Custom Properties for runtime theming
export const cssVariables = {
  "--spacing-xs": tokens.spacing.xs,
  "--spacing-sm": tokens.spacing.sm,
  "--spacing-md": tokens.spacing.md,
  "--spacing-lg": tokens.spacing.lg,
  "--spacing-xl": tokens.spacing.xl,
  "--radius-sm": tokens.radius.sm,
  "--radius-md": tokens.radius.md,
  "--radius-lg": tokens.radius.lg,
  "--shadow-sm": tokens.shadow.sm,
  "--shadow-md": tokens.shadow.md,
  "--shadow-lg": tokens.shadow.lg,
  "--color-gold-500": tokens.colors.gold[500],
  "--color-gold-600": tokens.colors.gold[600],
  "--color-gray-100": tokens.colors.gray[100],
  "--color-gray-500": tokens.colors.gray[500],
  "--color-gray-900": tokens.colors.gray[900],
} as const;
