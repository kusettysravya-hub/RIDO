import React, { useState } from 'react';
import {
  Car,
  ShieldCheck,
  Wallet,
  Users,
  Calendar,
  AlertTriangle,
  History,
  PlusCircle,
  Search,
  Wrench,
  BarChart3,
  ChevronDown,
  Sparkles,
  Zap,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserRole } from '../types';
import { RidoLogo } from './RidoLogo';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, demoLogin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleRoleSwitch = async (role: UserRole) => {
    setShowRoleDropdown(false);
    setMobileMenuOpen(false);
    await demoLogin(role);
    if (role === 'PASSENGER') setCurrentTab('search');
    else if (role === 'DRIVER') setCurrentTab('driver');
    else if (role === 'FLEET_MANAGER') setCurrentTab('fleet');
    else if (role === 'ADMIN') setCurrentTab('admin');
  };

  const navItemClass = (tabName: string) => {
    const isActive = currentTab === tabName;
    if (isActive) {
      return 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold shadow-sm shadow-blue-500/20';
    }
    return 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#090e1a]/90 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/90 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tag */}
          <div
            className="flex items-center cursor-pointer group"
            onClick={() => {
              setCurrentTab('landing');
              setMobileMenuOpen(false);
            }}
          >
            <RidoLogo size="md" badgeText="SHRP 2.0" showTagline={true} />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {user?.role === 'PASSENGER' && (
              <>
                <button
                  onClick={() => setCurrentTab('search')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${navItemClass('search')}`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Find & Match</span>
                </button>
                <button
                  onClick={() => setCurrentTab('create-ride')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${navItemClass('create-ride')}`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Book a Ride</span>
                </button>
                <button
                  onClick={() => setCurrentTab('recurring')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${navItemClass('recurring')}`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Recurring</span>
                </button>
                <button
                  onClick={() => setCurrentTab('active-ride')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${navItemClass('active-ride')}`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Live Ride</span>
                </button>
                <button
                  onClick={() => setCurrentTab('safety')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${navItemClass('safety')}`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                  <span>Safety</span>
                </button>
                <button
                  onClick={() => setCurrentTab('history')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${navItemClass('history')}`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>History</span>
                </button>
              </>
            )}

            {user?.role === 'DRIVER' && (
              <>
                <button
                  onClick={() => setCurrentTab('driver')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${navItemClass('driver')}`}
                >
                  <Car className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                  <span>Driver Console</span>
                </button>
                <button
                  onClick={() => setCurrentTab('offer-ride')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${navItemClass('offer-ride')}`}
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span>Offer a Ride</span>
                </button>
                <button
                  onClick={() => setCurrentTab('active-ride')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${navItemClass('active-ride')}`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Active Trip</span>
                </button>
                <button
                  onClick={() => setCurrentTab('safety')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${navItemClass('safety')}`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                  <span>Safety Center</span>
                </button>
              </>
            )}

            {(user?.role === 'FLEET_MANAGER' || user?.role === 'ADMIN') && (
              <>
                <button
                  onClick={() => setCurrentTab('fleet')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${navItemClass('fleet')}`}
                >
                  <Car className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                  <span>Fleet</span>
                </button>
                <button
                  onClick={() => setCurrentTab('maintenance')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${navItemClass('maintenance')}`}
                >
                  <Wrench className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Maintenance</span>
                </button>
                <button
                  onClick={() => setCurrentTab('analytics')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${navItemClass('analytics')}`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Demand Analytics</span>
                </button>
                {user?.role === 'ADMIN' && (
                  <button
                    onClick={() => setCurrentTab('admin')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${navItemClass('admin')}`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Admin Control</span>
                  </button>
                )}
              </>
            )}

            {/* Separator */}
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1.5" />

            {/* Self-Healing (SHRP) Flagship Primary Tab */}
            <button
              onClick={() => setCurrentTab('recovery')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs transition-all ${
                currentTab === 'recovery'
                  ? 'bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 text-white font-bold shadow-md shadow-cyan-500/30'
                  : 'bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 font-semibold border border-cyan-500/30'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
              <span>Self-Healing (SHRP)</span>
              <span className="hidden xl:inline text-[9px] uppercase px-1 py-0.2 bg-white/20 rounded font-mono">
                Core
              </span>
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2">
            {/* Light / Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-cyan-400 border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
              aria-label="Toggle Light and Dark Mode"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-blue-600 transition-transform rotate-0 hover:-rotate-12" />
              )}
            </button>

            {/* Wallet Balance Pill */}
            {user && (
              <button
                onClick={() => setCurrentTab('profile')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:border-cyan-500 transition-colors shadow-sm"
                title="View Wallet & Profile"
              >
                <Wallet className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className="font-mono font-bold">₹{user.wallet_balance.toFixed(2)}</span>
              </button>
            )}

            {/* Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all shadow-sm"
              >
                <Users className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                <span className="capitalize">{user ? user.role.toLowerCase().replace('_', ' ') : 'Role'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#111a2e] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700/80 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    Switch Test Persona
                  </div>
                  {[
                    { id: 'PASSENGER', label: 'Passenger (Student/Staff)', color: 'bg-cyan-500' },
                    { id: 'DRIVER', label: 'Driver (Campus Shuttle)', color: 'bg-blue-500' },
                    { id: 'FLEET_MANAGER', label: 'Fleet Manager', color: 'bg-amber-500' },
                    { id: 'ADMIN', label: 'Administrator', color: 'bg-purple-500' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleRoleSwitch(r.id as UserRole)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors ${
                        user?.role === r.id
                          ? 'text-blue-600 dark:text-cyan-400 font-bold bg-blue-50 dark:bg-slate-800/50'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${r.color}`} />
                        <span>{r.label}</span>
                      </div>
                      {user?.role === r.id && (
                        <span className="text-[10px] font-bold text-blue-600 dark:text-cyan-400">Active</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Profile Avatar */}
            {user && (
              <button
                onClick={() => setCurrentTab('profile')}
                className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center text-xs font-bold shadow-sm shadow-blue-500/20 hover:scale-105 transition-transform"
                title={`${user.full_name} (${user.email})`}
              >
                {user.full_name.charAt(0)}
              </button>
            )}

            {/* Log Out Button */}
            {user && (
              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 transition-colors text-xs font-medium shadow-sm"
                title="Log Out of RIDO"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#090e1a]/95 backdrop-blur-md px-4 pt-3 pb-5 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <div className="pb-2.5 mb-1 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <RidoLogo size="sm" badgeText="SHRP 2.0" showTagline={true} />
          </div>
          <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5">
            Navigation ({user?.role.replace('_', ' ')})
          </div>

          {user?.role === 'PASSENGER' && (
            <>
              <button
                onClick={() => { setCurrentTab('search'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${navItemClass('search')}`}
              >
                <Search className="w-4 h-4" /> Find & Match
              </button>
              <button
                onClick={() => { setCurrentTab('create-ride'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${navItemClass('create-ride')}`}
              >
                <PlusCircle className="w-4 h-4" /> Book a Ride
              </button>
              <button
                onClick={() => { setCurrentTab('recurring'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${navItemClass('recurring')}`}
              >
                <Calendar className="w-4 h-4" /> Recurring Commute
              </button>
              <button
                onClick={() => { setCurrentTab('active-ride'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${navItemClass('active-ride')}`}
              >
                <Zap className="w-4 h-4 text-amber-500" /> Live Ride
              </button>
              <button
                onClick={() => { setCurrentTab('safety'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${navItemClass('safety')}`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Safety Center
              </button>
              <button
                onClick={() => { setCurrentTab('history'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${navItemClass('history')}`}
              >
                <History className="w-4 h-4" /> Trip History
              </button>
            </>
          )}

          {user?.role === 'DRIVER' && (
            <>
              <button
                onClick={() => { setCurrentTab('driver'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${navItemClass('driver')}`}
              >
                <Car className="w-4 h-4 text-blue-500" /> Driver Console
              </button>
              <button
                onClick={() => { setCurrentTab('offer-ride'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${navItemClass('offer-ride')}`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-500" /> Offer a Ride
              </button>
              <button
                onClick={() => { setCurrentTab('active-ride'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${navItemClass('active-ride')}`}
              >
                <Zap className="w-4 h-4 text-amber-500" /> Active Trip
              </button>
              <button
                onClick={() => { setCurrentTab('safety'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${navItemClass('safety')}`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Safety Center
              </button>
            </>
          )}

          {(user?.role === 'FLEET_MANAGER' || user?.role === 'ADMIN') && (
            <>
              <button
                onClick={() => { setCurrentTab('fleet'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${navItemClass('fleet')}`}
              >
                <Car className="w-4 h-4 text-blue-500" /> Fleet Dashboard
              </button>
              <button
                onClick={() => { setCurrentTab('maintenance'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${navItemClass('maintenance')}`}
              >
                <Wrench className="w-4 h-4 text-amber-500" /> Maintenance Records
              </button>
              <button
                onClick={() => { setCurrentTab('analytics'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${navItemClass('analytics')}`}
              >
                <BarChart3 className="w-4 h-4 text-cyan-600" /> Demand Analytics
              </button>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => { setCurrentTab('admin'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${navItemClass('admin')}`}
                >
                  <ShieldCheck className="w-4 h-4 text-purple-500" /> Admin Control
                </button>
              )}
            </>
          )}

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => { setCurrentTab('recovery'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold ${
                currentTab === 'recovery'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                  : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Self-Healing (SHRP)</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-600 text-white font-mono">
                Flagship
              </span>
            </button>

            {user && (
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out ({user.full_name})</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
