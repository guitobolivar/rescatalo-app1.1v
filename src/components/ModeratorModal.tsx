import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserRole, UserStatus, isDriverRole, isClientRole, isAdminRole, normalizeRole } from '../types';
import { MotoPassengerIcon, MotoDeliveryIcon } from './ServiceIcons';
import { UserProfileModal } from './UserProfileModal';
import {
  ShieldCheck,
  DollarSign,
  Gauge,
  Check,
  X,
  Info,
  Users,
  UserX,
  UserCheck,
  Trash2,
  AlertTriangle,
  Search,
  Bike,
  IdCard,
  TrendingUp,
  UserCog,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  Wallet,
  Clock,
  Megaphone,
  Sparkles,
  Save,
  Siren,
  AlertOctagon,
  ShieldAlert,
} from 'lucide-react';

interface ModeratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModeratorModal: React.FC<ModeratorModalProps> = ({ isOpen, onClose }) => {
  const {
    isModerator,
    currentUser,
    pricingConfig,
    updatePricingConfig,
    announcement,
    updateAnnouncement,
    setUserStatus,
    deleteUser,
    orders,
    allUsers,
    incidentReports,
    updateIncidentStatus,
    changeUserRoleInFirestore,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'pricing' | 'users' | 'finances' | 'announcement' | 'stats' | 'incidents'>('pricing');
  const [financePeriod, setFinancePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [userForProfileEdit, setUserForProfileEdit] = useState<User | null>(null);
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null);
  const [settledDrivers, setSettledDrivers] = useState<Record<string, boolean>>({});
  const [roleChangeFeedback, setRoleChangeFeedback] = useState<string | null>(null);

  // Announcement editable states
  const [announcementEnabled, setAnnouncementEnabled] = useState(announcement.enabled);
  const [announcementBadge, setAnnouncementBadge] = useState(announcement.badge || 'COMUNICADO OFICIAL');
  const [announcementTitle, setAnnouncementTitle] = useState(announcement.title);
  const [announcementMessage, setAnnouncementMessage] = useState(announcement.message);
  const [announcementSavedSuccess, setAnnouncementSavedSuccess] = useState(false);

  // Rates per service states (Only Rescátalo Moto & Rescátalo Delivery)
  const [rateMoto, setRateMoto] = useState<number>(
    pricingConfig.serviceRatesUSD?.rescate_moto ?? 0.8
  );
  const [rateDelivery, setRateDelivery] = useState<number>(
    pricingConfig.serviceRatesUSD?.rescate_delivery ?? 0.95
  );

  // Global pricing params
  const [baseFee, setBaseFee] = useState<number>(pricingConfig.baseFeeUSD);
  const [driverCommission, setDriverCommission] = useState<number>(
    Math.round(pricingConfig.driverCommissionRate * 100)
  );
  const [minimumFare, setMinimumFare] = useState<number>(pricingConfig.minimumFareUSD);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [simMessage, setSimMessage] = useState<string | null>(null);

  // User management tab states
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'CLIENTS' | 'DRIVERS' | 'ADMINS' | 'SUSPENDED'>('ALL');
  const [suspensionModalUser, setSuspensionModalUser] = useState<User | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('Incumplimiento de términos y condiciones');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  if (!isOpen) return null;

  const handleRoleChangeForUser = async (userId: string, newRole: 'client' | 'driver' | 'admin') => {
    await changeUserRoleInFirestore(newRole, userId);
    setRoleChangeFeedback(`Rol de usuario actualizado en Firebase a '${newRole}'`);
    setTimeout(() => setRoleChangeFeedback(null), 2500);
  };

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isModerator) return;

    updatePricingConfig({
      baseFeeUSD: Number(baseFee),
      costPerKmUSD: Number(rateMoto), // Default fallback
      driverCommissionRate: Number(driverCommission) / 100,
      minimumFareUSD: Number(minimumFare),
      serviceRatesUSD: {
        rescate_moto: Number(rateMoto),
        rescate_delivery: Number(rateDelivery),
      },
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 1800);
  };

  const handleConfirmSuspension = () => {
    if (!suspensionModalUser) return;
    setUserStatus(suspensionModalUser.id, 'Suspendido', suspensionReason.trim() || 'Suspensión por moderación');
    setSuspensionModalUser(null);
  };

