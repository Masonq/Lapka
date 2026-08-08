import { NavLink } from "react-router-dom";
import { Rss, PawPrint, Heart, User } from "lucide-react";

const tabs = [
  { to: "/", label: "Лента", icon: Rss, end: true },
  { to: "/pets", label: "Питомцы", icon: PawPrint },
  { to: "/services", label: "Услуги", icon: Heart },
  { to: "/profile", label: "Профиль", icon: User },
];

export default function TabBar() {
  return (
    <nav className="tab-bar glass-strong">
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `tab-item${isActive ? " active" : ""}`}
        >
          <Icon size={20} strokeWidth={2.2} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
