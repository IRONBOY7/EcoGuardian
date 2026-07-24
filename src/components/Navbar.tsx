import React from "react";
import { User, UserRole } from "../types";
import { Leaf, LogOut, Shield, Truck, UserCheck, AlertCircle, Sun, Moon } from "lucide-react";
import { motion } from "motion/react";

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
    <header className="sticky top-0 z-50 bg-white/85 dark:bg-stone-900/85 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 shadow-sm px-4 lg:px-8 py-3.5 flex items-center justify-between transition-colors duration-300">
      {/* Brand Logo & Name */}
      <div className="flex items-center space-x-3">
        <motion.div 
          className="bg-emerald-600 p-2 rounded-xl text-white shadow-md shadow-emerald-100 dark:shadow-none"
          whileHover={{ rotate: 15, scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Leaf className="w-5 h-5" />
        </motion.div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-800 dark:text-stone-100 flex items-center">
            EcoGuardian
            <span className="ml-2 text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800">
              PWA
            </span>
          </h1>
          <p className="text-[10px] text-stone-400 dark:text-stone-500 font-mono tracking-wider">SMART ENVIRONMENTAL HUB</p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* High Contrast Accessibility Sun/Moon Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-200 hover:text-stone-900 dark:hover:text-white bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 transition-all cursor-pointer flex items-center justify-center shadow-sm"
          title={theme === "dark" ? "Activate Light Mode" : "Activate Dark Mode"}
          aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? (
            <Sun className="w-4.5 h-4.5 text-amber-400 fill-amber-400/20" />
          ) : (
            <Moon className="w-4.5 h-4.5 text-indigo-700 dark:text-indigo-400" />
          )}
        </button>

        {/* User Info & Portal Role Switcher */}
        {user && (
          <div className="flex items-center space-x-3 lg:space-x-6">
            {/* Role Badges & Switchers for Demo Competence */}
            <div className="hidden md:flex items-center bg-stone-100/70 dark:bg-stone-800/70 border border-stone-250 dark:border-stone-700 p-1 rounded-xl space-x-1">
              <button
                onClick={() => onSwitchRole("citizen")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeRole === "citizen"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-stone-600 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-stone-700"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Citizen Portal
              </button>
              <button
                onClick={() => onSwitchRole("company")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeRole === "company"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-stone-600 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-stone-700"
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                Waste Collector
              </button>
              <button
                onClick={() => onSwitchRole("admin")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeRole === "admin"
                    ? "bg-stone-800 dark:bg-stone-700 text-white shadow-sm"
                    : "text-stone-600 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-stone-700"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Gov Admin
              </button>
            </div>

            {/* User Account & Logout */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-xs font-bold text-stone-800 dark:text-stone-200">{user.name}</p>
                <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase font-mono tracking-wider">{user.role}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center font-bold text-sm shadow-inner uppercase">
                {user.name.charAt(0)}
              </div>
              
              <button
                onClick={onLogout}
                className="p-2 text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all cursor-pointer"
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
