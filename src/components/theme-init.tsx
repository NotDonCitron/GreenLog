"use client";

import { useEffect } from "react";

export function ThemeInit() {
  useEffect(() => {
    const theme = localStorage.getItem("cannalog_theme");
    if (theme === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.style.colorScheme = "light";
    }
  }, []);

  return null;
}
