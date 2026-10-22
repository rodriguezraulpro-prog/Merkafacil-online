import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock, Eye, EyeOff, X, KeyRound, AlertCircle } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const SupervisorAuthModal: React.FC = () => {
  const {
    isSupervisorAuthOpen,
    supervisorActionInfo,
    confirmSupervisorAuth,
    closeSupervisorAuth,
  } = useStore();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isSupervisorAuthOpen) {
      setPassword('');
      setErrorMsg('');
      setShowPassword(false);
    }
  }, [isSupervisorAuthOpen]);

  if (!isSupervisorAuthOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Por favor ingrese la contraseña de autorización.');
      return;
    }

    const success = confirmSupervisorAuth(password);
    if (!success) {
      setErrorMsg('Contraseña de Administrador incorrecta.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        id="supervisor-auth-modal"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Autorización Requerida
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Acción restringida para administradores
              </p>
            </div>
          </div>
          <button
            onClick={closeSupervisorAuth}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action description */}
        <div className="my-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center space-x-2 text-slate-700 font-bold text-xs uppercase tracking-wider mb-1">
            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
            <span>Operación:</span>
          </div>
          <p className="text-sm font-black text-slate-900">
            {supervisorActionInfo?.title || 'Modificación del Sistema'}
          </p>
          {supervisorActionInfo?.description && (
            <p className="text-xs text-slate-600 mt-1 font-medium">
              {supervisorActionInfo.description}
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Contraseña de Administrador / Supervisor
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="supervisor-password-input"
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Ingrese clave de seguridad"
                className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-center space-x-1.5 text-rose-600 text-xs font-bold mt-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              Clave predeterminada inicial del sistema: <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded">admin123</span> (personalizable en Ajustes).
            </p>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={closeSupervisorAuth}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="confirm-supervisor-auth-btn"
              className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Autorizar Acción</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
