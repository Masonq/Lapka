import { createContext, useContext, useState, useCallback } from "react";

const SearchContext = createContext(null);

export function SearchProvider({ children }) {
  const [config, setConfigState] = useState(null);

  // useCallback — иначе каждый рендер провайдера даёт новую ссылку на функцию,
  // и useEffect на странице (зависящий от setSearchConfig) перезапускался бы бесконечно
  const setSearchConfig = useCallback((next) => setConfigState(next), []);

  return (
    <SearchContext.Provider value={{ config, setSearchConfig }}>
      {children}
    </SearchContext.Provider>
  );
}

/**
 * Страница с полем поиска вызывает это в useEffect, чтобы отдать своё состояние
 * поиска общей шапке — сама шапка рендерится один раз в App.jsx на все страницы:
 *
 *   useEffect(() => {
 *     setSearchConfig({ value: query, onChange: setQuery, placeholder: "..." });
 *     return () => setSearchConfig(null);
 *   }, [query]);
 */
export function useSearchContext() {
  return useContext(SearchContext);
}
