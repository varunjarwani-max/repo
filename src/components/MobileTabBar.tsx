import React from 'react';
import { NavLink } from 'react-router-dom';
import { Camera, FileText, MapPin, Cpu, Bot } from 'lucide-react';

interface MobileTabBarProps {
  onToggleEcoBot?: () => void;
  isEcoBotOpen?: boolean;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  onToggleEcoBot,
  isEcoBotOpen = false,
}) => {
  const tabs = [
    { to: '/scan', label: 'Scan', icon: Camera },
    { to: '/audit', label: 'Audit', icon: FileText },
    { to: '/sites', label: 'Sites', icon: MapPin },
    { to: '/robot-api', label: 'Robot API', icon: Cpu },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-slate-900/95 backdrop-blur border-t border-slate-800 z-40 px-2 flex items-center justify-around select-none"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-14 h-full py-1 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Icon className="w-4 h-4 mb-0.5" />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}

      {/* EcoBot Trigger */}
      <button
        type="button"
        onClick={onToggleEcoBot}
        aria-label="Toggle EcoBot Drawer"
        className={`flex flex-col items-center justify-center w-14 h-full py-1 text-[10px] font-medium transition-colors ${
          isEcoBotOpen
            ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Bot className="w-4 h-4 mb-0.5" />
        <span>EcoBot</span>
      </button>
    </nav>
  );
};

export default MobileTabBar;
