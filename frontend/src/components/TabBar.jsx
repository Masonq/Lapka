import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../navConfig";

export default function TabBar({ unreadMessages = 0 }) {
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
          <span style={{ position: "relative" }}>
            <Icon size={primary ? 24 : 20} strokeWidth={2.2} />
            {to === "/messages" && unreadMessages > 0 && (
              <span className="tab-badge">{unreadMessages > 9 ? "9+" : unreadMessages}</span>
            )}
          </span>
          {!primary && <span>{label}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
