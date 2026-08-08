import { Home, Compass, PlusCircle, MessageCircle, User } from "lucide-react";

export const NAV_ITEMS = [
  { to: "/", label: "Главная", icon: Home, end: true },
  { to: "/explore", label: "Обзор", icon: Compass },
  { to: "/create", label: "Создать", icon: PlusCircle },
  { to: "/messages", label: "Чаты", icon: MessageCircle },
  { to: "/profile", label: "Профиль", icon: User },
];
