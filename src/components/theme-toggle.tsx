"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check stored preference
    const stored = localStorage.getItem("cannalog_theme");
    if (stored === "light") {
      setIsDark(false);
      document.documentElement.classList.add("light");
      document.documentElement.style.colorScheme = "light";
    } else {
      setIsDark(true);
      document.documentElement.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    if (newIsDark) {
      document.documentElement.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
      localStorage.setItem("cannalog_theme", "dark");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.style.colorScheme = "light";
      localStorage.setItem("cannalog_theme", "light");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 rounded-xl bg-[#1a191b] border border-[#484849]/50 flex items-center justify-center text-[#adaaab] hover:text-[#00F5FF] hover:border-[#00F5FF]/50 transition-all"
      title={isDark ? "Light Mode" : "Dark Mode"}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
