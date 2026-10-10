import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { ClientDashboard } from './components/ClientDashboard';
import { DriverDashboard } from './components/DriverDashboard';
import { ModeratorModal } from './components/ModeratorModal';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { UserProfileModal } from './components/UserProfileModal';
import { ShieldCheck } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { currentUser, isModerator } = useApp();
  const [isModeratorModalOpen, setIsModeratorModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isDriverProfileOpen, setIsDriverProfileOpen] = useState(false);
  const [clientView, setClientView] = useState<'home' | 'service' | 'profile' | 'tracking'>('home');

  const handleOpenProfile = () => {
    if (currentUser?.role === 'Usuario Normal') {
      setClientView('profile');
    } else {
      setIsDriverProfileOpen(true);
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-[#070b14] flex flex-col justify-start items-center selection:bg-cyan-500 selection:text-slate-950">
      {/* MOBILE-FIRST CENTRED APP SHELL (DARK LEAD GRAY & CYAN) */}
      <div className="w-full max-w-md min-h-screen bg-[#0b111e] shadow-2xl relative flex flex-col overflow-x-hidden border-x border-cyan-500/15">
        {!currentUser ? (
          /* ONLY REGISTERED / LOGGED IN USERS CAN ENTER */
          <AuthScreen />
        ) : (
          /* INDEPENDENT ROLE VIEW (NO ROLE CROSS-VIEW) */
          <>
            {/* Moderator Quick Alert Bar */}
            {isModerator && (
              <div className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-black px-3.5 py-1.5 flex items-center justify-between shrink-0 shadow-md shadow-cyan-500/20">
                <span className="flex items-center gap-1.5 truncate">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span className="truncate">Moderador Activo: {currentUser.email}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsModeratorModalOpen(true)}
                  className="bg-slate-950 text-cyan-300 text-xs font-black px-2.5 py-1 rounded-lg hover:bg-slate-900 shrink-0 cursor-pointer transition-colors shadow-xs"
                >
                  Panel Mod $
                </button>
              </div>
            )}

            {/* Top Navbar */}
            <Navbar
              onOpenModerator={() => setIsModeratorModalOpen(true)}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              onOpenProfile={handleOpenProfile}
            />

            {/* Main Independent Section based strictly on Registered Role */}
            <main className="w-full flex-1 flex flex-col overflow-x-hidden">
              {currentUser.role === 'Usuario Normal' ? (
                <ClientDashboard
                  currentView={clientView}
                  onNavigateView={setClientView}
                />
              ) : (
                <DriverDashboard />
              )}
            </main>

            {/* Moderator Modal */}
            <ModeratorModal
              isOpen={isModeratorModalOpen}
              onClose={() => setIsModeratorModalOpen(false)}
            />

            {/* Notifications Drawer */}
            <NotificationsDrawer
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
            />

            {/* User Profile Modal (Only for Driver role quick edits) */}
            <UserProfileModal
              isOpen={isDriverProfileOpen}
              onClose={() => setIsDriverProfileOpen(false)}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
