import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

function getInitialTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [theme] = useState(getInitialTheme);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    // Тег всегда ровно один — уже есть в index.html с самого начала (инлайн-скрипт
    // там же правит его значение синхронно до первой отрисовки). Раньше здесь
    // создавался ВТОРОЙ дублирующий тег поверх статичных media-вариантов —
    // три конкурирующих meta[theme-color] одновременно, из-за чего строка
    // браузера (Safari) не перекрашивалась мгновенно при переключении темы,
    // только после полной перезагрузки страницы
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#121214" : "#FAFAFA");
  }, [theme]);

  function setTheme(next) {
    localStorage.setItem("theme", next);
    // iOS Safari перекрашивает свою нижнюю панель (адресную строку) только при
    // загрузке страницы — не реагирует на живые JS-изменения meta[theme-color]
    // после того, как страница уже открыта. Это платформенное ограничение, не
    // недочёт в логике переключения (которая сама по себе работает верно, весь
    // контент приложения обновляется мгновенно). Раз обновление страницы решает —
    // просто делаю это автоматически, а не заставляю пользователя жать вручную.
    // Инлайн-скрипт в index.html читает localStorage синхронно до первой
    // отрисовки React, поэтому перезагрузка покажет новую тему сразу же,
    // без вспышки старой перед новой.
    window.location.reload();
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
