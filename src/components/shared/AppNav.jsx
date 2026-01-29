import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NAVIGATION } from '../../domain/services/navigationConfig';

const AppNav = () => {
  const { role } = useAuth();

  if (!role) return null;

  const items = NAVIGATION[role] || [];

  return (
    <nav className="flex gap-4 px-6 py-4 bg-white border-b">
      {items.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            isActive ? 'font-bold text-emerald-600' : 'text-gray-600'
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
};

export default AppNav;
