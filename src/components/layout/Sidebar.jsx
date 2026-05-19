/**
 * Sidebar.jsx
 * Collapsible left navigation pane using Atelier Zero styling.
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { useSettingsStore } from '../../store/settingsStore';
import { Home, Library, Mic2, ListMusic, Heart, Settings, Menu, BarChart2, Search } from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, collapsed }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-4 py-2.5 my-0.5 transition-colors duration-[160ms] ease-in-out border-l-2 ${
        isActive 
          ? 'text-ink font-semibold border-coral pl-[14px]'
          : 'text-ink-mute font-medium border-transparent hover:border-ink/20 hover:text-coral pl-[14px]'
      }`
    }
    title={collapsed ? label : undefined}
  >
    {collapsed ? (
      <div className="w-full flex justify-center">
        <span className="font-sans text-xs uppercase tracking-[0.2em] text-ink-faint origin-center rotate-[-90deg] whitespace-nowrap inline-block w-6 h-16 flex items-center justify-center">
          {label}
        </span>
      </div>
    ) : (
      <>
        <Icon size={15} className="shrink-0" />
        <span className="font-sans text-sm truncate">{label}</span>
      </>
    )}
  </NavLink>
);

const NavSection = ({ title, collapsed, children }) => (
  <div className="mb-6">
    {!collapsed && (
      <h3 className="font-sans text-[9px] tracking-[0.3em] uppercase text-ink-faint mb-1 px-4">
        {title}
      </h3>
    )}
    {children}
  </div>
);

export const Sidebar = () => {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { serverUrl } = useSettingsStore();
  const isConnected = !!serverUrl;

  return (
    <aside 
      className={`fixed top-[44px] left-[36px] h-[calc(100vh-44px-80px)] bg-paper border-r border-ink/10 transition-all duration-300 z-40 flex flex-col ${
        sidebarCollapsed ? 'sidebar-width-collapsed' : 'sidebar-width'
      }`}
    >
      <div className="flex items-center h-14 px-4 mb-2 mt-2 shrink-0">
        <button 
          onClick={toggleSidebar} 
          className="text-ink hover:text-coral transition-colors duration-[160ms] flex-shrink-0"
          title="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>
        {!sidebarCollapsed && (
          <h1 className="ml-4 font-serif text-lg font-bold tracking-wide text-ink italic truncate">
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
          <NavItem to="/playlists" icon={ListMusic} label="Playlists" collapsed={sidebarCollapsed} />
          <NavItem to="/favorites" icon={Heart} label="Favorites" collapsed={sidebarCollapsed} />
        </NavSection>
        
        <NavSection title="System" collapsed={sidebarCollapsed}>
          <NavItem to="/stats" icon={BarChart2} label="Stats" collapsed={sidebarCollapsed} />
          <NavItem to="/settings" icon={Settings} label="Settings" collapsed={sidebarCollapsed} />
        </NavSection>
      </nav>

      {!sidebarCollapsed && (
        <div className="shrink-0 sticky bottom-0 bg-paper px-4 py-4 mt-auto">
          <div className="font-mono text-[9px] text-ink-faint uppercase tracking-wider">
            SUBSONIC · {isConnected ? 'CONNECTED' : 'NOT CONNECTED'}
          </div>
        </div>
      )}
    </aside>
  );
};
