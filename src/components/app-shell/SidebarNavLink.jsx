import { NavLink } from 'react-router-dom';

export default function SidebarNavLink({
  to,
  label,
  icon: Icon,
  end = false,
  className = 'app-sidebar-link',
  rawIcon = false,
  sidebarIconActive = 'fill',
}) {
  return (
    <NavLink
      to={to}
      end={end}
      data-tooltip={label}
      className={({ isActive }) => `${className}${isActive ? ' active' : ''}`}
    >
      {({ isActive }) => {
        if (rawIcon) return <Icon />;
        const strokeActive = sidebarIconActive === 'stroke';
        return (
          <Icon
            size={20}
            strokeWidth={isActive ? (strokeActive ? 2.25 : 2) : 1.75}
            fill={isActive && !strokeActive ? 'currentColor' : 'none'}
          />
        );
      }}
    </NavLink>
  );
}
