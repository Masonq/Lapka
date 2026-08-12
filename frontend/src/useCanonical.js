import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://lapki.info";

/**
 * Автоматически поддерживает <link rel="canonical"> в соответствии с
 * текущим маршрутом — статичный тег в index.html был бы неправильным для
 * всех страниц SPA кроме главной (например /explore получил бы canonical
 * на "/", что говорит поисковику "это дубликат главной страницы", хотя
 * это разный, самостоятельный контент). Query-параметры и hash сознательно
 * не включаются — canonical должен указывать на основную, "чистую" версию
 * страницы, не на конкретное состояние фильтров/скролла.
 */
export function useCanonical() {
  const location = useLocation();

  useEffect(() => {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", `${SITE_URL}${location.pathname}`);
  }, [location.pathname]);
}
