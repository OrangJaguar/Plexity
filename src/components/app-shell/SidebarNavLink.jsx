import { NavLink } from 'react-router-dom';

export default function SidebarNavLink({
  to,
  label,
  icon: Icon,
  end = false,
  className = 'app-sidebar-link',
  rawIcon = false,
}) {
  return (
    <NavLink
      to={to}
      end={end}
      data-tooltip={label}
      className={({ isActive }) => `${className}${isActive ? ' active' : ''}`}
    >
      {({ isActive }) => (
        rawIcon ? (
          <Icon />
        ) : (
          <Icon
            size={20}
            strokeWidth={isActive ? 2 : 1.75}
            fill={isActive ? 'currentColor' : 'none'}
          />
        )
      )}
    </NavLink>
  );
}
