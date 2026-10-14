import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { AuthLandingPage } from './pages/AuthLandingPage';
import { RideSearchAndMatchPage } from './pages/RideSearchAndMatchPage';
import { CreateRidePage } from './pages/CreateRidePage';
import { RecurringCommutePage } from './pages/RecurringCommutePage';
import { ActiveRidePage } from './pages/ActiveRidePage';
import { DriverDashboard } from './pages/DriverDashboard';
import { FleetDashboard } from './pages/FleetDashboard';
import { MaintenancePage } from './pages/MaintenancePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SafetyCenterPage } from './pages/SafetyCenterPage';
import { RideHistoryPage } from './pages/RideHistoryPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProfilePage } from './pages/ProfilePage';
import { SelfHealingRecoveryPage } from './pages/SelfHealingRecoveryPage';
import { RidoLogo } from './components/RidoLogo';

const MainContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && hash !== 'landing') return hash;
    const stored = localStorage.getItem('rido_current_tab');
    if (stored && stored !== 'landing') return stored;
    return 'landing';
  });
  const { user, loading } = useAuth();

  const handleSetCurrentTab = (tab: string) => {
    setCurrentTab(tab);
    localStorage.setItem('rido_current_tab', tab);
    if (tab && tab !== 'landing') {
      window.location.hash = tab;
    } else {
      if (window.location.hash) {
        history.replaceState(null, '', window.location.pathname);
      }
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setCurrentTab(hash);
        localStorage.setItem('rido_current_tab', hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090e1a] text-slate-700 dark:text-slate-300 font-sans transition-colors duration-200">
        <div className="flex flex-col items-center gap-4">
          <RidoLogo size="lg" badgeText="SHRP 2.0" showTagline={true} />
          <div className="flex items-center gap-2.5 mt-2">
            <div className="w-5 h-5 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
            <p className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase font-mono">
              Initializing RIDO Mobility Engine...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || currentTab === 'landing') {
    return (
      <AuthLandingPage
        onAuthenticated={() => {
          // Stay on this landing page in authenticated mode after login or signin
          handleSetCurrentTab('landing');
        }}
        onExploreApp={() => {
          // Navigate to dashboard when explicitly clicking "Enter Dashboard" or "Book a Ride"
          if (user?.role === 'DRIVER') handleSetCurrentTab('driver');
          else if (user?.role === 'FLEET_MANAGER') handleSetCurrentTab('fleet');
          else if (user?.role === 'ADMIN') handleSetCurrentTab('admin');
          else handleSetCurrentTab('search');
        }}
      />
    );
  }

  const renderTab = () => {
    switch (currentTab) {
      case 'search':
        return <RideSearchAndMatchPage setCurrentTab={handleSetCurrentTab} />;
      case 'create-ride':
        return <CreateRidePage setCurrentTab={handleSetCurrentTab} />;
      case 'recurring':
        return <RecurringCommutePage />;
      case 'active-ride':
        return <ActiveRidePage setCurrentTab={handleSetCurrentTab} />;
      case 'recovery':
        return <SelfHealingRecoveryPage />;
      case 'driver':
        return <DriverDashboard setCurrentTab={handleSetCurrentTab} />;
      case 'fleet':
        return <FleetDashboard setCurrentTab={handleSetCurrentTab} />;
      case 'maintenance':
        return <MaintenancePage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'safety':
        return <SafetyCenterPage />;
      case 'history':
        return <RideHistoryPage />;
      case 'admin':
        return <AdminDashboard />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <RideSearchAndMatchPage setCurrentTab={handleSetCurrentTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090e1a] text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-white transition-colors duration-200">
      <Navbar currentTab={currentTab} setCurrentTab={handleSetCurrentTab} />
      <main className="flex-1 pb-16">
        {renderTab()}
      </main>
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <MainContent />
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
