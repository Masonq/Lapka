import { Home, Search, PlusCircle, MessageCircle, User } from "lucide-react";

export const NAV_ITEMS = [
  { to: "/", label: "Главная", icon: Home, end: true },
  { to: "/explore", label: "Поиск", icon: Search },
  { to: "/create", label: "Добавить", icon: PlusCircle, primary: true },
  { to: "/messages", label: "Чаты", icon: MessageCircle },
  { to: "/profile", label: "Профиль", icon: User },
];
