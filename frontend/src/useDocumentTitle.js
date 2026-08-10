import { useEffect } from "react";

export function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} — Lapki` : "Lapki — соцсеть для питомцев Белграда";
    return () => {
      document.title = previous;
    };
  }, [title]);
}
