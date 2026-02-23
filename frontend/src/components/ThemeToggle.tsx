import React from "react";
import { useSettings, type Theme } from "../contexts/SettingsContext";

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useSettings();

  const themes: { value: Theme; label: string; icon: string }[] = [
    { value: "light", label: "Light", icon: "☀️" },
    { value: "dark", label: "Dark", icon: "🌙" },
    { value: "system", label: "System", icon: "💻" },
  ];

  const currentTheme = themes.find((t) => t.value === theme) || themes[0];

  const cycleTheme = () => {
    const currentIndex = themes.findIndex((t) => t.value === theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const newTheme = themes[nextIndex].value;

    console.log(`Cycling theme from ${theme} to ${newTheme}`);
    setTheme(newTheme);

    // Force immediate theme application
    setTimeout(() => {
      const root = document.documentElement;
      const isDark =
        newTheme === "dark" ||
        (newTheme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", isDark);
      root.style.colorScheme = isDark ? "dark" : "light";
    }, 0);
  };

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      title={`Current: ${currentTheme.label} - Click to cycle themes`}
    >
      <span className="text-lg">{currentTheme.icon}</span>
      <span className="hidden sm:inline">{currentTheme.label}</span>
    </button>
  );
};

export default ThemeToggle;
