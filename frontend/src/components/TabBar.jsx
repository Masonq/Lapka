import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../navConfig";

export default function TabBar() {
  return (
    <nav className="tab-bar card-strong">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
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
