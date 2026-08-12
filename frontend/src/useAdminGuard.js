import { useEffect, useState } from "react";
import { api } from "./api/client";
import { useAuth } from "./AuthContext";
import { useDelayedLoading } from "./useDelayedLoading";

/**
 * Общая проверка "текущий пользователь — админ" для всех страниц админки.
 * Раньше эта логика (загрузить me, показать skeleton пока грузится,
 * показать "доступ запрещён" если не админ) была продублирована внутри
 * одного гигантского Admin.jsx — при разбивке на отдельные страницы
 * каждая из них дублировала бы её ещё раз, поэтому вынес в один hook.
 */
export function useAdminGuard() {
  const { isAuthed } = useAuth();
  const [me, setMe] = useState(null);
  const showSkeleton = useDelayedLoading(me === null);

  useEffect(() => {
    if (!isAuthed) return;
    api.me().then(setMe).catch(() => setMe(null));
  }, [isAuthed]);

  const ready = isAuthed && me !== null;
  const isAdmin = ready && me.is_admin;

  return { me, ready, isAdmin, showSkeleton: !ready && showSkeleton };
}
