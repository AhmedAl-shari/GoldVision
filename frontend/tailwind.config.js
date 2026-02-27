/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      container: {
        center: true,
        screens: {
          xl: "1200px",
        },
      },
      colors: {
        background: "rgb(var(--gv-color-bg) / <alpha-value>)",
        foreground: "rgb(var(--gv-color-fg) / <alpha-value>)",
        muted: "rgb(var(--gv-color-muted) / <alpha-value>)",
        card: "rgb(var(--gv-color-bg) / <alpha-value>)",
        "card-foreground": "rgb(var(--gv-color-fg) / <alpha-value>)",
        "primary-foreground":
          "rgb(var(--gv-color-primary-foreground) / <alpha-value>)",
        secondary: "rgb(var(--gv-color-secondary) / <alpha-value>)",
        "secondary-foreground":
          "rgb(var(--gv-color-secondary-foreground) / <alpha-value>)",
        accent: "rgb(var(--gv-color-accent) / <alpha-value>)",
        "accent-foreground":
          "rgb(var(--gv-color-accent-foreground) / <alpha-value>)",
        border: "rgb(var(--gv-color-border) / <alpha-value>)",
        ring: "rgb(var(--gv-color-ring) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--gv-color-primary) / <alpha-value>)",
          50: "#eff6ff",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        brand: {
          50: "#F7F7F5",
          100: "#EFEDE6",
          200: "#DCD8BE",
          300: "#C7C092",
          400: "#B6A86C",
          500: "#A88F3D", // soft gold
          600: "#8D7730",
          700: "#6E5C25",
          800: "#53461D",
          900: "#3B3216",
        },
        ink: {
          50: "#F7F7FA",
          100: "#EEF1F6",
          200: "#E4E8F0",
          300: "#CED5E1",
          400: "#98A2B3",
          500: "#667085",
          600: "#475467",
          700: "#344054",
          800: "#1D2939",
          900: "#0B1220",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl: "var(--gv-radius-xl)",
        "2xl": "1.25rem",
      },
      boxShadow: {
        sm: "var(--gv-shadow-sm)",
        DEFAULT: "var(--gv-shadow-md)",
        md: "var(--gv-shadow-md)",
        lg: "var(--gv-shadow-lg)",
      },
    },
  },
  plugins: [],
};
