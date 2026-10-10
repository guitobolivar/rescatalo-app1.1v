import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, isClientRole, isDriverRole } from '../types';
import { RescataloLogo } from './RescataloLogo';
import { User, Bike, Mail, Lock, Phone, ArrowRight, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const { login, register } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+58 ');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  const [vehicleModel, setVehicleModel] = useState('Empire Keeway Horse 150');
  const [vehiclePlate, setVehiclePlate] = useState('AC5-49X');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (mode === 'login') {
      const res = await login(email, password);
      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.message || 'Error al iniciar sesión');
      }
    } else {
      if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
        setErrorMsg('Todos los campos son obligatorios');
        return;
      }

      const res = await register({
        name: name.trim(),
        phone: `+58 ${phone.trim().replace(/^\+58\s*/, '')}`,
        email: email.trim().toLowerCase(),
        password,
        role: isDriverRole(role) ? 'driver' : 'client',
        vehicle:
          isDriverRole(role)
            ? {
                type: 'Moto',
                model: vehicleModel,
                plate: vehiclePlate,
                color: 'Negro / Azul',
              }
            : undefined,
      });

      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.message || 'Error al registrarse');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-[94%] max-w-sm mx-auto bg-slate-900 rounded-3xl shadow-2xl border border-cyan-500/30 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-950 px-4 py-3.5 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <RescataloLogo size="sm" />
            <div>
              <h3 className="text-xs font-black text-white tracking-tight">
                {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </h3>
              <p className="text-[10px] text-cyan-400 font-bold uppercase">Rescátalo Venezuela</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-3 pt-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-black border-b-2 text-center transition-colors cursor-pointer ${
              mode === 'login'
                ? 'border-cyan-400 text-cyan-300 bg-slate-900 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-black border-b-2 text-center transition-colors cursor-pointer ${
              mode === 'register'
                ? 'border-cyan-400 text-cyan-300 bg-slate-900 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-3.5 space-y-3 overflow-y-auto no-scrollbar">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-[11px] font-bold">
              {errorMsg}
            </div>
          )}

          {mode === 'register' && (
            <>
              {/* Selección Obligatoria de Rol (ÚNICAMENTE DOS ROLES) */}
              <div>
                <label className="block text-[10px] font-black text-slate-300 mb-1 uppercase">
                  Rol Obligatorio
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('client')}
                    className={`p-2 rounded-xl border text-left flex items-center gap-1.5 cursor-pointer ${
                      isClientRole(role)
                        ? 'border-cyan-400 bg-cyan-950/70 text-white font-bold'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <User className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <span className="block text-[11px] font-bold">Cliente</span>
                      <span className="block text-[9px] text-slate-400">('client')</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('driver')}
                    className={`p-2 rounded-xl border text-left flex items-center gap-1.5 cursor-pointer ${
                      isDriverRole(role)
                        ? 'border-blue-400 bg-blue-950/70 text-white font-bold'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <Bike className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <span className="block text-[11px] font-bold">Repartidor</span>
                      <span className="block text-[9px] text-slate-400">('driver')</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-[10px] font-black text-slate-300 mb-0.5">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl text-xs font-semibold text-white outline-none"
                  required
                />
              </div>

              {/* Teléfono (+58 Integrado) */}
              <div>
                <label className="block text-[10px] font-black text-slate-300 mb-1">Teléfono / WhatsApp</label>
                <div className="flex items-center w-full bg-slate-950 border border-slate-700 focus-within:border-cyan-400 rounded-xl overflow-hidden transition-all">
                  <div className="flex items-center gap-1 pl-2.5 pr-2 py-2 bg-slate-900 border-r border-slate-800 text-[11px] font-bold select-none shrink-0">
                    <span className="text-xs">🇻🇪</span>
                    <span className="font-mono text-cyan-300 font-black">+58</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^\+58\s*/, '');
                      setPhone(val);
                    }}
                    placeholder="412 1234567"
                    className="w-full px-2.5 py-2 bg-transparent text-xs font-semibold text-white outline-none font-mono"
                    required
                  />
                </div>
              </div>

              {role === 'Repartidor' && (
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-0.5">Moto/Auto</label>
                    <input
                      type="text"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-0.5">Placa</label>
                    <input
                      type="text"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] uppercase text-white outline-none"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Correo */}
          <div>
            <label className="block text-[10px] font-black text-slate-300 mb-0.5">Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl text-xs font-semibold text-white outline-none"
              required
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-[10px] font-black text-slate-300 mb-0.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl text-xs font-semibold text-white outline-none"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
          >
            <span>{mode === 'login' ? 'Entrar' : 'Completar Registro'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
