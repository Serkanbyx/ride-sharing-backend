import { NavLink, Outlet } from 'react-router-dom';
import {
  Car,
  LayoutDashboard,
  Navigation,
  User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const sidebarLinkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
  }`;

const bottomLinkClass = ({ isActive }) =>
  `flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
    isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
  }`;

const DashboardLayout = () => {
  const { isDriver, isPassenger } = useAuth();

  const sidebarLinks = (
    <>
      <NavLink to="/dashboard" className={sidebarLinkClass}>
        <LayoutDashboard className="h-4 w-4" />
        Dashboard
      </NavLink>
      {isPassenger && (
        <NavLink to="/request-ride" className={sidebarLinkClass}>
          <Car className="h-4 w-4" />
          Request Ride
        </NavLink>
      )}
      {isDriver && (
        <NavLink to="/driver" className={sidebarLinkClass}>
          <Navigation className="h-4 w-4" />
          Driver Panel
        </NavLink>
      )}
      <NavLink to="/dashboard" className={sidebarLinkClass}>
        <User className="h-4 w-4" />
        Profile
      </NavLink>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto flex w-full max-w-7xl">
        <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white p-6 md:block dark:border-gray-800 dark:bg-gray-900">
          <nav className="flex flex-col gap-2">{sidebarLinks}</nav>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <div className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">
            <Outlet />
          </div>

          <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-gray-200 bg-white px-2 md:hidden dark:border-gray-800 dark:bg-gray-900">
            <NavLink to="/dashboard" className={bottomLinkClass}>
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </NavLink>
            {isPassenger ? (
              <NavLink to="/request-ride" className={bottomLinkClass}>
                <Car className="h-5 w-5" />
                Request
              </NavLink>
            ) : (
              <NavLink to="/driver" className={bottomLinkClass}>
                <Navigation className="h-5 w-5" />
                Driver
              </NavLink>
            )}
            <NavLink to="/dashboard" className={bottomLinkClass}>
              <User className="h-5 w-5" />
              Profile
            </NavLink>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
