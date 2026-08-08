import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../navConfig";

export default function TabBar() {
  return (
    <nav className="tab-bar card-strong">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end, primary }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          aria-label={primary ? label : undefined}
          className={({ isActive }) => `tab-item${isActive ? " active" : ""}${primary ? " tab-item-primary" : ""}`}
        >
          <Icon size={primary ? 24 : 20} strokeWidth={2.2} />
          {!primary && <span>{label}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
