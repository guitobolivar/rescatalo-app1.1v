import React from 'react';
import { useApp } from '../context/AppContext';
import { RescataloLogo } from './RescataloLogo';
import { ShieldCheck, LogOut, User, Bike, Bell } from 'lucide-react';
import { isDriverRole, isAdminRole } from '../types';

interface NavbarProps {
  onOpenModerator: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenModerator,
  onOpenNotifications,
  onOpenProfile,
}) => {
  const { currentUser, isModerator, isAdmin, logout, unreadNotificationsCount } = useApp();

  return (
    <header className="sticky top-0 z-40 w-full bg-[#080d19]/85 backdrop-blur-xl border-b border-cyan-500/20 px-4 py-3 flex items-center justify-between shadow-lg shadow-black/40">
      {/* Brand logo & custom vibrant typography */}
      <div className="flex items-center gap-3 min-w-0">
        <RescataloLogo size="sm" />
        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-base font-black tracking-tight font-sans bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Rescátalo
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
          </div>
          <span className="text-[10px] font-black tracking-widest uppercase mt-0.5 bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent leading-none">
            Valle de la Pascua
          </span>
        </div>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Notifications Bell Button */}
        {currentUser && (
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 hover:border-cyan-500/40 rounded-2xl transition-all cursor-pointer active:scale-95"
            title="Centro de Notificaciones"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-black text-white flex items-center justify-center shadow-md animate-pulse">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>
        )}

        {currentUser && (
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-2 bg-gradient-to-b from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 border border-cyan-500/30 hover:border-cyan-400/60 px-2.5 py-1.5 rounded-2xl shadow-sm cursor-pointer transition-all active:scale-95 text-left"
            title="Ver y Editar Perfil"
          >
            <div
              className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 ${
                isAdminRole(currentUser.role)
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : isDriverRole(currentUser.role)
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              }`}
            >
              {isAdminRole(currentUser.role) ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : isDriverRole(currentUser.role) ? (
                <Bike className="w-3.5 h-3.5" />
              ) : (
                <User className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="text-left max-w-[90px] truncate">
              <span className="text-xs font-black text-white block leading-tight truncate">
                {currentUser.name.split(' ')[0]}
              </span>
              <span className="text-[9px] text-cyan-300 font-bold block leading-none uppercase tracking-wide">
                {isAdminRole(currentUser.role) ? 'Admin' : isDriverRole(currentUser.role) ? 'Moto' : 'Cliente'}
              </span>
            </div>
          </button>
        )}

        {/* Moderator / Admin Button */}
        {(isModerator || isAdmin || isAdminRole(currentUser?.role)) && (
          <button
            type="button"
            onClick={onOpenModerator}
            className="px-2 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/50 text-xs font-black rounded-2xl flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
            title="Panel de Control General y Moderación"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin</span>
          </button>
        )}

        {/* Logout Button */}
        <button
          type="button"
          onClick={logout}
          className="p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 rounded-2xl transition-all cursor-pointer active:scale-95"
          title="Cerrar Sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
