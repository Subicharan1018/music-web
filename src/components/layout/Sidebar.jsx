/**
 * Sidebar.jsx
 * Sharp editorial sidebar — black, crimson, zero fat.
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
      `relative flex items-center gap-3.5 py-2.5 mx-2 px-3 my-0.5 rounded-lg transition-all duration-200 group ${
        isActive
          ? 'text-white'
          : 'text-white/30 hover:bg-[rgba(220,20,60,0.06)] hover:text-white/70'
      }`
    }
    title={collapsed ? label : undefined}
  >
    {({ isActive }) => (
      collapsed ? (
        <div className="w-full flex justify-center relative">
          {/* Rotated label when collapsed */}
          <span className={`font-mono text-[9px] uppercase tracking-[0.25em] origin-center rotate-[-90deg] whitespace-nowrap inline-block w-5 h-14 flex items-center justify-center transition-colors ${isActive ? 'text-coral' : 'text-white/30 group-hover:text-white/60'}`}>
            {label}
          </span>
          {badge !== undefined && (
            <span className="absolute top-0.5 right-1.5 w-1 h-1 rounded-full bg-mustard"></span>
          )}
        </div>
      ) : (
        <>
          {/* Active accent bar */}
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-coral rounded-full" />
          )}
          <Icon
            size={16}
            className={`shrink-0 transition-colors ${isActive ? 'text-coral' : 'text-white/30 group-hover:text-white/70'}`}
          />
          <span className="font-sans text-[13px] truncate flex-1 font-medium tracking-wide">{label}</span>
          {badge !== undefined && (
            <span className="font-mono text-[10px] bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 rounded-full text-white/40 mr-1">{badge}</span>
          )}
        </>
      )
    )}
  </NavLink>
);

const NavSection = ({ title, collapsed, children }) => (
  <div className="mb-4">
    {!collapsed && (
      <div className="font-mono text-[9px] tracking-[0.3em] uppercase text-white/20 mb-2 px-5 pt-2">
        {title}
      </div>
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
      className={`h-full bg-[#080808] border-r transition-all duration-300 z-40 flex flex-col ${
        sidebarCollapsed ? 'sidebar-width-collapsed' : 'sidebar-width'
      }`}
      style={{ borderRight: '1px solid rgba(220,20,60,0.12)' }}
    >
      {/* Header */}
      <div className="flex items-center h-14 px-4 mb-2 mt-1 shrink-0">
        <button
          onClick={toggleSidebar}
          className="text-white/30 hover:text-coral transition-colors duration-200 flex-shrink-0 p-1 rounded-md hover:bg-coral/5"
          title="Toggle Sidebar"
        >
          <Menu size={18} />
        </button>
        {!sidebarCollapsed && (
          <div className="ml-3 flex items-baseline gap-1.5">
            <h1 className="font-display text-2xl tracking-widest text-white leading-none">
              NAVI<span className="text-coral">VIBE</span>
            </h1>
          </div>
        )}
      </div>

      {/* Thin crimson rule under header */}
      <div className="mx-4 mb-3 h-px bg-gradient-to-r from-coral/30 via-coral/10 to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto no-scrollbar flex flex-col pt-1 relative">
        <NavSection title="Collection" collapsed={sidebarCollapsed}>
          <NavItem to="/search"    icon={Search}    label="Search"    collapsed={sidebarCollapsed} />
          <NavItem to="/library"   icon={Library}   label="Library"   collapsed={sidebarCollapsed} />
          <NavItem to="/albums"    icon={Home}      label="Albums"    collapsed={sidebarCollapsed} />
          <NavItem to="/artists"   icon={Mic2}      label="Artists"   collapsed={sidebarCollapsed} />
          <NavItem to="/playlists" icon={ListMusic} label="Playlists" collapsed={sidebarCollapsed} badge={playlists?.length > 0 ? playlists.length : undefined} />
          <NavItem to="/favorites" icon={Heart}     label="Favorites" collapsed={sidebarCollapsed} />
        </NavSection>

        <NavSection title="System" collapsed={sidebarCollapsed}>
          <NavItem to="/stats"    icon={BarChart2} label="Stats"    collapsed={sidebarCollapsed} badge={streakBadge} />
          <NavItem to="/settings" icon={Settings}  label="Settings" collapsed={sidebarCollapsed} />
        </NavSection>
      </nav>

      {/* Connection status footer */}
      {!sidebarCollapsed && (
        <div className="shrink-0 border-t px-5 py-4 mt-auto" style={{ borderColor: 'rgba(220,20,60,0.07)' }}>
          <div className="flex items-center gap-2.5" title={isConnected ? serverUrl : 'No server configured'}>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isConnected ? 'bg-coral' : 'bg-white/15'
              }`}
              style={isConnected ? { boxShadow: '0 0 8px rgba(220,20,60,0.7)', animation: 'pulse-glow 2s infinite' } : {}}
            />
            <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest truncate">
              {isConnected ? displayHost : 'Not connected'}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};
