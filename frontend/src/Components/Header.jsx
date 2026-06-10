import { NavLink } from "react-router-dom";
import { LogOut, Menu as MenuIcon, UserCircle } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { navBtnPrimary, navBtnSecondary, navContainer, navLinkActive, navLinkBase, navbar, textAccent, textDark } from "../styles/Common";

const linkClass = ({ isActive }) =>
  `${navLinkBase} ${isActive ? navLinkActive.replace(navLinkBase, "").trim() : `${textAccent} hover:text-[#3F2A32]`}`;

function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const canSeeKitchen = !isAuthenticated || user?.role === "FOOD_PROVIDER" || user?.role === "ADMIN";
  const canSeeDelivery = !isAuthenticated || user?.role === "DELIVERY" || user?.role === "ADMIN";

  return (
    <header className={navbar}>
      <div className={navContainer}>
        <NavLink to="/" className={`flex items-center ${textDark}`}>
          <span className="text-xl font-black tracking-tight">DabbaService</span>
        </NavLink>

        <nav className="hidden items-center gap-7 md:flex">
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          <NavLink to="/menu" className={linkClass}>Menu</NavLink>
          {canSeeKitchen && <NavLink to="/kitchen" className={linkClass}>Kitchen</NavLink>}
          {canSeeDelivery && <NavLink to="/delivery" className={linkClass}>Delivery</NavLink>}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <NavLink
                to="/profile"
                className={`hidden items-center gap-2 sm:flex ${navBtnSecondary}`}
              >
                <UserCircle size={17} />
                {user?.name || "Profile"}
              </NavLink>
              <button
                type="button"
                onClick={logout}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#3F2A32] text-white hover:bg-[#6B4D57]"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={`text-sm font-semibold ${textAccent} hover:text-[#3F2A32]`}>
                Login
              </NavLink>
              <NavLink to="/register" className={navBtnPrimary}>
                Register
              </NavLink>
            </>
          )}
          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#896A67] text-[#3F2A32] md:hidden" title="Menu">
            <MenuIcon size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;


