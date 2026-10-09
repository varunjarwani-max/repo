import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Leaf, Gauge, Bot, ArrowUpRight } from 'lucide-react';
import { APP_INFO } from '../lib/constants';

interface HeaderProps {
  cameraLive?: boolean;
  latencyMs?: number;
  itemCount?: number;
  onToggleEcoBot?: () => void;
  isEcoBotOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  cameraLive = false,
  latencyMs = 0,
  itemCount = 0,
  onToggleEcoBot,
  isEcoBotOpen = false,
}) => {
  // Color-coded latency chip based on spec thresholds (>150ms amber, >400ms red)
  const getLatencyColor = (ms: number) => {
    if (ms > 400) return 'text-red-400 border-red-500/40 bg-red-500/10';
    if (ms > 150) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-slate-300 border-slate-700 bg-slate-800';
  };

  const isHome = useLocation().pathname === '/';
  const navItems = [
    { to: '/', label: 'Home' },
    { to: '/scan', label: 'Workspace' },
    { to: '/audit', label: 'Audit report' },
    { to: '/sites', label: 'Site insights' },
  ];

  return (
    <header className="eco-header sticky top-0 z-40 w-full backdrop-blur border-b flex items-center justify-between select-none">
      {/* Left: Brand Identity */}
      <div className="flex items-center gap-3">
        <NavLink
          to="/"
          className="flex items-center gap-2.5 group focus-visible:rounded-lg"
          aria-label="EcoScan AI Home"
        >
          {/* Logo Mark: Scan-frame icon with leaf inside */}
          <div className="relative w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-400 transition-colors shadow-glow-recyclable">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            </svg>
            <Leaf className="w-3.5 h-3.5 absolute text-emerald-400" />
          </div>

          <div className="flex flex-col">
            <span className="font-semibold text-white tracking-tight leading-none text-sm sm:text-base flex items-center gap-1.5">
              {APP_INFO.name}
            </span>
            <span className="font-mono text-[10px] text-slate-400 tracking-wider uppercase leading-tight mt-0.5">
              {APP_INFO.subtitle}
            </span>
          </div>
        </NavLink>
      </div>

      {/* Centre: Desktop Tab Navigation */}
      <nav
        aria-label="Primary navigation"
        className="hidden md:flex items-center h-full gap-1 lg:gap-2"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `h-full flex items-center px-3.5 text-xs font-medium border-b-2 transition-all ${
                isActive
                  ? 'text-emerald-400 border-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.45)]'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-700'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Right: Telemetry Chips & Assistant Action */}
      {isHome ? <NavLink to="/scan" className="eco-button primary">Open scanner <ArrowUpRight size={15} aria-hidden="true" /></NavLink> : <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Camera Status Pill */}
        <div
          role="status"
          aria-label={cameraLive ? 'Camera is active' : 'Camera is offline'}
          className={`px-2.5 py-1 rounded-full text-[11px] font-mono flex items-center gap-1.5 border transition-colors ${
            cameraLive
              ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-300'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              cameraLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
            }`}
          />
          <span className="font-medium tracking-wider">
            {cameraLive ? 'CAM LIVE' : 'CAM OFF'}
          </span>
        </div>

        {/* Latency Chip */}
        <div
          title="Inference Latency"
          className={`px-2.5 py-1 rounded-full text-[11px] font-mono border flex items-center gap-1.5 ${getLatencyColor(
            latencyMs
          )}`}
        >
          <Gauge className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span className="tabular-nums font-semibold">{latencyMs > 0 ? `${latencyMs} ms` : '—'}</span>
        </div>

        {/* Active Items Count Badge */}
        <div
          title="Detected surface items"
          className="hidden sm:flex px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 items-center"
        >
          {itemCount} items
        </div>

        {/* EcoBot Toggle Button */}
        <button
          type="button"
          onClick={onToggleEcoBot}
          aria-label="Toggle EcoBot AI assistant"
          aria-expanded={isEcoBotOpen}
          className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
            isEcoBotOpen
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-glow-recyclable'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
          }`}
        >
          <Bot className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <span className="hidden sm:inline">EcoBot</span>
        </button>
      </div>}
    </header>
  );
};

export default Header;
