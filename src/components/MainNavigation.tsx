import { NavLink } from "react-router-dom";

const navigationItems = [
  { to: "/", label: "Home" },
  { to: "/character", label: "Character" },
  { to: "/city", label: "City" },
  { to: "/education", label: "Education" },
  { to: "/career", label: "Career" },
  { to: "/social", label: "Social" },
  { to: "/forums", label: "Forums" },
];

export function MainNavigation() {
  return (
    <nav className="main-nav" aria-label="Main navigation">
      {navigationItems.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === "/"}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
