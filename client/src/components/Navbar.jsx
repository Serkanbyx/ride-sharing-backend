import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import RoleBadge from './RoleBadge';

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium transition-colors ${
    isActive
      ? 'text-primary'
      : 'text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-primary'
  }`;

const Navbar = () => {
  const { isAuthenticated, isDriver, isPassenger, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const closeMenus = () => {
    setMobileOpen(false);
    setDropdownOpen(false);
  };

  const handleLogout = () => {
    closeMenus();
    logout();
  };

  const authLinks = (
    <>
      <NavLink to="/dashboard" className={navLinkClass} onClick={closeMenus}>
        Dashboard
      </NavLink>
      {isPassenger && (
        <NavLink to="/request-ride" className={navLinkClass} onClick={closeMenus}>
          Request Ride
        </NavLink>
      )}
      {isDriver && (
        <NavLink to="/driver" className={navLinkClass} onClick={closeMenus}>
          Driver Panel
        </NavLink>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="text-xl font-bold text-primary"
          onClick={closeMenus}
        >
          RideFlow
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <NavLink to="/" className={navLinkClass}>
            Home
          </NavLink>
          {isAuthenticated && authLinks}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {!isAuthenticated ? (
            <>
              <Link to="/login" className="btn-secondary">
                Login
              </Link>
              <Link to="/register" className="btn-primary">
                Register
              </Link>
            </>
          ) : (
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                onClick={() => setDropdownOpen((open) => !open)}
              >
                <span>{user?.name}</span>
                <RoleBadge role={user?.role} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  <Link
                    to="/dashboard"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                    onClick={closeMenus}
                  >
                    Dashboard
                  </Link>
                  {isPassenger && (
                    <Link
                      to="/become-driver"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                      onClick={closeMenus}
                    >
                      Become Driver
                    </Link>
                  )}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-danger hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden dark:text-gray-300 dark:hover:bg-gray-800"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white px-4 py-4 md:hidden dark:border-gray-800 dark:bg-gray-950">
          <nav className="flex flex-col gap-3">
            <NavLink to="/" className={navLinkClass} onClick={closeMenus}>
              Home
            </NavLink>
            {isAuthenticated && authLinks}
          </nav>

          <div className="mt-4 flex flex-col gap-2 border-t border-gray-200 pt-4 dark:border-gray-800">
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="btn-secondary" onClick={closeMenus}>
                  Login
                </Link>
                <Link to="/register" className="btn-primary" onClick={closeMenus}>
                  Register
                </Link>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 px-1 py-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user?.name}
                  </span>
                  <RoleBadge role={user?.role} />
                </div>
                {isPassenger && (
                  <Link
                    to="/become-driver"
                    className="btn-secondary"
                    onClick={closeMenus}
                  >
                    Become Driver
                  </Link>
                )}
                <button
                  type="button"
                  className="btn-secondary flex items-center justify-center gap-2 text-danger"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