  const handleRestoreUser = (targetUser: User) => {
    setUserStatus(targetUser.id, 'Activo');
  };

  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    updateAnnouncement({
      enabled: announcementEnabled,
      badge: announcementBadge.trim() || 'COMUNICADO OFICIAL',
      title: announcementTitle.trim() || '¡Aviso Oficial Rescátalo!',
      message: announcementMessage.trim(),
    });
    setAnnouncementSavedSuccess(true);
    setTimeout(() => {
      setAnnouncementSavedSuccess(false);
    }, 2000);
  };

  // Filtered users for user moderation tab
  const filteredUsers = allUsers.filter((u) => {
    const q = userSearchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.cedula && u.cedula.toLowerCase().includes(q)) ||
      u.phone.includes(q);

    if (!matchesQuery) return false;

    if (userRoleFilter === 'CLIENTS') return isClientRole(u.role);
    if (userRoleFilter === 'DRIVERS') return isDriverRole(u.role);
    if (userRoleFilter === 'ADMINS') return isAdminRole(u.role);
    if (userRoleFilter === 'SUSPENDED') return u.status === 'Suspendido';
    return true;
  });

  const sampleDistance = 3.5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[96%] max-w-lg mx-auto bg-slate-900 rounded-3xl shadow-2xl border border-cyan-500/40 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-950 px-5 py-4 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-white tracking-tight truncate">
                Panel Moderador Exclusivo
              </h3>
              <p className="text-xs text-slate-400 truncate">{currentUser?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs for Moderator */}
        <div className="flex bg-slate-950/90 px-3 pt-2 border-b border-slate-800 shrink-0 text-xs font-bold gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`pb-2.5 px-2.5 border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pricing'
                ? 'border-cyan-400 text-cyan-300 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Tarifas y Servicios</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`pb-2.5 px-2.5 border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'border-cyan-400 text-cyan-300 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Gestión de Usuarios</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('finances')}
            className={`pb-2.5 px-2.5 border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'finances'
                ? 'border-cyan-400 text-cyan-300 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Liquidación y Finanzas</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`pb-2.5 px-2.5 border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'stats'
                ? 'border-cyan-400 text-cyan-300 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Métricas</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('announcement')}
            className={`pb-2.5 px-2.5 border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'announcement'
                ? 'border-cyan-400 text-cyan-300 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Ficha Informativa</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('incidents')}
            className={`pb-2.5 px-2.5 border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'incidents'
                ? 'border-rose-400 text-rose-300 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Siren className="w-3.5 h-3.5 text-rose-400" />
            <span>Reportes ({incidentReports.length})</span>
            {incidentReports.filter((i) => i.status === 'Abierto').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
        </div>

        {/* Content */}
        {!isModerator ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <X className="w-6 h-6" />
            </div>
            <h4 className="font-black text-white text-sm">Acceso Restringido</h4>
            <p className="text-xs text-slate-300">
              Solo las cuentas autenticadas con privilegios de moderación (como <strong>julio.c.montero01@gmail.com</strong>) tienen acceso a este panel.
            </p>
            <button
              onClick={onClose}
              className="mt-3 px-5 py-2.5 bg-slate-800 text-white text-xs font-bold rounded-xl"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4 overflow-y-auto no-scrollbar flex-1">
            {/* TAB 1: PRICING & SERVICES CONFIGURATION */}
            {activeTab === 'pricing' && (
              <form onSubmit={handleSaveRates} className="space-y-4">
                <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs flex items-start gap-2">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    Configura dinámicamente la tarifa por km de los servicios de Rescátalo (Moto y Mandados). Los cambios se aplican al instante a todos los usuarios.
                  </span>
                </div>

                {/* 2 SERVICES: MOTO & MANDADOS */}
                <div className="space-y-2.5">
                  <span className="text-xs font-black uppercase text-white tracking-wider block">
                    Tarifas por Kilómetro por Tipo de Servicio ($/km)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* 1. Rescátalo Moto */}
                    <div className="p-3 bg-slate-950 rounded-2xl border border-emerald-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                            <MotoPassengerIcon size={20} />
                          </div>
                          <div>
                            <span className="text-xs font-black text-white block">Rescátalo Moto</span>
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          step="0.05"
                          min="0.2"
                          required
                          value={rateMoto}
                          onChange={(e) => setRateMoto(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-xl pl-7 pr-3 py-2 text-sm text-emerald-300 font-mono font-bold outline-none"
                        />
                      </div>
                    </div>

                    {/* 2. Rescátalo Mandados */}
                    <div className="p-3 bg-slate-950 rounded-2xl border border-cyan-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                            <MotoDeliveryIcon size={20} />
                          </div>
                          <div>
                            <span className="text-xs font-black text-white block">Rescátalo Mandados</span>
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          step="0.05"
                          min="0.2"
                          required
                          value={rateDelivery}
                          onChange={(e) => setRateDelivery(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl pl-7 pr-3 py-2 text-sm text-cyan-300 font-mono font-bold outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* GENERAL PRICING PARAMETERS */}
                <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                      Tarifa Base ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        required
                        value={baseFee}
                        onChange={(e) => setBaseFee(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl pl-6 pr-2 py-2 text-xs text-white font-mono font-bold outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                      Mínima ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        step="0.25"
                        min="1"
                        required
                        value={minimumFare}
                        onChange={(e) => setMinimumFare(parseFloat(e.target.value) || 2)}
                        className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl pl-6 pr-2 py-2 text-xs text-white font-mono font-bold outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                      Comisión Rep. (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        min="50"
                        max="95"
                        required
                        value={driverCommission}
                        onChange={(e) => setDriverCommission(parseInt(e.target.value) || 82)}
                        className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-2 py-2 text-xs text-white font-mono font-bold outline-none"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                </div>

                {/* Example preview for 3.5 km trip across services */}
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wide block">
                    Previsiones para 3.5 km (La Pascua):
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-slate-900 border border-emerald-500/30">
                      <span className="text-emerald-400 font-bold block">Rescátalo Moto:</span>
                      <span className="font-mono font-bold text-emerald-300">
                        ${Math.max(minimumFare, Number(baseFee) + sampleDistance * Number(rateMoto)).toFixed(2)} USD
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-cyan-500/30">
                      <span className="text-cyan-400 font-bold block">Rescátalo Delivery:</span>
                      <span className="font-mono font-bold text-cyan-300">
                        ${Math.max(minimumFare, Number(baseFee) + sampleDistance * Number(rateDelivery)).toFixed(2)} USD
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-98 text-slate-950 font-black text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 transition-all"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-slate-950" />
                      <span>¡Tarifas y Servicios Actualizados!</span>
                    </>
                  ) : (
                    <span>Guardar Tarifas de Servicios ($)</span>
                  )}
                </button>
              </form>
            )}

            {/* TAB 2: USER MANAGEMENT & MODERATION (SUSPEND / RESTORE) */}
            {activeTab === 'users' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-white tracking-wider">
                    Usuarios y Repartidores ({allUsers.length})
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {allUsers.filter((u) => u.status === 'Suspendido').length} Suspendidos
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre, correo, cédula o teléfono..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-white outline-none placeholder:text-slate-500"
                  />
                </div>

                {/* Filter Chips */}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setUserRoleFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                      userRoleFilter === 'ALL'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Todos ({allUsers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserRoleFilter('CLIENTS')}
                    className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                      userRoleFilter === 'CLIENTS'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Clientes ({allUsers.filter((u) => isClientRole(u.role)).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserRoleFilter('DRIVERS')}
                    className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                      userRoleFilter === 'DRIVERS'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Repartidores ({allUsers.filter((u) => isDriverRole(u.role)).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserRoleFilter('ADMINS')}
                    className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                      userRoleFilter === 'ADMINS'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Admins ({allUsers.filter((u) => isAdminRole(u.role)).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserRoleFilter('SUSPENDED')}
                    className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                      userRoleFilter === 'SUSPENDED'
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Suspendidos ({allUsers.filter((u) => u.status === 'Suspendido').length})
                  </button>
                </div>

                {roleChangeFeedback && (
                  <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 text-xs font-bold text-center animate-in fade-in">
                    {roleChangeFeedback}
                  </div>
                )}

                {/* Users List */}
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto no-scrollbar pr-1">
                  {filteredUsers.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs bg-slate-950 rounded-2xl border border-slate-800">
                      No se encontraron usuarios coincidentes con la búsqueda.
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const isCurrentUser = currentUser?.id === u.id;
                      const isSuspended = u.status === 'Suspendido';

                      return (
                        <div
                          key={u.id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            isSuspended
                              ? 'bg-rose-950/20 border-rose-500/40'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <img
                                src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                                alt={u.name}
                                className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-700"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-black text-white truncate">
                                    {u.name}
                                  </span>
                                  {isCurrentUser && (
                                    <span className="text-[9px] bg-cyan-950 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-500/30 font-bold">
                                      Tú
                                    </span>
                                  )}
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                      isAdminRole(u.role)
                                        ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                                        : isDriverRole(u.role)
                                        ? 'bg-blue-950 text-blue-300 border-blue-500/30'
                                        : 'bg-cyan-950 text-cyan-300 border-cyan-500/30'
                                    }`}
                                  >
                                    {isAdminRole(u.role) ? 'Admin' : isDriverRole(u.role) ? 'Repartidor' : 'Cliente'}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                      isSuspended
                                        ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                                        : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                    }`}
                                  >
                                    {isSuspended ? 'Suspendido' : 'Activo'}
                                  </span>
                                </div>

                                <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                                  <div className="truncate flex items-center gap-1">
                                    <span className="text-slate-500">Correo:</span>
                                    <span className="text-slate-300">{u.email}</span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {u.cedula && (
                                      <span className="text-slate-300 flex items-center gap-1">
                                        <IdCard className="w-3 h-3 text-slate-400" />
                                        {u.cedula}
                                      </span>
                                    )}
                                    <span className="text-slate-400">Telf: {u.phone}</span>
                                  </div>
                                  {u.vehicle && (
                                    <div className="text-[10px] text-cyan-400 flex items-center gap-1 font-mono">
                                      <Bike className="w-3 h-3" />
                                      <span>
                                        {u.vehicle.model} · Placa: {u.vehicle.plate}
                                      </span>
                                    </div>
                                  )}
                                  {isSuspended && u.suspendedReason && (
                                    <div className="text-[10px] text-rose-300 bg-rose-950/40 p-1.5 rounded-lg border border-rose-500/30 mt-1">
                                      Motivo: {u.suspendedReason}
                                    </div>
                                  )}

                                  {/* Direct Firestore Role Switcher per User */}
                                  <div className="flex items-center gap-1 pt-1 mt-1 border-t border-slate-900 flex-wrap">
                                    <span className="text-[9px] text-slate-500 font-bold">Cambiar rol:</span>
                                    <button
                                      type="button"
                                      disabled={u.role === 'client'}
                                      onClick={() => handleRoleChangeForUser(u.id, 'client')}
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-all ${
                                        u.role === 'client'
                                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                                          : 'bg-slate-900 text-slate-400 hover:text-white'
                                      }`}
                                      title="Establecer rol client en Firestore"
                                    >
                                      client
                                    </button>
                                    <button
                                      type="button"
                                      disabled={u.role === 'driver'}
                                      onClick={() => handleRoleChangeForUser(u.id, 'driver')}
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-all ${
                                        u.role === 'driver'
                                          ? 'bg-blue-950 text-blue-300 border border-blue-500/40'
                                          : 'bg-slate-900 text-slate-400 hover:text-white'
                                      }`}
                                      title="Establecer rol driver en Firestore"
                                    >
                                      driver
                                    </button>
                                    <button
                                      type="button"
                                      disabled={u.role === 'admin'}
                                      onClick={() => handleRoleChangeForUser(u.id, 'admin')}
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-all ${
                                        u.role === 'admin'
                                          ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                          : 'bg-slate-900 text-slate-400 hover:text-white'
                                      }`}
                                      title="Establecer rol admin en Firestore"
                                    >
                                      admin
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Direct Moderation Action Buttons */}
                            <div className="shrink-0 flex flex-col gap-1.5">
                              {/* Moderator View & Edit User Profile with No Restrictions */}
                              <button
                                type="button"
                                onClick={() => setUserForProfileEdit(u)}
                                className="px-2.5 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 hover:text-white rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                                title="Ver y editar libremente los datos de este usuario"
                              >
                                <UserCog className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Detalles del perfil</span>
                              </button>

                              {isSuspended ? (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreUser(u)}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                                  title="Restaurar a estado Activo"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Restaurar</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isCurrentUser}
                                  onClick={() => {
                                    setSuspensionModalUser(u);
                                    setSuspensionReason('Incumplimiento de términos o reporte de conducta');
                                  }}
                                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all ${
                                    isCurrentUser
                                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-40'
                                      : 'bg-amber-950/70 hover:bg-amber-900 border border-amber-500/40 text-amber-300 cursor-pointer'
                                  }`}
                                  title={isCurrentUser ? 'No puedes suspender tu propia cuenta' : 'Suspender o penalizar cuenta'}
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>Suspender</span>
                                </button>
                              )}

                              {/* Moderator Account Deletion Button */}
                              <button
                                type="button"
                                disabled={isCurrentUser}
                                onClick={() => setUserToDelete(u)}
                                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all ${
                                  isCurrentUser
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-40'
                                    : 'bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-rose-300 cursor-pointer'
                                }`}
                                title={isCurrentUser ? 'No puedes eliminar tu propia cuenta' : 'Eliminar cuenta permanentemente'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Eliminar</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Suspension reason prompt dialog */}
                {suspensionModalUser && (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-rose-500/50 space-y-3 mt-3 animate-in fade-in">
                    <div className="flex items-center gap-2 text-rose-400 text-xs font-black">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Confirmar suspensión para: {suspensionModalUser.name}</span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Motivo de la penalización / suspensión:
                      </label>
                      <input
                        type="text"
                        value={suspensionReason}
                        onChange={(e) => setSuspensionReason(e.target.value)}
                        placeholder="Ej. Violación de normas de entrega, reporte de cliente"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-rose-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setSuspensionModalUser(null)}
                        className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmSuspension}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl cursor-pointer"
                      >
                        Aplicar Suspensión
                      </button>
                    </div>
                  </div>
                )}

                {/* Account Deletion Confirmation Dialog */}
                {userToDelete && (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-rose-600/70 space-y-3 mt-3 animate-in fade-in shadow-xl shadow-rose-950/30">
                    <div className="flex items-center gap-2 text-rose-400 text-xs font-black">
                      <Trash2 className="w-4 h-4" />
                      <span>Confirmar Eliminación de Cuenta</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      ¿Estás seguro de que deseas eliminar permanentemente la cuenta de <strong className="text-white">{userToDelete.name}</strong> ({userToDelete.email})? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex justify-end gap-2 text-xs font-bold pt-1">
                      <button
                        type="button"
                        onClick={() => setUserToDelete(null)}
                        className="px-3.5 py-2 bg-slate-800 text-slate-300 rounded-xl hover:text-white cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          deleteUser(userToDelete.id);
                          setUserToDelete(null);
                        }}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-950/50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Sí, Eliminar Definitivamente</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: LIQUIDACIÓN Y FINANZAS */}
            {activeTab === 'finances' && (() => {
              const now = new Date();
              let startPeriodTimestamp = 0;
              if (financePeriod === 'daily') {
                startPeriodTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
              } else if (financePeriod === 'weekly') {
                startPeriodTimestamp = Date.now() - 7 * 24 * 60 * 60 * 1000;
              } else {
                startPeriodTimestamp = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
              }

              const periodCompletedOrders = orders.filter((o) => {
                if (o.status !== 'Entregado') return false;
                const t = o.completedAt || o.createdAt;
                return t >= startPeriodTimestamp;
              });

              const driversList = allUsers.filter((u) => isDriverRole(u.role));

              const driverFinancials = driversList.map((driver) => {
                const driverOrders = periodCompletedOrders.filter((o) => o.driverId === driver.id);
                const count = driverOrders.length;
                const totalUSD = driverOrders.reduce((sum, o) => sum + (o.totalCostUSD || 0), 0);
                const netEarningsUSD = driverOrders.reduce(
                  (sum, o) => sum + (o.driverNetEarningsUSD || Math.round(o.totalCostUSD * pricingConfig.driverCommissionRate * 100) / 100),
                  0
                );
                const platformFeeUSD = Math.round((totalUSD - netEarningsUSD) * 100) / 100;

                return {
                  driver,
                  count,
                  totalUSD: Math.round(totalUSD * 100) / 100,
                  netEarningsUSD: Math.round(netEarningsUSD * 100) / 100,
                  platformFeeUSD: Math.max(0, platformFeeUSD),
                  orders: driverOrders,
                };
              });

              const totalGeneratedAll = Math.round(
                periodCompletedOrders.reduce((sum, o) => sum + (o.totalCostUSD || 0), 0) * 100
              ) / 100;

              const totalDriversAll = Math.round(
                driverFinancials.reduce((sum, d) => sum + d.netEarningsUSD, 0) * 100
              ) / 100;

              const totalPlatformAll = Math.round(
                (totalGeneratedAll - totalDriversAll) * 100
              ) / 100;

              return (
                <div className="space-y-4">
                  {/* Period Switcher: Diario, Semanal, Mensual */}
                  <div className="p-1 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setFinancePeriod('daily')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        financePeriod === 'daily'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-950/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Diario (Hoy)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFinancePeriod('weekly')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        financePeriod === 'weekly'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-950/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Semanal (7 días)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFinancePeriod('monthly')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        financePeriod === 'monthly'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-950/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Mensual (Mes en curso)</span>
                    </button>
                  </div>

                  {/* Summary KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Facturado</span>
                      <div className="text-lg font-black text-white font-mono mt-0.5">
                        ${totalGeneratedAll.toFixed(2)} <span className="text-[10px] text-slate-400 font-sans">USD</span>
                      </div>
                      <span className="text-[10px] text-cyan-400 font-semibold">{periodCompletedOrders.length} servicios</span>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-2xl border border-emerald-500/30">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Ganancia Repartidores</span>
                      <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                        ${totalDriversAll.toFixed(2)} <span className="text-[10px] text-emerald-300 font-sans">USD</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">{Math.round(pricingConfig.driverCommissionRate * 100)}% Comisión Conductor</span>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-2xl border border-cyan-500/30">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Comisión Rescátalo</span>
                      <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">
                        ${totalPlatformAll.toFixed(2)} <span className="text-[10px] text-cyan-300 font-sans">USD</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">{Math.round((1 - pricingConfig.driverCommissionRate) * 100)}% Para Plataforma</span>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Repartidores Activos</span>
                      <div className="text-lg font-black text-white font-mono mt-0.5">
                        {driverFinancials.filter((d) => d.count > 0).length} / {driversList.length}
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">En este periodo</span>
                    </div>
                  </div>

                  {/* Drivers Financial Breakdown */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-cyan-400" />
                        Desglose de Liquidación por Repartidor ({driversList.length})
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Comisión Activa: {Math.round(pricingConfig.driverCommissionRate * 100)}% / {Math.round((1 - pricingConfig.driverCommissionRate) * 100)}%
                      </span>
                    </div>

                    {driverFinancials.length === 0 ? (
                      <div className="p-6 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                        No hay repartidores registrados en el sistema.
                      </div>
                    ) : (
                      driverFinancials.map(({ driver, count, totalUSD, netEarningsUSD, platformFeeUSD, orders: driverOrders }) => {
                        const isExpanded = expandedDriverId === driver.id;
                        const isSettled = Boolean(settledDrivers[`${driver.id}-${financePeriod}`]);

                        return (
                          <div
                            key={driver.id}
                            className="p-4 bg-slate-950 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                          >
                            {/* Driver Header */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={driver.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'}
                                  alt={driver.name}
                                  className="w-10 h-10 rounded-xl object-cover border border-cyan-500/30"
                                />
                                <div>
                                  <h4 className="text-sm font-black text-white leading-tight flex items-center gap-1.5">
                                    <span>{driver.name}</span>
                                    <span className="text-[10px] text-amber-300 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.2 rounded">
                                      ★ {driver.rating?.toFixed(1) || '4.9'}
                                    </span>
                                  </h4>
                                  <p className="text-[11px] text-slate-400">
                                    {driver.vehicle?.model} · <span className="text-cyan-400 font-mono font-bold">{driver.vehicle?.plate}</span>
                                  </p>
                                </div>
                              </div>

                              {/* Status badge & action */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSettledDrivers((prev) => ({
                                      ...prev,
                                      [`${driver.id}-${financePeriod}`]: !isSettled,
                                    }));
                                  }}
                                  className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer border ${
                                    isSettled
                                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                                  }`}
                                >
                                  {isSettled ? 'Liquidado ✓' : 'Marcar Liquidado'}
                                </button>
                              </div>
                            </div>

                            {/* 4 Financial Columns as requested */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                              <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800">
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Servicios</span>
                                <span className="text-sm font-black text-white font-mono mt-0.5 block">
                                  {count} <span className="text-[10px] text-slate-400 font-sans">viajes</span>
                                </span>
                              </div>

                              <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800">
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Generado</span>
                                <span className="text-sm font-black text-white font-mono mt-0.5 block">
                                  ${totalUSD.toFixed(2)} <span className="text-[10px] text-slate-400 font-sans">USD</span>
                                </span>
                              </div>

                              <div className="p-2.5 bg-emerald-950/40 rounded-xl border border-emerald-500/30">
                                <span className="text-[10px] text-emerald-400 uppercase font-bold block">Ganancia Neta</span>
                                <span className="text-sm font-black text-emerald-300 font-mono mt-0.5 block">
                                  ${netEarningsUSD.toFixed(2)} <span className="text-[10px] font-sans">USD</span>
                                </span>
                              </div>

                              <div className="p-2.5 bg-cyan-950/40 rounded-xl border border-cyan-500/30">
                                <span className="text-[10px] text-cyan-400 uppercase font-bold block">Comisión Plataforma</span>
                                <span className="text-sm font-black text-cyan-300 font-mono mt-0.5 block">
                                  ${platformFeeUSD.toFixed(2)} <span className="text-[10px] font-sans">USD</span>
                                </span>
                              </div>
                            </div>

                            {/* Expandable Order Detail */}
                            {driverOrders.length > 0 && (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setExpandedDriverId(isExpanded ? null : driver.id)}
                                  className="w-full py-1 text-[11px] font-bold text-slate-400 hover:text-cyan-300 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                >
                                  <span>{isExpanded ? 'Ocultar detalle de órdenes' : `Ver ${driverOrders.length} órdenes realizadas`}</span>
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>

                                {isExpanded && (
                                  <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-800/80">
                                    {driverOrders.map((ord) => (
                                      <div
                                        key={ord.id}
                                        className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-[11px]"
                                      >
                                        <div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-mono font-bold text-white">#{ord.id}</span>
                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                              {ord.serviceType === 'rescate_moto' ? 'Moto' : 'Delivery'}
                                            </span>
                                          </div>
                                          <span className="text-slate-400 block truncate max-w-[200px]">
                                            {ord.origin.name} → {ord.destination.name}
                                          </span>
                                        </div>

                                        <div className="text-right">
                                          <span className="font-mono font-bold text-emerald-400 block">
                                            +${(ord.driverNetEarningsUSD || 0).toFixed(2)} USD
                                          </span>
                                          <span className="text-[9px] text-slate-500">
                                            Total: ${ord.totalCostUSD.toFixed(2)} | Plataforma: ${(ord.totalCostUSD - ord.driverNetEarningsUSD).toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()}

            {/* TAB 4: METRICS */}
            {activeTab === 'stats' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 font-bold uppercase block">Usuarios Registrados</span>
                    <div className="text-xl font-black text-white font-mono mt-1">
                      {allUsers.length}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {allUsers.filter((u) => isClientRole(u.role)).length} Clientes / {allUsers.filter((u) => isDriverRole(u.role)).length} Repartidores / {allUsers.filter((u) => isAdminRole(u.role)).length} Admins
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 font-bold uppercase block">Total Pedidos</span>
                    <div className="text-xl font-black text-white font-mono mt-1">
                      {orders.length}
                    </div>
                    <span className="text-[10px] text-cyan-400 mt-0.5 block font-bold">
                      {orders.filter((o) => o.status === 'Entregado').length} Entregados
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wide block">
                    Servicios Activos en Plataforma (2):
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-emerald-500/30 text-emerald-300 font-bold">
                      <MotoPassengerIcon size={20} />
                      <div className="min-w-0">
                        <span className="block leading-tight truncate">Rescátalo Moto</span>
                        <span className="text-[10px] text-slate-400 font-normal">1 Solo pasajero</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-300 font-bold">
                      <MotoDeliveryIcon size={20} />
                      <div className="min-w-0">
                        <span className="block leading-tight truncate">Rescátalo Delivery</span>
                        <span className="text-[10px] text-slate-400 font-normal">Maleta delivery</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wide block">
                    Aislamiento RBAC & Seguridad:
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Sistema de menor privilegio estricto: usuarios normales solo ven sus propios servicios; los repartidores solo acceden a contactos (teléfono y WhatsApp) tras aceptar un servicio en curso. Cuentas suspendidas pierden acceso total al servicio.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 5: ANNOUNCEMENT / FICHA INFORMATIVA EDITABLE */}
            {activeTab === 'announcement' && (
              <form onSubmit={handleSaveAnnouncement} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs flex items-start gap-2.5">
                  <Megaphone className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-white">Ficha Informativa & Promociones para Inicio</span>
                    <span className="text-slate-300 text-[11px] leading-relaxed">
                      Configura el bloque informativo superior de la pantalla de inicio para todos los usuarios. Ideal para anunciar ofertas, eventos, cambios en tarifas o comunicados oficiales de Rescátalo.
                    </span>
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-white block">
                      Mostrar Ficha en Pantalla de Inicio
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {announcementEnabled
                        ? 'Activa: Visible en la pantalla principal de los usuarios'
                        : 'Desactivada: Oculta temporalmente'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAnnouncementEnabled(!announcementEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 ${
                      announcementEnabled ? 'bg-cyan-500' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        announcementEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Badge text */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Etiqueta / Insignia (Badge)
                  </label>
                  <input
                    type="text"
                    value={announcementBadge}
                    onChange={(e) => setAnnouncementBadge(e.target.value)}
                    placeholder="Ej. COMUNICADO OFICIAL, PROMO ESPECIAL, AVISO"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono"
                  />
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Título del Anuncio
                  </label>
                  <input
                    type="text"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    placeholder="Ej. ¡Promociones y Entregas en Valle de la Pascua!"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold outline-none"
                  />
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Mensaje / Detalle Informativo
                  </label>
                  <textarea
                    rows={3}
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value)}
                    placeholder="Describe el contenido del aviso que verán los usuarios..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl p-3 text-xs text-white outline-none leading-relaxed"
                  />
                </div>

                {/* Live Preview */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Vista Previa en Tiempo Real
                  </span>
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/70 via-slate-900 to-blue-950/70 border border-cyan-500/30 shadow-lg">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {announcementBadge || 'COMUNICADO'}
                      </span>
                      {announcementEnabled && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          En Vivo
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-black text-white leading-tight">
                      {announcementTitle || 'Título de ejemplo'}
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      {announcementMessage || 'Mensaje de ejemplo que verán los clientes.'}
                    </p>
                  </div>
                </div>

                {/* Save button */}
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  {announcementSavedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-950" />
                      <span>¡Ficha Informativa Publicada con Éxito!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar y Publicar en Inicio</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB 6: REPORTES DE CLIENTES (INCIDENCIAS Y SANCIONES) */}
            {activeTab === 'incidents' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <Siren className="w-4 h-4 text-rose-400 animate-pulse" />
                      Reportes Prioritarios de Clientes
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Revisión y sanción inmediata de repartidores por irregularidades en Valle de la Pascua
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-rose-950 text-rose-300 border border-rose-500/40">
                    {incidentReports.length} reportes
                  </span>
                </div>

                {incidentReports.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/60 rounded-3xl border border-slate-800 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6 stroke-[3]" />
                    </div>
                    <h4 className="text-sm font-black text-white">Sin incidencias reportadas</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      No se registran alertas de pedidos falsos o irregularidades de repartidores en este momento.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {incidentReports.map((inc) => (
                      <div
                        key={inc.id}
                        className={`p-4 rounded-3xl border space-y-3 transition-all ${
                          inc.status === 'Abierto'
                            ? 'bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-950/40'
                            : inc.status === 'Sancionado'
                            ? 'bg-slate-950 border-rose-800/80'
                            : inc.status === 'Investigando'
                            ? 'bg-amber-950/30 border-amber-500/40'
                            : 'bg-slate-950/70 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-black text-rose-300 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                              #{inc.id}
                            </span>
                            <span className="text-[11px] font-mono text-cyan-400">
                              Orden #{inc.orderId}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                              inc.status === 'Abierto'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : inc.status === 'Sancionado'
                                ? 'bg-red-500/30 text-red-200 border-red-500/50'
                                : inc.status === 'Investigando'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            {inc.status}
                          </span>
                        </div>

                        {/* Motivo */}
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-white leading-snug">
                            {inc.reason}
                          </h4>
                          {inc.details && (
                            <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
                              "{inc.details}"
                            </p>
                          )}
                        </div>

                        {/* Client & Driver Info Grid */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800">
                          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                            <span className="text-slate-400 font-bold block text-[10px] uppercase">
                              Cliente denunciante:
                            </span>
                            <span className="text-white font-black truncate block">
                              {inc.clientName}
                            </span>
                            <span className="text-slate-400 font-mono text-[10px] block">
                              {inc.clientPhone}
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                            <span className="text-slate-400 font-bold block text-[10px] uppercase">
                              Repartidor reportado:
                            </span>
                            <span className="text-rose-300 font-black truncate block">
                              {inc.driverName}
                            </span>
                            <span className="text-slate-400 font-mono text-[10px] block">
                              {inc.driverPhone || 'ID: ' + inc.driverId}
                            </span>
                          </div>
                        </div>

                        {/* Actions for Moderator */}
                        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => updateIncidentStatus(inc.id, 'Sancionado')}
                            className="py-2 px-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-md shadow-rose-950/50"
                            title="Suspender cuenta del repartidor"
                          >
                            <AlertOctagon className="w-3.5 h-3.5" />
                            <span>Suspender</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => updateIncidentStatus(inc.id, 'Investigando')}
                            className="py-2 px-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[10px] rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Investigar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => updateIncidentStatus(inc.id, 'Resuelto')}
                            className="py-2 px-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-[10px] rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Resolver</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Unrestricted Profile Modal for Moderator */}
        <UserProfileModal
          isOpen={Boolean(userForProfileEdit)}
          onClose={() => setUserForProfileEdit(null)}
          targetUser={userForProfileEdit}
          isModeratorEdit={true}
        />
      </div>
    </div>
  );
};
