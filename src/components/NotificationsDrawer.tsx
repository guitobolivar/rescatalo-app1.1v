import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AppNotification } from '../types';
import {
  Bell,
  X,
  Trash2,
  CheckCheck,
  Package,
  Bike,
  AlertTriangle,
  UserCheck,
  Info,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    currentUser,
    notifications,
    markNotificationAsRead,
    clearAllNotifications,
    clearReadNotifications,
    pushPermissionStatus,
    requestPushPermission,
  } = useApp();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  if (!isOpen) return null;

  // Filter notifications: belongs to current user or ALL
  const userNotifications = notifications.filter(
    (n) => n.userId === 'ALL' || n.userId === currentUser?.id
  );

  const displayedNotifications = userNotifications.filter((n) =>
    filter === 'unread' ? !n.read : true
  );

  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'order_cancelled':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'order_assigned':
        return <Bike className="w-4 h-4 text-cyan-400" />;
      case 'order_status':
        return <Package className="w-4 h-4 text-emerald-400" />;
      case 'profile':
        return <UserCheck className="w-4 h-4 text-amber-400" />;
      case 'system':
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Ahora mismo';
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    return new Date(timestamp).toLocaleDateString('es-VE', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm h-full bg-slate-900 border-l border-cyan-500/30 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-black text-white flex items-center justify-center shadow-md animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-black text-white leading-tight">
                Notificaciones
              </h3>
              <p className="text-[11px] text-slate-400">
                {unreadCount} sin leer de {userNotifications.length}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Web Push / System Permission Banner */}
        <div className="p-3 bg-slate-950/70 border-b border-slate-800 shrink-0">
          {pushPermissionStatus === 'granted' ? (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-[11px] text-emerald-300">
              <span className="flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Alertas push del sistema activas
              </span>
              <span className="text-[10px] opacity-80">2do plano OK</span>
            </div>
          ) : (
            <div className="p-2.5 rounded-2xl bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border border-cyan-500/40 space-y-1.5">
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-xs font-black text-cyan-300 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  Notificaciones en 2do Plano
                </span>
              </div>
              <p className="text-[10px] text-slate-300 leading-tight">
                Recibe avisos de pedidos aun si la pantalla está bloqueada o minimizada.
              </p>
              <button
                type="button"
                onClick={requestPushPermission}
                className="w-full py-1.5 px-3 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-[11px] rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-md shadow-cyan-950/40"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Activar Alertas del Sistema</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter & Action Buttons */}
        <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-bold shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-xl text-[11px] transition-colors ${
                filter === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas ({userNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-2.5 py-1 rounded-xl text-[11px] transition-colors ${
                filter === 'unread'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              No leídas ({unreadCount})
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {userNotifications.some((n) => n.read) && (
              <button
                type="button"
                onClick={clearReadNotifications}
                title="Limpiar solo leídas"
                className="px-2 py-1 text-[11px] text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Limpiar leídas
              </button>
            )}
            {userNotifications.length > 0 && (
              <button
                type="button"
                onClick={clearAllNotifications}
                title="Eliminar todas las notificaciones"
                className="px-2 py-1 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Eliminar todas</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {displayedNotifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-400">
                {filter === 'unread'
                  ? 'No tienes notificaciones sin leer'
                  : 'Bandeja de notificaciones vacía'}
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Las actualizaciones de estado de tus pedidos y alertas de rescate aparecerán aquí.
              </p>
            </div>
          ) : (
            displayedNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.read) {
                    markNotificationAsRead(notif.id);
                  }
                }}
                className={`p-3 rounded-2xl border transition-all cursor-pointer relative group ${
                  notif.read
                    ? 'bg-slate-950/50 border-slate-800/80 text-slate-400 opacity-75 hover:opacity-100 hover:bg-slate-950'
                    : 'bg-slate-950 border-cyan-500/40 text-slate-100 shadow-md shadow-cyan-950/20 ring-1 ring-cyan-500/20'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                      notif.read
                        ? 'bg-slate-900 border-slate-800 text-slate-500'
                        : 'bg-slate-900 border-cyan-500/30 text-cyan-300'
                    }`}
                  >
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-xs font-black truncate leading-tight ${
                          notif.read ? 'text-slate-300' : 'text-white'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 shadow-xs shadow-cyan-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-snug break-words">
                      {notif.body}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/60 text-[10px] text-slate-500">
                      <span>{formatTimestamp(notif.timestamp)}</span>
                      <span className="text-[9px] text-cyan-400/80 font-mono">
                        {notif.read ? 'Leída' : 'Toca para marcar leída'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
