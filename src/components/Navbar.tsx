import React from "react";
import { User, UserRole } from "../types";
import { LogOut, Shield, Truck, UserCheck, Sun, Moon } from "lucide-react";

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  activeRole: UserRole | null;
  onSwitchRole: (role: UserRole) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export default function Navbar({ user, onLogout, activeRole, onSwitchRole, theme, onToggleTheme }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 bg-[#10271b] dark:bg-[#0a1a11] text-white h-[72px] flex items-center gap-6 px-4 lg:px-[6%] shadow-[0_2px_15px_rgba(0,0,0,0.13)] transition-colors duration-300">
      {/* Brand Logo & Name — reference topbar brand */}
      <div className="flex items-center gap-2.5 mr-auto">
        <div className="w-[38px] h-[38px] border-2 border-[#7ed957] rounded-[11px] grid place-items-center font-extrabold text-[#b8ff91] text-sm shrink-0">
          EG
        </div>
        <div>
          <h1 className="text-base font-bold leading-none text-white">
            EcoGuard Ghana
          </h1>
          <p className="text-[10px] text-[#b9cbbf] mt-1 leading-none">
            Satellite Environmental Monitoring
          </p>
        </div>
      </div>

      {/* Status pill — reference topbar status */}
      <div className="hidden sm:flex items-center text-[11px] border border-[#496352] rounded-full px-3 py-2 text-[#c9d9ce] shrink-0">
        <span className="inline-block w-[7px] h-[7px] bg-[#7ed957] rounded-full mr-1.5 animate-pulse" />
        Prototype System
      </div>

      <div className="flex items-center gap-3">
        {/* High Contrast Accessibility Sun/Moon Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2.5 rounded-xl border border-white/15 bg-white/5 text-[#c9d9ce] hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center"
          title={theme === "dark" ? "Activate Light Mode" : "Activate Dark Mode"}
          aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? (
            <Sun className="w-4.5 h-4.5 text-amber-400 fill-amber-400/20" />
          ) : (
            <Moon className="w-4.5 h-4.5 text-[#9fe17e]" />
          )}
        </button>

        {/* User Info & Portal Role Switcher */}
        {user && (
          <div className="flex items-center gap-3 lg:gap-5">
            {/* Role Badges & Switchers for Demo Competence */}
            <div className="hidden md:flex items-center bg-white/5 border border-white/10 p-1 rounded-xl space-x-1">
              <button
                onClick={() => onSwitchRole("citizen")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeRole === "citizen"
                    ? "bg-[#91db70] text-[#10271b] shadow-sm"
                    : "text-[#c9d9ce] hover:text-[#a8ed80] hover:bg-white/10"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Citizen Portal
              </button>
              <button
                onClick={() => onSwitchRole("company")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeRole === "company"
                    ? "bg-[#e0a32d] text-[#10271b] shadow-sm"
                    : "text-[#c9d9ce] hover:text-[#a8ed80] hover:bg-white/10"
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                Waste Collector
              </button>
              <button
                onClick={() => onSwitchRole("admin")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeRole === "admin"
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-[#c9d9ce] hover:text-[#a8ed80] hover:bg-white/10"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Gov Admin
              </button>
            </div>

            {/* User Account & Logout */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-white">{user.name}</p>
                <p className="text-[10px] text-[#b9cbbf] uppercase font-mono tracking-wider">{user.role}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center font-bold text-sm uppercase">
                {user.name.charAt(0)}
              </div>

              <button
                onClick={onLogout}
                className="p-2 text-white/50 hover:text-red-400 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
