/**
 * Sidebar.jsx
 * Premium Glassmorphic Sidebar
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { useSettingsStore } from '../../store/settingsStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useAffinityStore } from '../../store/affinityStore';
import { Home, Library, Mic2, ListMusic, Heart, Settings, Menu, BarChart2, Search } from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, collapsed, badge }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-4 py-3 mx-3 px-3 my-1 rounded-xl transition-all duration-300 ease-out group ${
        isActive 
          ? 'bg-gradient-to-r from-coral/20 to-transparent text-white font-semibold shadow-[inset_3px_0_0_#dc143c]'
          : 'text-white/50 font-medium hover:bg-white/5 hover:text-white'
      }`
    }
    title={collapsed ? label : undefined}
  >
    {({ isActive }) => (
      collapsed ? (
        <div className="w-full flex justify-center relative">
          <span className={`font-sans text-xs uppercase tracking-[0.2em] origin-center rotate-[-90deg] whitespace-nowrap inline-block w-6 h-16 flex items-center justify-center transition-colors ${isActive ? 'text-coral drop-shadow-[0_0_8px_rgba(220,20,60,0.8)]' : 'text-white/40 group-hover:text-white/80'}`}>
            {label}
          </span>
          {badge !== undefined && (
            <span className="absolute top-0 right-2 w-1.5 h-1.5 rounded-full bg-mustard shadow-[0_0_8px_rgba(255,140,0,0.8)]"></span>
          )}
        </div>
      ) : (
        <>
          <Icon size={18} className={`shrink-0 transition-colors ${isActive ? 'text-coral drop-shadow-[0_0_8px_rgba(220,20,60,0.8)]' : 'text-white/40 group-hover:text-white/80'}`} />
          <span className="font-sans text-sm truncate flex-1 tracking-wide">{label}</span>
          {badge !== undefined && (
            <span className="font-mono text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/70 shadow-inner mr-1">{badge}</span>
          )}
        </>
      )
    )}
  </NavLink>
);

const NavSection = ({ title, collapsed, children }) => (
  <div className="mb-6">
    {!collapsed && (
      <h3 className="font-sans text-[10px] tracking-[0.25em] uppercase text-white/30 mb-2 px-6 font-semibold">
        {title}
      </h3>
    )}
    {children}
  </div>
);

export const Sidebar = () => {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { serverUrl } = useSettingsStore();
  const { playlists } = usePlaylistStore();
  const getListeningStreak = useAffinityStore((s) => s.getListeningStreak);
  const isConnected = !!serverUrl;
  const streak = getListeningStreak();
  const streakBadge = streak.current >= 2
    ? (sidebarCollapsed ? true : `🔥 ${streak.current}`)
    : undefined;

  let displayHost = '';
  if (isConnected) {
    try { displayHost = new URL(serverUrl).hostname; } 
    catch { displayHost = serverUrl; }
  }

  return (
    <aside 
      className={`h-full bg-black/40 backdrop-blur-2xl border-r border-white/5 shadow-[8px_0_32px_rgba(0,0,0,0.5)] transition-all duration-300 z-40 flex flex-col ${
        sidebarCollapsed ? 'sidebar-width-collapsed' : 'sidebar-width'
      }`}
    >
      <div className="flex items-center h-14 px-5 mb-4 mt-2 shrink-0">
        <button 
          onClick={toggleSidebar} 
          className="text-white/70 hover:text-coral hover:drop-shadow-[0_0_8px_rgba(220,20,60,0.8)] transition-all duration-300 flex-shrink-0"
          title="Toggle Sidebar"
        >
          <Menu size={22} />
        </button>
        {!sidebarCollapsed && (
          <h1 className="ml-4 font-serif text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 drop-shadow-sm truncate">
            NaviVibe
          </h1>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar flex flex-col pt-2 relative">
        <NavSection title="Collection" collapsed={sidebarCollapsed}>
          <NavItem to="/search" icon={Search} label="Search" collapsed={sidebarCollapsed} />
          <NavItem to="/library" icon={Library} label="Library" collapsed={sidebarCollapsed} />
          <NavItem to="/albums" icon={Home} label="Albums" collapsed={sidebarCollapsed} />
          <NavItem to="/artists" icon={Mic2} label="Artists" collapsed={sidebarCollapsed} />
          <NavItem to="/playlists" icon={ListMusic} label="Playlists" collapsed={sidebarCollapsed} badge={playlists?.length > 0 ? playlists.length : undefined} />
          <NavItem to="/favorites" icon={Heart} label="Favorites" collapsed={sidebarCollapsed} />
        </NavSection>
        
        <NavSection title="System" collapsed={sidebarCollapsed}>
          <NavItem to="/stats" icon={BarChart2} label="Stats" collapsed={sidebarCollapsed} badge={streakBadge} />
          <NavItem to="/settings" icon={Settings} label="Settings" collapsed={sidebarCollapsed} />
        </NavSection>
      </nav>

      {!sidebarCollapsed && (
        <div className="shrink-0 sticky bottom-0 bg-gradient-to-t from-black/80 to-transparent border-t border-white/5 px-6 py-5 mt-auto backdrop-blur-md">
          <div className="flex items-center gap-3" title={isConnected ? serverUrl : 'No server configured'}>
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isConnected
                  ? 'bg-green-400 animate-pulse shadow-[0_0_12px_rgba(74,222,128,0.8)]'
                  : 'bg-white/20'
              }`}
            />
            <span className="font-sans text-[11px] text-white/50 uppercase tracking-widest truncate font-medium">
              {isConnected ? displayHost : 'Not connected'}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};
