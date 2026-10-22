import React from 'react';
import { Store, ShoppingBag, Package, BarChart3, History, Settings, AlertTriangle, DollarSign, Shield, LogOut, LogIn, Vault, Lock, BookOpen, RefreshCw, Database, Globe } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ActiveTab } from '../types';

export const Header: React.FC = () => {
  const {
    settings,
    activeTab,
    setActiveTab,
    lowStockCount,
    outOfStockCount,
    bcvRate,
    syncBcvRateOnline,
    isSyncingBcv,
    formatBs,
    formatUSD,
    todaySalesCount,
    todaySalesTotalBs,
    todaySalesTotalUSD,
    currentShift,
    setIsShiftModalOpen,
    currentUser,
    logout,
    setIsLoginModalOpen,
    isSettingsUnlocked,
    totalDebtorsCount,
    isOnline,
    serverLatencyMs,
  } = useStore();

  const navItems: { id: ActiveTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'pos', label: 'Punto de Venta', icon: ShoppingBag },
    { id: 'inventario', label: 'Inventario', icon: Package, badge: lowStockCount + outOfStockCount },
    { id: 'creditos', label: 'Libreta', icon: BookOpen, badge: totalDebtorsCount > 0 ? totalDebtorsCount : undefined },
    { id: 'reportes', label: 'Reportes Diarios', icon: BarChart3 },
    { id: 'movimientos', label: 'Kardex / Movimientos', icon: History },
    { id: 'supabase', label: 'Base de Datos (Supabase)', icon: Database },
    { id: 'ajustes', label: 'Ajustes', icon: Settings },
  ];

  const [bcvToast, setBcvToast] = React.useState<string | null>(null);

  const handleSyncBcvClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSyncingBcv) return;
    const res = await syncBcvRateOnline();
    if (res.success) {
      setBcvToast(`Tasa BCV del día sincronizada: Bs. ${res.rate?.toFixed(2)}`);
      setTimeout(() => setBcvToast(null), 3500);
    } else {
      setBcvToast(res.error || "No se pudo actualizar");
      setTimeout(() => setBcvToast(null), 4000);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Operational Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-2.5 sm:py-3 gap-2.5 sm:gap-4">
          
          {/* Brand & Store Name */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs font-black shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                  {settings.name || 'Mi Negocio'}
                </h1>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium truncate">
                  {settings.rif && (
                    <>
                      <span>RIF: {settings.rif}</span>
                      <span className="text-slate-300">•</span>
                    </>
                  )}
                  <span className="font-semibold text-slate-600">Merkafacil</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-400">
                    por <strong className="font-semibold text-slate-600">Educom-tec</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Session & Quick Access (Visible only on smaller screens) */}
            <div className="flex lg:hidden items-center space-x-2">
              {currentUser ? (
                <button
                  onClick={logout}
                  id="mobile-logout-btn"
                  title="Cerrar sesión"
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold transition-colors hover:bg-rose-100"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px]">Salir</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  id="mobile-login-btn"
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 shrink-0" />
                  <span>Entrar</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Badges & Operational Indicators */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs">
            
            {/* Tasa BCV Widget */}
            <div 
              id="header-bcv-widget"
              className="relative bg-emerald-50/90 hover:bg-emerald-100/90 border border-emerald-200 text-emerald-950 pl-3 pr-1.5 py-1 rounded-xl flex items-center gap-2 shadow-2xs transition-all text-left group"
            >
              <button
                onClick={() => currentUser ? setActiveTab('ajustes') : setIsLoginModalOpen(true)}
                title="Tasa Oficial BCV - Clic para ver o modificar en Ajustes"
                className="flex items-center gap-2 text-left cursor-pointer focus:outline-none"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
                <div className="leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700">
                      Tasa BCV Oficial
                    </span>
                    {settings.autoUpdateBcv !== false && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[9px] font-black text-emerald-700 bg-emerald-100 rounded-sm" title="Actualización automática por internet activa">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Auto
                      </span>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-black text-emerald-950 whitespace-nowrap">
                    Bs. {bcvRate.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    <span className="text-[10px] font-bold text-emerald-600 ml-1">/ $1 USD</span>
                  </span>
                </div>
              </button>

              {/* Botón de sincronización manual de tasa al instante */}
              <button
                onClick={handleSyncBcvClick}
                disabled={isSyncingBcv}
                title="Actualizar tasa BCV oficial por internet ahora"
                className="ml-1 p-1.5 rounded-lg text-emerald-700 hover:text-emerald-950 hover:bg-emerald-200/70 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBcv ? 'animate-spin text-emerald-600' : ''}`} />
              </button>

              {/* Toast flotante informativo al sincronizar */}
              {bcvToast && (
                <div className="absolute top-full mt-2 left-0 z-50 whitespace-nowrap bg-slate-900 text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg shadow-xl border border-slate-700 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                  <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{bcvToast}</span>
                </div>
              )}
            </div>

            {/* Ventas Hoy Badge */}
            <div 
              id="header-today-sales"
              className="bg-slate-900 text-white px-3 py-1.5 rounded-xl flex items-center gap-2.5 shadow-2xs text-left"
              title={`Total de hoy: ${formatBs(todaySalesTotalBs)} (${formatUSD(todaySalesTotalUSD)})`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 ml-0.5"></span>
              <div className="leading-tight">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ventas Hoy:</span>
                  <span className="text-[10px] font-extrabold text-emerald-400">({todaySalesCount})</span>
                </div>
                <div className="flex items-baseline gap-1.5 text-xs sm:text-sm font-black text-white whitespace-nowrap">
                  <span>{formatBs(todaySalesTotalBs)}</span>
                  <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">({formatUSD(todaySalesTotalUSD)})</span>
                </div>
              </div>
            </div>

            {/* Stock Alerts Badge */}
            {(lowStockCount > 0 || outOfStockCount > 0) && (
              <button
                onClick={() => currentUser ? setActiveTab('inventario') : setIsLoginModalOpen(true)}
                id="header-stock-alert-btn"
                className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors px-2.5 py-1.5 rounded-xl cursor-pointer shadow-2xs"
                title={`${lowStockCount + outOfStockCount} productos con alerta de stock`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-black text-xs">
                  {lowStockCount + outOfStockCount}
                </span>
              </button>
            )}

            {/* Caja / Turno Status Button */}
            {currentUser && (
              <button
                onClick={() => setIsShiftModalOpen(true)}
                id="header-shift-btn"
                title="Apertura, Movimientos y Cierre de Caja"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer text-xs font-bold shadow-2xs text-left ${
                  currentShift 
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 hover:bg-emerald-100' 
                    : 'bg-amber-50/80 border-amber-300 text-amber-900 hover:bg-amber-100'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  currentShift ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                }`}>
                  <Vault className="w-3.5 h-3.5" />
                </div>
                <div className="leading-tight">
                  <span className="block text-[10px] text-slate-500 uppercase tracking-tight font-bold">Caja</span>
                  <span className="whitespace-nowrap font-extrabold">{currentShift ? `Turno #${currentShift.shiftNumber}` : 'Cerrada (Abrir)'}</span>
                </div>
              </button>
            )}

            {/* Cloud Online Connectivity Badge */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
                isOnline 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
              title={isOnline ? `Conectado al servidor en la nube${serverLatencyMs !== null ? ` (Latencia: ${serverLatencyMs}ms)` : ''}` : 'Sin conexión o intentando reconectar con el servidor'}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'}`} />
              <span className="text-[11px] font-bold">
                {isOnline ? 'Online' : 'Sin Red'}
              </span>
              {isOnline && serverLatencyMs !== null && (
                <span className="text-[10px] font-mono text-emerald-600 hidden xl:inline">
                  {serverLatencyMs}ms
                </span>
              )}
            </div>

            {/* Desktop User / Admin Session Capsule */}
            <div className="hidden lg:flex items-center">
              {currentUser ? (
                <div className="flex items-center bg-slate-100 border border-slate-200/90 rounded-xl p-1 gap-1 text-xs shadow-2xs">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-slate-800 font-bold">
                    <div className="w-5 h-5 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
                      <Shield className="w-3 h-3" />
                    </div>
                    <span className="font-bold text-slate-800">Admin</span>
                  </div>
                  <button
                    onClick={logout}
                    id="header-logout-btn"
                    title="Cerrar sesión"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-700 hover:bg-rose-100 hover:text-rose-800 transition-colors font-bold cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span>Salir</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  id="header-login-btn"
                  title="Iniciar sesión"
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer text-xs font-bold shadow-2xs"
                >
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span>Iniciar Sesión</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar with Dedicated Independent Container (Desktop / Tablet) */}
      <div className="border-t border-slate-200/80 bg-slate-50/60 sm:bg-white hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-1.5 no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`tab-${item.id}`}
                  disabled={!currentUser}
                  onClick={() => {
                    if (!currentUser) {
                      setIsLoginModalOpen(true);
                      return;
                    }
                    setActiveTab(item.id);
                  }}
                  className={`flex items-center space-x-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-150 whitespace-nowrap ${
                    !currentUser
                      ? 'opacity-40 cursor-not-allowed text-slate-400'
                      : isActive
                        ? 'bg-slate-900 text-white shadow-xs cursor-pointer'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {(item.id === 'ajustes' || item.id === 'supabase') && !isSettingsUnlocked && (
                    <Lock className={`w-3 h-3 ml-0.5 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                  )}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-black ${
                        isActive
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
