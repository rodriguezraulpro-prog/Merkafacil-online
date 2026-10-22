import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, X, ShieldAlert, KeyRound, ArrowRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const SettingsAuthModal: React.FC = () => {
  const {
    isSettingsAuthModalOpen,
    setIsSettingsAuthModalOpen,
    unlockSettings,
    settings,
  } = useStore();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isSettingsAuthModalOpen) {
      setPassword('');
      setErrorMsg('');
      setShowPassword(false);
    }
  }, [isSettingsAuthModalOpen]);

  if (!isSettingsAuthModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Por favor ingrese la contraseña de Administrador.');
      return;
    }

    const res = unlockSettings(password);
    if (!res.success) {
      setErrorMsg(res.error || 'Contraseña de Administrador incorrecta.');
    }
  };

  const handleClose = () => {
    setIsSettingsAuthModalOpen(false);
    setPassword('');
    setErrorMsg('');
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div 
        id="settings-auth-modal"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 relative"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Módulo Protegido
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Configuración del Sistema
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            id="close-settings-auth-btn"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Cancelar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Alert Note */}
        <div className="my-4 p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-950 leading-snug">
              Acceso restringido para Administrador
            </p>
            <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
              Ingrese la contraseña de Administrador para modificar tasas de cambio, datos del negocio, copias de seguridad y opciones del sistema.
            </p>
          </div>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Contraseña de Administrador
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="settings-admin-password-input"
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Ingrese su clave..."
                className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                  errorMsg 
                    ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30' 
                    : 'border-slate-200 focus:ring-emerald-500 focus:bg-white'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {errorMsg && (
              <p className="text-xs font-bold text-rose-600 mt-2 flex items-center space-x-1">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </p>
            )}

            {/* Hint for initial default password */}
            {(!settings.adminPassword || settings.adminPassword === 'admin123') && (
              <p className="text-[11px] text-slate-400 mt-2">
                Clave por defecto: <span className="font-mono font-bold text-slate-600">admin123</span>
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="submit-settings-auth-btn"
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <span>Acceder</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
