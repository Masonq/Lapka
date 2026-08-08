import { useEffect } from "react";

export function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} — LapaBG` : "LapaBG — питомцы Белграда";
    return () => {
      document.title = previous;
    };
  }, [title]);
}
