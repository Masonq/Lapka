import { useEffect, useRef } from "react";

/**
 * Telegram Login Widget — официальный виджет Telegram, не наша реализация.
 * Требует зарегистрированного бота через @BotFather и привязанного к нему
 * домена (команда /setdomain у @BotFather) — без этого виджет Telegram
 * либо не отрисуется вообще, либо откажет при попытке авторизации.
 *
 * botUsername приходит из переменной окружения VITE_TELEGRAM_BOT_USERNAME
 * (без @) — та же схема, что уже используется для аналитики (analytics.js):
 * не задано — компонент просто ничего не рендерит, без ошибок.
 *
 * Виджет асинхронно грузит свой скрипт с telegram.org и сам вставляет
 * <iframe> с кнопкой внутрь указанного контейнера — мы не рисуем кнопку
 * сами, просто предоставляем место и колбэк.
 */
export default function TelegramLoginButton({ onAuth }) {
  const containerRef = useRef(null);
  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;

  useEffect(() => {
    if (!botUsername || !containerRef.current) return;

    // Уникальное имя колбэка на инстанс — если бы виджет использовался в
    // нескольких местах одновременно (маловероятно, но не должно ронять
    // друг друга), общий window.onTelegramAuth перезаписывался бы последним
    const callbackName = `onTelegramAuth_${Math.random().toString(36).slice(2)}`;
    window[callbackName] = (user) => onAuth(user);

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", `${callbackName}(user)`);
    script.setAttribute("data-request-access", "write");
    containerRef.current.appendChild(script);

    return () => {
      delete window[callbackName];
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [botUsername, onAuth]);

  if (!botUsername) return null;

  return <div ref={containerRef} style={{ display: "flex", justifyContent: "center" }} />;
}
