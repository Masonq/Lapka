import { Rss, PawPrint, Heart, User } from "lucide-react";

export const NAV_ITEMS = [
  { to: "/", label: "Лента", icon: Rss, end: true },
  { to: "/pets", label: "Питомцы", icon: PawPrint },
  { to: "/services", label: "Услуги", icon: Heart },
  { to: "/profile", label: "Профиль", icon: User },
];
