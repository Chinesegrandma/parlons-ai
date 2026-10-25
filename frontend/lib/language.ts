import { useEffect, useState } from "react";
import type { Language } from "./types";
export function useLanguage() {
  const [language, setLanguage] = useState<Language>("zh");
  useEffect(() => {
    try {
      const saved =
        localStorage.getItem("parlons-language") ||
        document.cookie
          .split(";")
          .map((value) => value.trim())
          .find((value) => value.startsWith("parlons_language="))
          ?.split("=")[1];
      if (saved === "en") setLanguage("en");
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);
  function changeLanguage(value: Language) {
    setLanguage(value);
    document.cookie = `parlons_language=${value}; Path=/; SameSite=Strict; Max-Age=31536000; Secure`;
    try {
      localStorage.setItem("parlons-language", value);
    } catch {}
  }
  return {
    language,
    setLanguage: changeLanguage,
    t: (zh: string, en: string) => (language === "en" ? en : zh),
  };
}
