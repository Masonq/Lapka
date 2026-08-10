import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

function getInitialTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    // Инлайн-скрипт в index.html красит строку браузера под СИСТЕМНУЮ тему через
    // статичные <meta media="..."> ещё до загрузки JS — но если пользователь вручную
    // переключил тему внутри приложения вопреки системной, эти статичные варианты
    // покажут неверный цвет. Держу актуальный theme-color в одном явном тэге, который
    // выигрывает у media-вариантов (более специфичный/более поздний в DOM)
    let meta = document.querySelector('meta[name="theme-color"][data-dynamic]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      meta.setAttribute("data-dynamic", "true");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", theme === "dark" ? "#121214" : "#FAFAFA");
  }, [theme]);

  function setTheme(next) {
    localStorage.setItem("theme", next);
    setThemeState(next);
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
