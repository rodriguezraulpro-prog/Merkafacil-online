import React, { useState } from 'react';
import { 
  Lock, 
  LogIn, 
  X, 
  Shield, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Store, 
  MessageCircle, 
  Mail, 
  Headphones, 
  Check, 
  Copy,
  ChevronDown,
  ChevronUp,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Key
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const LoginModal: React.FC = () => {
  const {
    currentUser,
    login,
    isLoginModalOpen,
    setIsLoginModalOpen,
    settings,
    resetCredentialsWithMasterSupportKey,
  } = useStore();

  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSupportInfo, setShowSupportInfo] = useState(true);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Master Support Key Recovery State
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [masterSupportKeyInput, setMasterSupportKeyInput] = useState('');
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');
  const [isSubmittingRecovery, setIsSubmittingRecovery] = useState(false);

  if (currentUser && !isLoginModalOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!passwordInput.trim()) {
      setErrorMsg('Por favor ingrese su contraseña o PIN de acceso.');
      return;
    }

    const res = login('user-admin', passwordInput);
    if (res.success) {
      setPasswordInput('');
      setErrorMsg('');
    } else {
      setErrorMsg(res.error || 'Contraseña incorrecta.');
    }
  };

  const handleSupportRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoverySuccess('');

    if (!masterSupportKeyInput.trim()) {
      setRecoveryError('Por favor ingrese la Clave Maestra de Soporte Técnico.');
      return;
    }

    setIsSubmittingRecovery(true);
    try {
      const res = await resetCredentialsWithMasterSupportKey(masterSupportKeyInput.trim());
      if (!res.success) {
        setRecoveryError(res.error || 'Clave Maestra de Soporte no válida.');
      } else {
        setRecoverySuccess('¡Credenciales restablecidas exitosamente! Clave: admin123 | PIN: 1234. Iniciando sesión...');
        setTimeout(() => {
          setIsRecoveryMode(false);
          setMasterSupportKeyInput('');
          setRecoverySuccess('');
        }, 1500);
      }
    } catch (err: any) {
      setRecoveryError(err.message || 'Error inesperado al restablecer credenciales.');
    } finally {
      setIsSubmittingRecovery(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('rodriguezraul.pro@gmail.com');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText('+584124623396');
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        id="login-modal"
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Friendly Header with Merkafacil Branding */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                ¡Bienvenido a Merkafacil!
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Ingrese sus credenciales para iniciar sesión
              </p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200/90 text-slate-500 flex items-center justify-center shrink-0" title="Acceso seguro al sistema">
            <Lock className="w-4 h-4 text-emerald-600" />
          </div>
        </div>

        {/* Store tag if customized */}
        {settings.name && settings.name !== 'Merkafacil' && (
          <div className="mt-3.5 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Sucursal / Local:</span>
            <span className="font-black text-slate-800">{settings.name}</span>
          </div>
        )}

        {/* Credentials Form or Emergency Support Recovery Form */}
        {isRecoveryMode ? (
          <form onSubmit={handleSupportRecoverySubmit} className="space-y-4 mt-4 animate-in fade-in duration-150">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5">
              <div className="flex items-center space-x-2 text-amber-900 font-extrabold text-xs">
                <KeyRound className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Restablecimiento con Clave Maestra de Soporte</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Si olvidó su contraseña o PIN, contacte al desarrollador/soporte para obtener la <strong>Clave Maestra de Emergencia</strong>. Al ingresarla, el sistema restablecerá sus credenciales automáticamente a los valores seguros predeterminados (<strong>admin123</strong> / PIN <strong>1234</strong>) sin tocar sus productos, créditos ni ventas registradas.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Clave Maestra de Soporte Técnico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  id="master-recovery-input"
                  type={showMasterKey ? 'text' : 'password'}
                  autoFocus
                  value={masterSupportKeyInput}
                  onChange={(e) => {
                    setMasterSupportKeyInput(e.target.value);
                    if (recoveryError) setRecoveryError('');
                  }}
                  placeholder="Ingrese la clave maestra de soporte"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowMasterKey(!showMasterKey)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showMasterKey ? 'Ocultar' : 'Mostrar'}
                >
                  {showMasterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {recoveryError && (
                <div className="flex items-center space-x-1.5 text-rose-600 text-xs font-bold mt-2 bg-rose-50 border border-rose-200 p-2.5 rounded-xl animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{recoveryError}</span>
                </div>
              )}

              {recoverySuccess && (
                <div className="flex items-center space-x-1.5 text-emerald-800 text-xs font-bold mt-2 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{recoverySuccess}</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsRecoveryMode(false);
                  setRecoveryError('');
                  setMasterSupportKeyInput('');
                }}
                className="flex-1 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
              >
                Volver a Iniciar Sesión
              </button>
              <button
                type="submit"
                disabled={isSubmittingRecovery}
                className="flex-1 py-3 text-xs font-black bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 text-white rounded-xl shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${isSubmittingRecovery ? 'animate-spin' : ''}`} />
                <span>{isSubmittingRecovery ? 'Restableciendo...' : 'Restablecer y Desbloquear'}</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Contraseña o PIN de Administrador
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Ingrese su contraseña o PIN"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'Ocultar clave' : 'Mostrar clave'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {errorMsg && (
                <div className="flex items-center space-x-1.5 text-rose-600 text-xs font-bold mt-2 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Default Password Notice */}
              <div className="mt-3 text-[11px] text-amber-900 bg-amber-50/90 border border-amber-200 p-3 rounded-xl flex items-start space-x-2">
                <span className="font-black text-amber-800 shrink-0">💡 Nota:</span>
                <span className="leading-relaxed">
                  La clave predeterminada es <code className="font-black text-amber-950 bg-amber-200/70 px-1.5 py-0.5 rounded">admin123</code> (o PIN <code className="font-black text-amber-950 bg-amber-200/70 px-1.5 py-0.5 rounded">1234</code>). Puede modificarla en la pestaña <strong>Ajustes</strong>.
                </span>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                id="submit-login-btn"
                className="w-full py-3.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Iniciar Sesión</span>
              </button>
            </div>

            {/* Quick Emergency Recovery Trigger Link */}
            <div className="text-center pt-1">
              <button
                type="button"
                id="forgot-password-recovery-btn"
                onClick={() => {
                  setIsRecoveryMode(true);
                  setErrorMsg('');
                  setRecoveryError('');
                  setRecoverySuccess('');
                  setShowSupportInfo(true);
                }}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-800 hover:text-amber-900 hover:underline cursor-pointer transition-colors p-1"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                <span>¿Olvidó su contraseña? Desbloqueo por Soporte Técnico</span>
              </button>
            </div>
          </form>
        )}

        {/* Technical Support Section */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-600 font-medium">
              ¿Tienes algún problema? Contacte con soporte
            </p>
            <button
              type="button"
              id="toggle-support-btn"
              onClick={() => setShowSupportInfo(!showSupportInfo)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>{showSupportInfo ? 'Ocultar' : 'Ver Contacto'}</span>
              {showSupportInfo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showSupportInfo && (
            <div 
              id="support-contact-card"
              className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Soporte Técnico Especializado</span>
                </span>
                <span className="text-[10px] uppercase font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  Disponible
                </span>
              </div>

              {/* WhatsApp Button */}
              <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-xl border border-slate-200">
                <a
                  href="https://wa.me/584124623396"
                  target="_blank"
                  rel="noopener noreferrer"
                  id="support-whatsapp-link"
                  className="flex items-center space-x-2 text-xs font-bold text-slate-800 hover:text-emerald-700 transition-colors flex-1"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div className="leading-tight">
                    <span className="block text-[10px] text-slate-400 font-medium">WhatsApp</span>
                    <span className="font-black text-slate-900">+58 412-4623396</span>
                  </div>
                </a>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Copiar número de WhatsApp"
                >
                  {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Email Button */}
              <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-xl border border-slate-200">
                <a
                  href="mailto:rodriguezraul.pro@gmail.com"
                  id="support-email-link"
                  className="flex items-center space-x-2 text-xs font-bold text-slate-800 hover:text-emerald-700 transition-colors flex-1 truncate"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="leading-tight truncate">
                    <span className="block text-[10px] text-slate-400 font-medium">Correo Electrónico</span>
                    <span className="font-black text-slate-900 truncate block">rodriguezraul.pro@gmail.com</span>
                  </div>
                </a>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Copiar correo"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {/* Discreet Developer Credits */}
          <div className="mt-5 pt-3.5 border-t border-slate-100 text-center text-[11px] text-slate-400">
            <span>Sistema creado por <strong className="font-bold text-slate-600">Educom-tec</strong></span>
            <span className="mx-1.5 text-slate-300">•</span>
            <a
              href="mailto:rodriguezraul.pro@gmail.com"
              className="text-slate-500 hover:text-emerald-600 font-semibold transition-colors"
            >
              rodriguezraul.pro@gmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
