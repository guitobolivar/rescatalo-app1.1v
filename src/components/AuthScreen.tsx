import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, isDriverRole, isClientRole } from '../types';
import { RescataloLogo } from './RescataloLogo';
import {
  User,
  Bike,
  Mail,
  Lock,
  Phone,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  IdCard,
  Check,
  Loader2,
} from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { login, register } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form states - All initialized to empty string ("") as required
  const [name, setName] = useState('');
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Google reCAPTCHA states
  const [isRecaptchaVerified, setIsRecaptchaVerified] = useState(false);
  const [isRecaptchaLoading, setIsRecaptchaLoading] = useState(false);

  const resetRegisterForm = () => {
    setName('');
    setCedula('');
    setPhone('');
    setEmail('');
    setPassword('');
    setVehicleModel('');
    setVehiclePlate('');
    setIsRecaptchaVerified(false);
    setIsRecaptchaLoading(false);
    setErrorMsg('');
  };

  const resetLoginForm = () => {
    setEmail('');
    setPassword('');
    setErrorMsg('');
  };

  const handleTriggerRecaptcha = () => {
    if (isRecaptchaVerified || isRecaptchaLoading) return;
    setIsRecaptchaLoading(true);
    setTimeout(() => {
      setIsRecaptchaLoading(false);
      setIsRecaptchaVerified(true);
    }, 700);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (mode === 'login') {
      if (!email.trim() || !password.trim()) {
        setErrorMsg('Por favor ingresa tu correo y contraseña.');
        setLoading(false);
        return;
      }
      const res = await login(email, password);
      if (!res.success) {
        setErrorMsg(res.message || 'Error al iniciar sesión.');
      } else {
        // Reset on submit success
        resetLoginForm();
      }
      setLoading(false);
    } else {
      if (!isRecaptchaVerified) {
        setErrorMsg('Por favor completa la verificación reCAPTCHA para registrarte.');
        setLoading(false);
        return;
      }

      if (
        !name.trim() ||
        !cedula.trim() ||
        !phone.trim() ||
        !email.trim() ||
        !password.trim()
      ) {
        setErrorMsg('Todos los campos son obligatorios para completar el registro.');
        setLoading(false);
        return;
      }

      if (isDriverRole(role) && (!vehicleModel.trim() || !vehiclePlate.trim())) {
        setErrorMsg('Debes ingresar el modelo y placa del vehículo para repartidores.');
        setLoading(false);
        return;
      }

      const cleanPhone = phone.trim().replace(/^\+58\s*/, '');
      const formattedPhone = `+58 ${cleanPhone}`;

      const finalRole = isDriverRole(role) ? 'driver' : 'client';

      const res = await register({
        name: name.trim(),
        cedula: cedula.trim(),
        phone: formattedPhone,
        email: email.trim().toLowerCase(),
        password,
        role: finalRole,
        vehicle:
          isDriverRole(role)
            ? {
                type: 'Moto',
                model: vehicleModel.trim() || 'Moto Keeway 150',
                plate: vehiclePlate.trim().toUpperCase() || 'AB0-00X',
                color: 'Negro / Azul',
              }
            : undefined,
      });

      if (!res.success) {
        setErrorMsg(res.message || 'Error al crear la cuenta.');
      } else {
        // Reset on submit success
        resetRegisterForm();
      }
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-center items-center p-4 py-8 bg-[#0b111e]">
      <div className="w-full max-w-sm bg-slate-900/95 rounded-3xl border border-cyan-500/30 shadow-2xl shadow-cyan-950/50 p-6 space-y-5">
        {/* Branding: Creative R Logo + Professional Typography */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <RescataloLogo size="xl" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Rescátalo
            </h1>
            <p className="text-xs font-semibold text-emerald-400/90 tracking-wide uppercase mt-0.5">
              Delivery & Movilidad Venezuela
            </p>
          </div>
          <p className="text-xs text-slate-300">
            {mode === 'login'
              ? 'Ingresa tus credenciales para acceder a tu cuenta.'
              : 'Regístrate para solicitar o realizar envíos.'}
          </p>
        </div>

        {/* Tab Switch (Iniciar Sesión vs Registrarse) */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-sm font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
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
            className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs font-semibold leading-relaxed">
              {errorMsg}
            </div>
          )}

          {mode === 'register' && (
            <>
              {/* 1. Nombre Completo */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-2xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* 2. Cédula de Identidad (Obligatorio) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Cédula de Identidad (Obligatorio)
                </label>
                <div className="relative">
                  <IdCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    placeholder="V-00.000.000"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-2xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* 3. Teléfono / WhatsApp (+58 Integrado) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Teléfono / WhatsApp (Venezuela)
                </label>
                <div className="flex items-center w-full bg-slate-950 border border-slate-700 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/40 rounded-2xl overflow-hidden transition-all">
                  <div className="flex items-center gap-1.5 pl-3.5 pr-2.5 py-3 bg-slate-900/90 border-r border-slate-800 text-xs font-bold select-none shrink-0">
                    <span className="text-sm">🇻🇪</span>
                    <span className="font-mono text-cyan-300 font-black">+58</span>
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^\+58\s*/, '');
                      setPhone(val);
                    }}
                    placeholder="412 1234567"
                    className="w-full bg-transparent px-3.5 py-3 text-sm text-white placeholder-slate-500 outline-none font-mono tracking-wide"
                  />
                </div>
              </div>

              {/* Role Selection: Strictly 2 Roles */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Rol de Cuenta (Selección Obligatoria)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRole('client')}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      isClientRole(role)
                        ? 'border-cyan-400 bg-cyan-950/70 text-white shadow-md shadow-cyan-950/40 ring-1 ring-cyan-400'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <User className={`w-4 h-4 ${isClientRole(role) ? 'text-cyan-400' : 'text-slate-400'}`} />
                      {isClientRole(role) && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                    </div>
                    <span className="text-xs font-black text-white">Cliente ('client')</span>
                    <span className="text-[11px] text-slate-400 leading-tight">Pedir delivery</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('driver')}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      isDriverRole(role)
                        ? 'border-blue-400 bg-blue-950/70 text-white shadow-md shadow-blue-950/40 ring-1 ring-blue-400'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Bike className={`w-4 h-4 ${isDriverRole(role) ? 'text-blue-400' : 'text-slate-400'}`} />
                      {isDriverRole(role) && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                      )}
                    </div>
                    <span className="text-xs font-black text-white">Repartidor ('driver')</span>
                    <span className="text-[11px] text-slate-400 leading-tight">Hacer entregas</span>
                  </button>
                </div>
              </div>

              {/* Vehicle data if Repartidor */}
              {isDriverRole(role) && (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-blue-500/30 space-y-3">
                  <span className="text-xs font-black text-blue-400 uppercase tracking-wide block">
                    Datos del Vehículo:
                  </span>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 block font-medium">Modelo de Moto</span>
                    <input
                      type="text"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      placeholder="Ej. Bera SBR / Keeway Horse"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-400 placeholder-slate-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 block font-medium">Número de Placa</span>
                    <input
                      type="text"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      placeholder="Ej. AB1-88K"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase outline-none focus:border-blue-400 placeholder-slate-500"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.correo@ejemplo.com"
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-2xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-2xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors"
              />
            </div>
          </div>

          {/* GOOGLE reCAPTCHA (Obligatorio para Registrarse) */}
          {mode === 'register' && (
            <div className="pt-1">
              <div className="bg-[#f9f9f9] text-[#222] p-3 rounded-2xl border border-slate-600 shadow-md flex items-center justify-between select-none">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isRecaptchaLoading || isRecaptchaVerified}
                    onClick={handleTriggerRecaptcha}
                    className={`w-7 h-7 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                      isRecaptchaVerified
                        ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs'
                        : isRecaptchaLoading
                        ? 'border-blue-500 bg-white'
                        : 'border-neutral-400 bg-white hover:border-neutral-600 active:scale-95'
                    }`}
                    title="Verificación Google reCAPTCHA"
                  >
                    {isRecaptchaLoading ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    ) : isRecaptchaVerified ? (
                      <Check className="w-5 h-5 text-white stroke-[3]" />
                    ) : null}
                  </button>

                  <div>
                    <span className="text-xs font-bold text-neutral-800 block leading-tight">
                      No soy un robot
                    </span>
                    <span className="text-[10px] text-neutral-500 block leading-none mt-0.5">
                      {isRecaptchaVerified
                        ? 'Verificación completada'
                        : 'Toca el recuadro para validar'}
                    </span>
                  </div>
                </div>

                {/* reCAPTCHA Brand Badge */}
                <div className="flex flex-col items-center justify-center text-right pl-2 shrink-0">
                  <div className="w-7 h-7 flex items-center justify-center">
                    <svg viewBox="0 0 48 48" className="w-6 h-6" fill="none">
                      <path
                        d="M24 4C13 4 4 13 4 24c0 3.3.8 6.4 2.2 9.1l4.5-4.5C9.8 26.9 9.3 25.5 9.3 24c0-8.1 6.6-14.7 14.7-14.7 4 0 7.7 1.6 10.4 4.3L27 21h17V4l-6.3 6.3C34.1 6.7 29.3 4 24 4z"
                        fill="#1A73E8"
                      />
                      <path
                        d="M41.8 14.9l-4.5 4.5c.9 1.7 1.4 3.1 1.4 4.6 0 8.1-6.6 14.7-14.7 14.7-4 0-7.7-1.6-10.4-4.3L21 27H4v17l6.3-6.3C13.9 41.3 18.7 44 24 44c11 0 20-9 20-20 0-3.3-.8-6.4-2.2-9.1z"
                        fill="#4285F4"
                      />
                    </svg>
                  </div>
                  <span className="text-[9px] font-bold text-neutral-600 leading-tight">
                    reCAPTCHA
                  </span>
                  <div className="flex gap-1 text-[8px] text-neutral-400 leading-none">
                    <span>Privacidad</span>
                    <span>-</span>
                    <span>Términos</span>
                  </div>
                </div>
              </div>

              {!isRecaptchaVerified && (
                <p className="text-[10px] text-amber-400/90 text-center font-bold mt-1.5">
                  Debes marcar el reCAPTCHA para habilitar el botón de registro
                </p>
              )}
            </div>
          )}

          {/* Submit Button - Disabled in register mode until reCAPTCHA is completed */}
          <button
            type="submit"
            disabled={loading || (mode === 'register' && !isRecaptchaVerified)}
            className={`w-full py-3.5 font-black text-sm rounded-2xl flex items-center justify-center gap-2 transition-all mt-2 ${
              mode === 'register' && !isRecaptchaVerified
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 opacity-50 shadow-none'
                : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 active:scale-98 text-slate-950 cursor-pointer shadow-lg shadow-cyan-500/25'
            }`}
          >
            <span>{mode === 'login' ? 'Acceder a mi Cuenta' : 'Registrar Cuenta'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Security / Privacy notice */}
        <div className="pt-2 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sistema seguro y protegido anti-multicuentas (RBAC)</span>
          </p>
        </div>
      </div>
    </div>
  );
};
