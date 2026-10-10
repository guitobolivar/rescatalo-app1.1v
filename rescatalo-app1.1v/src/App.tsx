import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { ClientDashboard } from './components/ClientDashboard';
import { DriverDashboard } from './components/DriverDashboard';
import { ModeratorModal } from './components/ModeratorModal';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { UserProfileModal } from './components/UserProfileModal';
import { ShieldCheck, UserCheck, Bike, Database, Sliders } from 'lucide-react';
import { isClientRole, isDriverRole, isAdminRole } from './types';

const MainLayout: React.FC = () => {
  const { currentUser, isModerator, isAdmin, changeUserRoleInFirestore } = useApp();
  const [isModeratorModalOpen, setIsModeratorModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isDriverProfileOpen, setIsDriverProfileOpen] = useState(false);
  const [clientView, setClientView] = useState<'home' | 'service' | 'profile' | 'tracking'>('home');
  const [adminViewMode, setAdminViewMode] = useState<'client' | 'driver'>('client');
  const [isChangingRole, setIsChangingRole] = useState(false);

  const handleOpenProfile = () => {
    if (isClientRole(currentUser?.role)) {
      setClientView('profile');
    } else {
      setIsDriverProfileOpen(true);
    }
  };

  const handleQuickRoleChange = async (newRole: 'client' | 'driver' | 'admin') => {
    setIsChangingRole(true);
    await changeUserRoleInFirestore(newRole);
    setIsChangingRole(false);
  };

  const isUserAdmin = isAdmin || isAdminRole(currentUser?.role);

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
            {/* Admin / Moderator Quick Alert Bar */}
            {isUserAdmin && (
              <div className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 px-3.5 py-2 flex flex-col gap-1.5 shrink-0 shadow-lg shadow-amber-500/20 border-b border-amber-400/40">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-slate-950" />
                    <span className="text-[11px] font-black truncate">
                      ADMINISTRADOR ACTIVO (Rol: <span className="font-mono bg-slate-950/20 px-1 py-0.5 rounded font-black text-white">{currentUser.role}</span>)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModeratorModalOpen(true)}
                    className="bg-slate-950 hover:bg-slate-900 text-amber-300 hover:text-white text-xs font-black px-2.5 py-1 rounded-xl shrink-0 cursor-pointer transition-all shadow-md flex items-center gap-1"
                  >
                    <Sliders className="w-3 h-3 text-amber-400" />
                    Panel General
                  </button>
                </div>

                {/* Direct Role Switching in Firebase */}
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-950/20 text-[10px]">
                  <span className="font-bold flex items-center gap-1 text-slate-950">
                    <Database className="w-3 h-3 text-slate-950" />
                    Cambiar mi rol en Firebase:
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isChangingRole || currentUser.role === 'client'}
                      onClick={() => handleQuickRoleChange('client')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                        currentUser.role === 'client'
                          ? 'bg-slate-950 text-cyan-300 font-black'
                          : 'bg-slate-950/30 hover:bg-slate-950/60 text-slate-950'
                      }`}
                      title="Cambiar mi rol a cliente en Firestore"
                    >
                      client
                    </button>
                    <button
                      type="button"
                      disabled={isChangingRole || currentUser.role === 'driver'}
                      onClick={() => handleQuickRoleChange('driver')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                        currentUser.role === 'driver'
                          ? 'bg-slate-950 text-blue-300 font-black'
                          : 'bg-slate-950/30 hover:bg-slate-950/60 text-slate-950'
                      }`}
                      title="Cambiar mi rol a conductor en Firestore"
                    >
                      driver
                    </button>
                    <button
                      type="button"
                      disabled={isChangingRole || currentUser.role === 'admin'}
                      onClick={() => handleQuickRoleChange('admin')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                        currentUser.role === 'admin'
                          ? 'bg-slate-950 text-amber-300 font-black'
                          : 'bg-slate-950/30 hover:bg-slate-950/60 text-slate-950'
                      }`}
                      title="Mantener rol de administrador en Firestore"
                    >
                      admin
                    </button>
                  </div>
                </div>

                {/* View switcher for admin preview */}
                {isAdminRole(currentUser.role) && (
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-950 pt-0.5">
                    <span>Vista previa operativa:</span>
                    <div className="flex items-center gap-1 bg-slate-950/20 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setAdminViewMode('client')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          adminViewMode === 'client'
                            ? 'bg-slate-950 text-white font-bold'
                            : 'text-slate-950 hover:bg-slate-950/30'
                        }`}
                      >
                        Cliente
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminViewMode('driver')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          adminViewMode === 'driver'
                            ? 'bg-slate-950 text-white font-bold'
                            : 'text-slate-950 hover:bg-slate-950/30'
                        }`}
                      >
                        Repartidor
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Top Navbar */}
            <Navbar
              onOpenModerator={() => setIsModeratorModalOpen(true)}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              onOpenProfile={handleOpenProfile}
            />

            {/* Main Section based strictly on Role */}
            <main className="w-full flex-1 flex flex-col overflow-x-hidden">
              {isAdminRole(currentUser.role) ? (
                adminViewMode === 'client' ? (
                  <ClientDashboard
                    currentView={clientView}
                    onNavigateView={setClientView}
                  />
                ) : (
                  <DriverDashboard />
                )
              ) : isClientRole(currentUser.role) ? (
                <ClientDashboard
                  currentView={clientView}
                  onNavigateView={setClientView}
                />
              ) : (
                <DriverDashboard />
              )}
            </main>

            {/* Moderator / Admin Control Panel Modal */}
            <ModeratorModal
              isOpen={isModeratorModalOpen}
              onClose={() => setIsModeratorModalOpen(false)}
            />

            {/* Notifications Drawer */}
            <NotificationsDrawer
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
            />

            {/* User Profile Modal */}
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
