import React, { useState, useEffect } from 'react';
import {
  Database,
  Key,
  Save,
  Copy,
  Check,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ExternalLink,
  Code2,
  Server,
  Sparkles,
  BookOpen,
  CloudOff,
  UploadCloud,
  DownloadCloud,
  Smartphone,
  Wifi,
  Wrench,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { api } from '../../services/api';
import { SUPABASE_SQL_SCRIPT } from '../../data/supabaseSqlScript';

export const SupabaseDatabaseView: React.FC = () => {
  const {
    products,
    categories,
    customers,
    credits,
    payables,
    sales,
    movements,
    shifts,
    currentShift,
    users,
    settings,
    isSettingsUnlocked,
    unlockSettings,
    lockSettings,
    setActiveTab,
    refreshState,
  } = useStore();

  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>(undefined);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  const [isTesting, setIsTesting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Discreet Technical Support section state (hidden by default)
  const [showSupportPanel, setShowSupportPanel] = useState(false);

  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedPairingLink, setCopiedPairingLink] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // Inline password unlock if user navigated directly without unlocking
  const [inlinePassword, setInlinePassword] = useState('');
  const [showInlinePassword, setShowInlinePassword] = useState(false);
  const [inlineError, setInlineError] = useState('');

  useEffect(() => {
    let mounted = true;
    setIsLoadingConfig(true);
    api
      .getSupabaseConfig()
      .then((cfg) => {
        if (!mounted) return;
        setSupabaseUrl(cfg.url || '');
        setSupabaseAnonKey(cfg.anonKey || '');
        setIsConnected(Boolean(cfg.isConnected));
        setLastSyncAt(cfg.lastSyncAt);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoadingConfig(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleInlineUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlinePassword.trim()) {
      setInlineError('Por favor ingrese la contraseña de Administrador.');
      return;
    }
    const res = unlockSettings(inlinePassword);
    if (!res.success) {
      setInlineError(res.error || 'Contraseña incorrecta.');
    } else {
      setInlinePassword('');
      setInlineError('');
    }
  };

  if (!isSettingsUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 px-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 text-center animate-in fade-in zoom-in-95">
          <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl mx-auto flex items-center justify-center shadow-xs mb-4">
            <Database className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-1">
            Base de Datos (Nube)
          </h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Se requiere autorización de Administrador para gestionar la sincronización en la nube y la vinculación de dispositivos.
          </p>

          <form onSubmit={handleInlineUnlock} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Contraseña de Administrador:
              </label>
              <div className="relative">
                <input
                  type={showInlinePassword ? 'text' : 'password'}
                  autoFocus
                  value={inlinePassword}
                  onChange={(e) => {
                    setInlinePassword(e.target.value);
                    if (inlineError) setInlineError('');
                  }}
                  placeholder="Ingrese su clave..."
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowInlinePassword(!showInlinePassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showInlinePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {inlineError && (
                <p className="text-xs font-bold text-rose-600 mt-1.5 flex items-center space-x-1">
                  <span>⚠️</span>
                  <span>{inlineError}</span>
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('pos')}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer text-center"
              >
                Volver al POS
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-colors cursor-pointer text-center shadow-xs"
              >
                Desbloquear Módulo
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Quick user action: Test active connection
  const handleQuickTestConnection = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setFeedback({
        type: 'warning',
        message:
          'No hay una conexión en la nube configurada actualmente. Solicita a Soporte Técnico configurar las credenciales en el apartado inferior.',
      });
      return;
    }

    setIsTesting(true);
    setFeedback(null);
    try {
      const res = await api.connectSupabase(supabaseUrl.trim(), supabaseAnonKey.trim());
      if (res.success) {
        setIsConnected(true);
        if (res.config?.lastSyncAt) setLastSyncAt(res.config.lastSyncAt);
        setFeedback({
          type: 'success',
          message:
            res.message ||
            `¡Conexión con la nube verificada exitosamente${res.latencyMs ? ` (${res.latencyMs}ms)` : ''}! La sincronización está activa.`,
        });
        await refreshState();
      } else {
        setFeedback({
          type: res.tablesMissing ? 'warning' : 'error',
          message:
            res.error ||
            'No se pudo establecer comunicación con la base de datos en la nube. Verifica tu conexión a internet.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error de red al probar la conexión con la nube.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Support action: Save credentials and test connection
  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setFeedback({
        type: 'error',
        message: 'Por favor ingresa tanto la URL del proyecto como la clave pública (Anon Key).',
      });
      return;
    }

    setIsTesting(true);
    setFeedback(null);
    try {
      const res = await api.connectSupabase(supabaseUrl.trim(), supabaseAnonKey.trim());
      if (res.success) {
        setIsConnected(true);
        if (res.config?.lastSyncAt) setLastSyncAt(res.config.lastSyncAt);
        setFeedback({
          type: 'success',
          message:
            res.message ||
            '¡Conexión establecida con éxito! La base de datos en la nube está activa y sincronizada.',
        });
        await refreshState();
      } else {
        if (res.tablesMissing) {
          setFeedback({
            type: 'warning',
            message:
              res.error ||
              'Conexión exitosa con el servidor, pero faltan crear las tablas. Copia el Script SQL y ejecútalo en el SQL Editor.',
          });
        } else {
          setFeedback({
            type: 'error',
            message: res.error || 'No se pudo conectar con la nube. Verifica las credenciales.',
          });
        }
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error de red al intentar conectar con la nube.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setFeedback(null);
    try {
      const res = await api.disconnectSupabase();
      if (res.success) {
        setIsConnected(false);
        setSupabaseUrl('');
        setSupabaseAnonKey('');
        setLastSyncAt(undefined);
        setFeedback({
          type: 'warning',
          message: res.message || 'Nube desconectada. El sistema ahora opera en modo local.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error al desconectar la nube.',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handlePushToCloud = async () => {
    setIsPushing(true);
    setFeedback(null);
    try {
      const res = await api.pushToSupabase(
        supabaseUrl.trim() || undefined,
        supabaseAnonKey.trim() || undefined,
        {
          products,
          categories,
          customers,
          credits,
          payables,
          sales,
          movements,
          shifts,
          currentShift,
          users,
          settings,
        }
      );
      if (res.success) {
        if (res.lastSyncAt) setLastSyncAt(res.lastSyncAt);
        setFeedback({
          type: 'success',
          message:
            res.message ||
            `¡Datos locales subidos a la nube exitosamente! (${products.length} productos, ${sales.length} ventas, ${credits.length} créditos).`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'No se pudieron subir los datos a la nube.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error al subir datos a la nube.',
      });
    } finally {
      setIsPushing(false);
    }
  };

  const handlePullFromCloud = async () => {
    setIsPulling(true);
    setFeedback(null);
    try {
      const res = await api.pullFromSupabase(
        supabaseUrl.trim() || undefined,
        supabaseAnonKey.trim() || undefined
      );
      if (res.success) {
        if (res.lastSyncAt) setLastSyncAt(res.lastSyncAt);
        await refreshState();
        setFeedback({
          type: 'success',
          message:
            res.message ||
            '¡Datos descargados desde la nube y actualizados en el sistema correctamente!',
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'No se pudieron descargar los datos desde la nube.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error al descargar datos desde la nube.',
      });
    } finally {
      setIsPulling(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3500);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([SUPABASE_SQL_SCRIPT], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merkafacil_cloud_schema.sql';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const getPairingUrl = () => {
    if (typeof window === 'undefined') return '';
    const cleanUrl = supabaseUrl.trim();
    const cleanKey = supabaseAnonKey.trim();
    return `${window.location.origin}${window.location.pathname}#sb_url=${encodeURIComponent(cleanUrl)}&sb_key=${encodeURIComponent(cleanKey)}`;
  };

  const handleCopyPairingLink = () => {
    const link = getPairingUrl();
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedPairingLink(true);
    setTimeout(() => setCopiedPairingLink(false), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Bar */}
      <div className="bg-slate-900 text-white rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black tracking-tight text-white">
              Sincronización y Respaldo en la Nube
            </h3>
            <p className="text-[11px] text-slate-400">
              Mantén tus datos respaldados y tus dispositivos sincronizados en tiempo real
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={lockSettings}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Bloquear Módulo</span>
        </button>
      </div>

      {/* Hero Status Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Database className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                Base de Datos (Nube)
              </h2>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-md border border-emerald-200">
                SINCRONIZACIÓN MULTI-DISPOSITIVO
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Sincroniza tu inventario, ventas, libreta de créditos, turnos de caja y configuración
              en tiempo real entre múltiples computadoras, tablets y celulares.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end shrink-0 gap-1">
          {isConnected ? (
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Nube Activa y Conectada</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-extrabold shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Modo Local (Sin Nube)</span>
            </div>
          )}
          {lastSyncAt && isConnected && (
            <span className="text-[10px] text-slate-400 font-medium">
              Última sincr.: {new Date(lastSyncAt).toLocaleTimeString('es-VE')}
            </span>
          )}
        </div>
      </div>

      {/* Global Feedback Banner for User Actions */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-start space-x-3 shadow-2xs animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : feedback.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                feedback.type === 'warning' ? 'text-amber-600' : 'text-rose-600'
              }`}
            />
          )}
          <span className="leading-relaxed flex-1">{feedback.message}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA PRINCIPAL AL USUARIO: Acciones en la Nube y Vincular Dispositivo */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT COLUMN: Acciones de Sincronización y Prueba de Conexión */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Acciones de Base de Datos en la Nube
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Gestiona el respaldo y la actualización de tus datos en tiempo real
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {/* 1. Probar Conexión */}
              <button
                type="button"
                onClick={handleQuickTestConnection}
                disabled={isTesting || isLoadingConfig}
                className="w-full p-4 rounded-xl bg-slate-50 hover:bg-slate-100/90 disabled:opacity-50 border border-slate-200 text-left flex items-center space-x-3.5 transition-all cursor-pointer group shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-900 group-hover:bg-emerald-600 text-white flex items-center justify-center shrink-0 transition-colors">
                  {isTesting ? (
                    <RefreshCw className="w-5 h-5 animate-spin text-emerald-300" />
                  ) : (
                    <Wifi className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs sm:text-sm font-black text-slate-900 block">
                    {isTesting ? 'Probando conexión con la nube...' : 'Probar conexión'}
                  </span>
                  <span className="text-[11px] text-slate-600 block mt-0.5 leading-snug">
                    Verifica que el sistema esté conectado y sincronizando correctamente con la nube
                  </span>
                </div>
              </button>

              {/* 2. Subir datos locales a la nube */}
              <button
                type="button"
                onClick={handlePushToCloud}
                disabled={isPushing || (!isConnected && !supabaseUrl.trim())}
                className="w-full p-4 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/80 disabled:opacity-50 border border-emerald-200 text-left flex items-center space-x-3.5 transition-all cursor-pointer group shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-600 group-hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 transition-colors">
                  <UploadCloud className={`w-5 h-5 ${isPushing ? 'animate-bounce' : ''}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs sm:text-sm font-black text-emerald-950 block">
                    {isPushing
                      ? 'Subiendo datos locales a la nube...'
                      : 'Subir datos locales a la nube'}
                  </span>
                  <span className="text-[11px] text-emerald-800 block mt-0.5 leading-snug">
                    Envía tus {products.length} productos, {sales.length} ventas, {credits.length}{' '}
                    créditos, {customers.length} clientes, {shifts.length} turnos y configuración
                    actual a la nube
                  </span>
                </div>
              </button>

              {/* 3. Descargar los datos */}
              <button
                type="button"
                onClick={handlePullFromCloud}
                disabled={isPulling || (!isConnected && !supabaseUrl.trim())}
                className="w-full p-4 rounded-xl bg-blue-50/70 hover:bg-blue-100/80 disabled:opacity-50 border border-blue-200 text-left flex items-center space-x-3.5 transition-all cursor-pointer group shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 group-hover:bg-blue-700 text-white flex items-center justify-center shrink-0 transition-colors">
                  <DownloadCloud className={`w-5 h-5 ${isPulling ? 'animate-bounce' : ''}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs sm:text-sm font-black text-blue-950 block">
                    {isPulling
                      ? 'Descargando datos desde la nube...'
                      : 'Descargar los datos'}
                  </span>
                  <span className="text-[11px] text-blue-800 block mt-0.5 leading-snug">
                    Actualiza este dispositivo con los últimos datos guardados en la nube
                  </span>
                </div>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Sincronización automática activa en cada operación</span>
            {isConnected && (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Respaldo en vivo
              </span>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Vincular Celular u Otro Dispositivo */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Vincular Celular u Otro Dispositivo
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Conecta teléfonos, tablets u otras computadoras en un solo paso
                  </p>
                </div>
              </div>
              {isConnected && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>En vivo</span>
                </span>
              )}
            </div>

            {isConnected && supabaseUrl.trim() && supabaseAnonKey.trim() ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-slate-50 border border-emerald-200 space-y-4">
                <p className="text-xs text-slate-700 leading-relaxed">
                  Escanea este código QR con la cámara de tu teléfono o copia el enlace de
                  vinculación. Tu celular u otra computadora se conectará al instante a esta misma
                  base de datos en la nube automáticamente.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs shrink-0 text-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=6&data=${encodeURIComponent(
                        getPairingUrl()
                      )}`}
                      alt="QR Vinculación Merkafacil"
                      className="w-32 h-32 mx-auto rounded-lg"
                      loading="lazy"
                    />
                    <span className="text-[10px] font-extrabold text-slate-500 mt-1.5 block">
                      Escanear con Teléfono
                    </span>
                  </div>

                  <div className="flex-1 w-full space-y-3">
                    <button
                      type="button"
                      onClick={handleCopyPairingLink}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
                    >
                      {copiedPairingLink ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-200" />
                          <span>¡Enlace de Vinculación Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar Enlace de Vinculación</span>
                        </>
                      )}
                    </button>

                    <div className="p-3 rounded-xl bg-white/90 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                      <p className="font-bold text-slate-800">⚡ Sincronización Instantánea:</p>
                      <p className="leading-snug">
                        Cualquier producto, venta, cierre de caja o abono registrado en la PC se
                        refleja automáticamente en tu celular y viceversa.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-3 my-auto">
                <div className="w-12 h-12 rounded-2xl bg-slate-200/70 text-slate-500 flex items-center justify-center mx-auto">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h4 className="text-xs font-black text-slate-800">
                    Vinculación Multi-Dispositivo no activa
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Cuando la base de datos en la nube esté conectada, aquí aparecerá el código QR
                    y el enlace directo para vincular tus teléfonos, tablets u otras computadoras.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Compatible con celulares Android, iPhone, tablets y computadoras adicionales
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* APARTADO DISCRETO / OCULTO: EXCLUSIVO PARA SOPORTE TÉCNICO            */}
      {/* ===================================================================== */}
      <div className="pt-6 border-t border-slate-200/70">
        <div className="flex items-center justify-center sm:justify-end">
          <button
            type="button"
            onClick={() => setShowSupportPanel(!showSupportPanel)}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-[11px] font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>
              {showSupportPanel
                ? 'Ocultar apartado de Soporte Técnico'
                : 'Soporte Técnico (Configuración avanzada)'}
            </span>
            {showSupportPanel ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {showSupportPanel && (
          <div className="mt-4 pt-5 border-t border-slate-200 space-y-6 animate-in fade-in slide-in-from-top-2">
            {/* Support Banner */}
            <div className="bg-slate-800 text-slate-100 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-700">
              <div className="flex items-center space-x-2.5">
                <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-black tracking-wide uppercase text-amber-300">
                  Apartado Exclusivo para Soporte Técnico
                </span>
                <span className="text-xs text-slate-300 hidden md:inline">
                  — Configuración de credenciales de servidor, pasos de instalación y Script SQL
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                rodriguezraul.pro@gmail.com
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT SUPPORT COLUMN: Credentials Form */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-5">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Credenciales de Conexión
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Configuración de claves del servidor en la nube (Project Settings &gt; API)
                    </p>
                  </div>
                </div>

                {/* Auto-Distribution Explanation Box */}
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-[11px] text-emerald-950 leading-relaxed flex items-start space-x-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-black text-emerald-900">
                      Distribución Automática:
                    </strong>{' '}
                    Al guardar las credenciales en este panel (o configurar{' '}
                    <code className="bg-emerald-100/90 px-1 py-0.5 rounded font-mono text-[10px] font-bold">
                      VITE_SUPABASE_URL
                    </code>{' '}
                    y{' '}
                    <code className="bg-emerald-100/90 px-1 py-0.5 rounded font-mono text-[10px] font-bold">
                      VITE_SUPABASE_ANON_KEY
                    </code>{' '}
                    en el servidor), cualquier teléfono, tablet o computadora que se vincule se
                    conectará automáticamente.
                  </div>
                </div>

                <form onSubmit={handleSaveAndTest} className="space-y-4">
                  {/* Project URL Input */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                      PROJECT URL (SERVIDOR NUBE)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Server className="w-4 h-4" />
                      </div>
                      <input
                        type="url"
                        required
                        value={supabaseUrl}
                        onChange={(e) => setSupabaseUrl(e.target.value)}
                        placeholder="https://xxxxxxxxxxxx.supabase.co"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Anon Public Key Input */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                      ANON PUBLIC KEY (CLAVE API)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Key className="w-4 h-4" />
                      </div>
                      <input
                        type={showAnonKey ? 'text' : 'password'}
                        required
                        value={supabaseAnonKey}
                        onChange={(e) => setSupabaseAnonKey(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAnonKey(!showAnonKey)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showAnonKey ? 'Ocultar clave' : 'Mostrar clave'}
                      >
                        {showAnonKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Save & Disconnect Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="submit"
                      disabled={isTesting || isLoadingConfig}
                      className="flex-1 min-w-[200px] py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-xs"
                    >
                      {isTesting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                          <span>Probando Conexión...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 text-emerald-400" />
                          <span>Guardar y Probar Conexión</span>
                        </>
                      )}
                    </button>

                    {isConnected && (
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        disabled={isDisconnecting}
                        className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <CloudOff className="w-3.5 h-3.5" />
                        <span>{isDisconnecting ? 'Desconectando...' : 'Desconectar Nube'}</span>
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* RIGHT SUPPORT COLUMN: Step-by-Step Guide & SQL Script */}
              <div className="lg:col-span-7 space-y-6">
                {/* Step-by-step instructions card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900">
                      Instrucciones de Conexión
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Step 1 */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start space-x-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Crea un proyecto gratis en{' '}
                        <a
                          href="https://supabase.com"
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 font-extrabold inline-flex items-center gap-0.5 underline"
                        >
                          <span>supabase.com</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>{' '}
                        (toma 1 minuto).
                      </p>
                    </div>

                    {/* Step 2 */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start space-x-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        En el menú izquierdo del panel, entra a{' '}
                        <strong className="text-slate-900 font-bold">SQL Editor</strong> y haz clic
                        en <strong className="text-slate-900 font-bold">New Query</strong>.
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start space-x-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Haz clic en{' '}
                        <strong className="text-slate-900 font-bold">Copiar Script SQL</strong>{' '}
                        (abajo), pégalo en el editor y presiona{' '}
                        <strong className="text-emerald-700 font-extrabold">Run</strong>.
                      </p>
                    </div>

                    {/* Step 4 */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start space-x-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                        4
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Ve a{' '}
                        <strong className="text-slate-900 font-bold">
                          Project Settings &gt; API
                        </strong>
                        , copia el <strong className="text-slate-900 font-bold">Project URL</strong>{' '}
                        y la clave <strong className="text-slate-900 font-bold">anon public</strong>
                        , y pégalos en el formulario de la izquierda.
                      </p>
                    </div>
                  </div>
                </div>

                {/* SQL Script Dark Card */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                        <Code2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white">
                          Script SQL Base para Clonar
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Crea todas las tablas, índices y políticas de acceso en 1 clic
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={handleDownloadSql}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-300" />
                        <span>Descargar .sql</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        {copiedSql ? (
                          <>
                            <Check className="w-4 h-4 text-slate-950" />
                            <span>¡Script Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-950" />
                            <span>Copiar Script SQL</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 bg-slate-950/80 max-h-[420px] overflow-y-auto font-mono text-[11px] leading-relaxed text-emerald-300/90 select-all">
                    <pre className="whitespace-pre-wrap break-words">{SUPABASE_SQL_SCRIPT}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
