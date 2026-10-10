import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  User as UserIcon,
  Phone,
  Mail,
  IdCard,
  Bike,
  ShieldCheck,
  Check,
  AlertCircle,
  Save,
  ArrowLeft,
  LogOut,
  Calendar,
  Lock,
  Clock,
  Sparkles,
  Database,
} from 'lucide-react';
import { isDriverRole, isAdminRole, isClientRole, normalizeRole } from '../types';

interface UserProfileViewProps {
  onBackToHome: () => void;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const UserProfileView: React.FC<UserProfileViewProps> = ({ onBackToHome }) => {
  const { currentUser, updateUserProfile, logout, isModerator, isAdmin, changeUserRoleInFirestore } = useApp();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cedula, setCedula] = useState('');
  const [email, setEmail] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleType, setVehicleType] = useState<'Moto' | 'Auto'>('Moto');
  const [roleUpdating, setRoleUpdating] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setCedula(currentUser.cedula || '');
      setEmail(currentUser.email || '');
      if (currentUser.vehicle) {
        setVehicleModel(currentUser.vehicle.model || '');
        setVehiclePlate(currentUser.vehicle.plate || '');
        setVehicleColor(currentUser.vehicle.color || '');
        setVehicleType(currentUser.vehicle.type || 'Moto');
      } else {
        setVehicleModel('');
        setVehiclePlate('');
        setVehicleColor('');
        setVehicleType('Moto');
      }
    }
  }, [currentUser]);

  if (!currentUser) return null;

  // Rate-limiting calculation (7 days restriction)
  const hasRestriction = !isModerator && Boolean(currentUser.lastProfileUpdate);
  const timeSinceLastUpdate = currentUser.lastProfileUpdate
    ? Date.now() - currentUser.lastProfileUpdate
    : Infinity;
  const isLocked = hasRestriction && timeSinceLastUpdate < SEVEN_DAYS_MS;

  const nextAllowedTimestamp = (currentUser.lastProfileUpdate || 0) + SEVEN_DAYS_MS;
  const remainingMs = Math.max(0, nextAllowedTimestamp - Date.now());
  const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const remainingHours = Math.floor(
    (remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)
  );

  const formattedUnlockDate = new Date(nextAllowedTimestamp).toLocaleDateString(
    'es-VE',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setFeedback({
        type: 'error',
        text: `No puedes modificar tus datos aún. Espera hasta el ${formattedUnlockDate}.`,
      });
      return;
    }

    if (!name.trim()) {
      setFeedback({ type: 'error', text: 'El nombre completo es obligatorio.' });
      return;
    }

    if (!phone.trim()) {
      setFeedback({ type: 'error', text: 'El número de teléfono es obligatorio.' });
      return;
    }

    try {
      updateUserProfile(currentUser.id, {
        name: name.trim(),
        phone: phone.trim(),
        cedula: cedula.trim(),
        vehicle:
          currentUser.role === 'Repartidor'
            ? {
                model: vehicleModel.trim() || 'Moto Estándar',
                plate: vehiclePlate.trim() || 'S/P',
                color: vehicleColor.trim() || 'Negro',
                type: vehicleType,
              }
            : undefined,
      });

      setFeedback({
        type: 'success',
        text: '¡Perfil actualizado con éxito! Cambios sincronizados.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar los datos.';
      setFeedback({ type: 'error', text: msg });
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col space-y-4 animate-in fade-in duration-200">
      {/* Header bar with Back button to Home */}
      <div className="flex items-center justify-between p-4 bg-slate-900/90 rounded-3xl border border-cyan-500/25 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToHome}
            aria-label="Volver al Inicio"
            className="w-9 h-9 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-black text-white leading-tight">
              Mi Perfil
            </h1>
            <span className="text-[11px] text-slate-400">
              Gestión independiente de tu cuenta
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          aria-label="Cerrar sesión"
          className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Salir</span>
        </button>
      </div>

      {/* User Hero Identity Card */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-slate-900 via-[#0b111e] to-slate-900 border border-cyan-500/30 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-emerald-400 p-[2.5px] shadow-lg shadow-cyan-500/30 shrink-0">
            <div className="w-full h-full bg-[#070b14] rounded-[14px] flex items-center justify-center font-black text-xl text-cyan-300 font-mono">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white leading-tight">
                {currentUser.name}
              </h2>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {currentUser.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{currentUser.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono text-cyan-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                Rol en Firestore: <strong className="text-white">{currentUser.role}</strong>
              </span>
              {(isModerator || isAdmin || isAdminRole(currentUser.role)) && (
                <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-500/40 flex items-center gap-1 font-bold">
                  <ShieldCheck className="w-3 h-3 text-amber-400" /> Admin Activo
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Direct Firestore Role Switcher Card */}
        <div className="mt-3 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              Cambiar Rol Directo en Base de Datos:
            </span>
            {roleUpdating && (
              <span className="text-[10px] text-cyan-300 animate-pulse font-mono">Actualizando...</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={roleUpdating || currentUser.role === 'client'}
              onClick={async () => {
                setRoleUpdating(true);
                await changeUserRoleInFirestore('client');
                setRoleUpdating(false);
              }}
              className={`py-2 px-2 rounded-xl text-center text-xs font-bold transition-all cursor-pointer border ${
                currentUser.role === 'client'
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-400 shadow-sm shadow-cyan-950 ring-1 ring-cyan-400'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              Cliente ('client')
            </button>
            <button
              type="button"
              disabled={roleUpdating || currentUser.role === 'driver'}
              onClick={async () => {
                setRoleUpdating(true);
                await changeUserRoleInFirestore('driver');
                setRoleUpdating(false);
              }}
              className={`py-2 px-2 rounded-xl text-center text-xs font-bold transition-all cursor-pointer border ${
                currentUser.role === 'driver'
                  ? 'bg-blue-950 text-blue-300 border-blue-400 shadow-sm shadow-blue-950 ring-1 ring-blue-400'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              Repartidor ('driver')
            </button>
            <button
              type="button"
              disabled={roleUpdating || currentUser.role === 'admin'}
              onClick={async () => {
                setRoleUpdating(true);
                await changeUserRoleInFirestore('admin');
                setRoleUpdating(false);
              }}
              className={`py-2 px-2 rounded-xl text-center text-xs font-bold transition-all cursor-pointer border ${
                currentUser.role === 'admin'
                  ? 'bg-amber-950 text-amber-300 border-amber-400 shadow-sm shadow-amber-950 ring-1 ring-amber-400'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              Admin ('admin')
            </button>
          </div>
        </div>
      </div>

      {/* 7-Days Restriction Banner */}
      {isLocked && (
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-2.5 shadow-sm">
          <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-snug">
            <span className="font-bold text-amber-300 block">
              Edición protegida por 7 días
            </span>
            Podrás volver a actualizar tus datos en{' '}
            <strong className="text-white">
              {remainingDays}d {remainingHours}h
            </strong>{' '}
            ({formattedUnlockDate}). Esta medida protege la seguridad y moderación en Valle de la Pascua.
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center gap-2 text-xs font-bold animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/50 border-rose-500/50 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Editable Form */}
      <form onSubmit={handleSubmit} className="p-4 bg-slate-900/90 rounded-3xl border border-cyan-500/20 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-xs font-black uppercase text-slate-300 tracking-wider">
            Información Personal
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            ID: #{currentUser.id}
          </span>
        </div>

        {/* Nombre */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
            Nombre y Apellido
          </label>
          <input
            type="text"
            disabled={isLocked}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 disabled:opacity-60 rounded-2xl px-3.5 py-2.5 text-sm text-white outline-none"
            placeholder="Ej. Juan Pérez"
            required
          />
        </div>

        {/* Teléfono */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-cyan-400" />
            Teléfono de Contacto (Venezuela)
          </label>
          <input
            type="text"
            disabled={isLocked}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 disabled:opacity-60 rounded-2xl px-3.5 py-2.5 text-sm text-white outline-none font-mono"
            placeholder="Ej. 0414-1234567"
            required
          />
        </div>

        {/* Cédula */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <IdCard className="w-3.5 h-3.5 text-cyan-400" />
            Cédula de Identidad
          </label>
          <input
            type="text"
            disabled={isLocked}
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 disabled:opacity-60 rounded-2xl px-3.5 py-2.5 text-sm text-white outline-none font-mono"
            placeholder="Ej. V-25.123.456"
          />
        </div>

        {/* Correo Electrónico (Solo lectura para seguridad) */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-500" />
            Correo Electrónico (Registrado)
          </label>
          <input
            type="email"
            disabled
            value={email}
            className="w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl px-3.5 py-2.5 text-sm text-slate-400 outline-none cursor-not-allowed font-mono"
          />
        </div>

        {/* Datos de Vehículo (Si es Repartidor) */}
        {isDriverRole(currentUser.role) && (
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <span className="text-xs font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
              <Bike className="w-4 h-4 text-cyan-400" />
              Datos del Vehículo de Trabajo
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">
                  Modelo de Moto
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 disabled:opacity-60 rounded-2xl px-3 py-2 text-xs text-white outline-none"
                  placeholder="Ej. Bera SBR 150"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">
                  Placa
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 disabled:opacity-60 rounded-2xl px-3 py-2 text-xs text-white outline-none font-mono"
                  placeholder="Ej. AA1B23C"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">
                Color
              </label>
              <input
                type="text"
                disabled={isLocked}
                value={vehicleColor}
                onChange={(e) => setVehicleColor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 disabled:opacity-60 rounded-2xl px-3 py-2 text-xs text-white outline-none"
                placeholder="Ej. Azul / Negro"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLocked}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
              isLocked
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 active:scale-98 text-slate-950 shadow-cyan-500/25'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Guardar Cambios de Perfil</span>
          </button>
        </div>
      </form>

      {/* Return to Home footer link */}
      <button
        type="button"
        onClick={onBackToHome}
        className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer border border-slate-800"
      >
        ← Volver a la Pantalla de Inicio
      </button>
    </div>
  );
};
