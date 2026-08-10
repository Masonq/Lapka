import { Home, Search, PlusCircle, MessageCircle, User } from "lucide-react";

export const NAV_ITEMS = [
  { to: "/", label: "nav.home", icon: Home, end: true },
  { to: "/explore", label: "nav.explore", icon: Search },
  { to: "/create", label: "nav.create", icon: PlusCircle, primary: true },
  { to: "/messages", label: "nav.messages", icon: MessageCircle },
  { to: "/profile", label: "nav.profile", icon: User },
];
