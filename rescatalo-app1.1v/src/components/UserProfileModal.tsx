import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserRole, UserStatus, isDriverRole, isAdminRole, normalizeRole } from '../types';
import {
  User as UserIcon,
  X,
  Lock,
  Calendar,
  Clock,
  Phone,
  Mail,
  IdCard,
  Bike,
  ShieldCheck,
  Check,
  AlertCircle,
  Save,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: User | null;
  isModeratorEdit?: boolean;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  isModeratorEdit = false,
}) => {
  const { currentUser, updateUserProfile } = useApp();

  // If no target user specified, edit the current session user
  const user = targetUser || currentUser;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cedula, setCedula] = useState('');
  const [email, setEmail] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleType, setVehicleType] = useState<'Moto' | 'Auto'>('Moto');
  const [role, setRole] = useState<UserRole>('Usuario Normal');
  const [status, setStatus] = useState<UserStatus>('Activo');

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setCedula(user.cedula || '');
      setEmail(user.email || '');
      setRole(user.role || 'Usuario Normal');
      setStatus(user.status || 'Activo');
      if (user.vehicle) {
        setVehicleModel(user.vehicle.model || '');
        setVehiclePlate(user.vehicle.plate || '');
        setVehicleColor(user.vehicle.color || '');
        setVehicleType(user.vehicle.type || 'Moto');
      } else {
        setVehicleModel('');
        setVehiclePlate('');
        setVehicleColor('');
        setVehicleType('Moto');
      }
      setFeedback(null);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  // Check 7-day rate-limiting restriction
  const hasRestriction = !isModeratorEdit && Boolean(user.lastProfileUpdate);
  const timeSinceLastUpdate = user.lastProfileUpdate
    ? Date.now() - user.lastProfileUpdate
    : Infinity;
  const isLocked = hasRestriction && timeSinceLastUpdate < SEVEN_DAYS_MS;

  const nextAllowedTimestamp = (user.lastProfileUpdate || 0) + SEVEN_DAYS_MS;
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

    const updatedData: Partial<User> = {
      name: name.trim(),
      phone: phone.trim(),
      cedula: cedula.trim(),
      email: email.trim(),
    };

    if (isModeratorEdit) {
      updatedData.role = normalizeRole(role);
      updatedData.status = status;
    }

    if (isDriverRole(role) || isDriverRole(user.role)) {
      updatedData.vehicle = {
        model: vehicleModel.trim() || 'Empire Keeway Horse 150',
        plate: vehiclePlate.trim().toUpperCase() || 'AC5-49X',
        color: vehicleColor.trim() || 'Negro',
        type: vehicleType,
      };
    }

    const res = updateUserProfile(user.id, updatedData, isModeratorEdit);
    if (res.success) {
      setFeedback({ type: 'success', text: res.message });
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              {isModeratorEdit ? (
                <ShieldCheck className="w-5 h-5 text-amber-400" />
              ) : (
                <UserIcon className="w-5 h-5 text-cyan-400" />
              )}
            </div>
            <div>
              <h3 className="text-base font-black text-white leading-tight">
                {isModeratorEdit
                  ? `Detalles de Perfil (Moderador)`
                  : 'Mi Perfil de Usuario'}
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-[220px]">
                {user.email}
              </p>
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Moderator Unrestricted Badge */}
          {isModeratorEdit && (
            <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Acceso de Moderador:</strong> Puedes modificar cualquier campo de este usuario en cualquier momento sin bloqueo semanal.
              </span>
            </div>
          )}

          {/* 7-Day Restriction Banner (When locked) */}
          {isLocked && (
            <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-500/50 text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-black text-amber-300">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Edición Bloqueada (1 vez por semana)</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Por seguridad de la plataforma, los datos personales solo pueden modificarse una vez cada 7 días.
              </p>
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-amber-500/30 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Faltan {remainingDays} días y {remainingHours} horas
                  </span>
                </div>
                <span className="text-slate-400 text-[10px]">
                  Desbloqueo: {new Date(nextAllowedTimestamp).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          {/* Unlocked notice */}
          {!isLocked && !isModeratorEdit && (
            <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-[11px] flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                Al guardar cambios, se aplicará una restricción de 7 días antes de la próxima edición.
              </span>
            </div>
          )}

          {/* Feedback alert */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/60 border border-rose-500/50 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Field: Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">
              Nombre y Apellido
            </label>
            <input
              type="text"
              disabled={isLocked}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed rounded-2xl px-3.5 py-2.5 text-sm text-white outline-none"
            />
          </div>

          {/* Field: Phone */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-cyan-400" />
              Número de Teléfono (WhatsApp)
            </label>
            <input
              type="text"
              disabled={isLocked}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+58 412 000 0000"
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed rounded-2xl px-3.5 py-2.5 text-sm text-white outline-none font-mono"
            />
          </div>

          {/* Field: Cédula */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
              <IdCard className="w-3.5 h-3.5 text-cyan-400" />
              Cédula de Identidad
            </label>
            <input
              type="text"
              disabled={isLocked}
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="V-12.345.678"
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed rounded-2xl px-3.5 py-2.5 text-sm text-white outline-none"
            />
          </div>

          {/* Field: Email */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              Correo Electrónico
            </label>
            <input
              type="email"
              disabled={isLocked || !isModeratorEdit} // Users cannot change their login email directly
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed rounded-2xl px-3.5 py-2.5 text-sm text-white outline-none"
            />
            {!isModeratorEdit && (
              <span className="text-[10px] text-slate-500 block">
                El correo está vinculado al inicio de sesión y no puede modificarse directamente.
              </span>
            )}
          </div>

          {/* Moderator Specific Options: Role and Status */}
          {isModeratorEdit && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Rol en Firestore</label>
                <select
                  value={normalizeRole(role)}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
                >
                  <option value="client">Cliente ('client')</option>
                  <option value="driver">Repartidor ('driver')</option>
                  <option value="admin">Administrador ('admin')</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Estatus</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as UserStatus)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
                >
                  <option value="Activo">Activo</option>
                  <option value="Suspendido">Suspendido</option>
                </select>
              </div>
            </div>
          )}

          {/* Vehicle Information (If Driver) */}
          {(isDriverRole(role) || isDriverRole(user.role)) && (
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-cyan-500/20 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 uppercase tracking-wide">
                <Bike className="w-4 h-4 text-cyan-400" />
                <span>Datos del Vehículo de Reparto</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Modelo</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="Ej. Empire Keeway 150"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Placa</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    placeholder="Ej. AC5-49X"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none uppercase font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Color</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={vehicleColor}
                    onChange={(e) => setVehicleColor(e.target.value)}
                    placeholder="Ej. Azul Eléctrico"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Tipo</label>
                  <select
                    disabled={isLocked}
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as 'Moto' | 'Auto')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="Moto">Moto</option>
                    <option value="Auto">Auto</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Submit Actions */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLocked}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                isLocked
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : isModeratorEdit
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 cursor-pointer active:scale-98 shadow-amber-500/25'
                  : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 cursor-pointer active:scale-98 shadow-cyan-500/25'
              }`}
            >
              {isLocked ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Edición no disponible (Bloqueo de 7 días)</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>
                    {isModeratorEdit ? 'Guardar Cambios (Moderador)' : 'Guardar y Aplicar Cambios'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
