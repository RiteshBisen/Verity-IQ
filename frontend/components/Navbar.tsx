"use client";

import { Sun, Moon, Layers } from "lucide-react";

interface NavbarProps {
  theme: "light" | "dark";
  onThemeToggle: () => void;
  onHomeClick: () => void;
  onAboutClick: () => void;
  currentPage: "home" | "about" | "quiz" | "results";
}

export default function Navbar({
  theme,
  onThemeToggle,
  onHomeClick,
  onAboutClick,
  currentPage,
}: NavbarProps) {
  return (
    <nav className="relative z-20 w-full bg-background border-b border-border shadow-sm transition-colors duration-200">
      <div className="w-full px-4 sm:px-8 h-20 flex items-center justify-between">
        {/* Brand/Logo */}
        <button
          onClick={onHomeClick}
          className="flex items-center gap-4 group focus:outline-none cursor-pointer"
        >
          <div className="w-11 h-11 bg-brutal-blue rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm shrink-0">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <span className="font-display font-semibold text-xl sm:text-2xl tracking-tight block leading-none text-foreground">
              Verity IQ
            </span>
            <span className="text-[10px] tracking-wide text-muted hidden sm:block font-medium mt-1">
              Truth & Intelligence Synergy
            </span>
          </div>
        </button>

        {/* Navigation Items */}
        <div className="flex items-center gap-2 sm:gap-3 font-display">
          <button
            onClick={onHomeClick}
            className={`text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-full transition-all duration-200 cursor-pointer
              ${
                currentPage === "home"
                  ? "bg-brutal-blue/10 text-brutal-blue"
                  : "bg-transparent text-foreground hover:bg-accent-light"
              }`}
          >
            Home
          </button>
          
          <button
            onClick={onAboutClick}
            className={`text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-full transition-all duration-200 cursor-pointer
              ${
                currentPage === "about"
                  ? "bg-brutal-blue/10 text-brutal-blue"
                  : "bg-transparent text-foreground hover:bg-accent-light"
              }`}
          >
            <span className="hidden sm:inline">About Developers</span>
            <span className="inline sm:hidden">About</span>
          </button>

          {/* Vertical Divider */}
          <div className="w-[1px] h-8 bg-border mx-2" />

          {/* Theme Toggle Button */}
          <button
            onClick={onThemeToggle}
            className="w-11 h-11 rounded-full flex items-center justify-center bg-transparent text-foreground hover:bg-accent-light transition-all duration-200 cursor-pointer"
            aria-label="Toggle Theme"
          >
            {theme === "light" ? (
              <Moon className="w-5.5 h-5.5 text-foreground" />
            ) : (
              <Sun className="w-5.5 h-5.5 text-foreground" />
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
