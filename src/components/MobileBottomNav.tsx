import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Package, 
  BookOpen, 
  BarChart3, 
  MoreHorizontal, 
  Vault, 
  History, 
  Settings, 
  LogOut, 
  X, 
  Lock, 
  Shield,
  DollarSign,
  RefreshCw,
  Database
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ActiveTab } from '../types';

export const MobileBottomNav: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    cartItemCount, 
    lowStockCount, 
    outOfStockCount, 
    totalDebtorsCount,
    currentUser,
    setIsShiftModalOpen,
    currentShift,
    isSettingsUnlocked,
    logout,
    bcvRate,
    syncBcvRateOnline,
    isSyncingBcv,
    isOnline,
    serverLatencyMs
  } = useStore();

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  if (!currentUser) return null;

  const totalStockAlerts = lowStockCount + outOfStockCount;

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMoreMenuOpen(false);
  };

  return (
    <>
      {/* Slide-up "Más Opciones" Drawer for Mobile */}
      {isMoreMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMoreMenuOpen(false)}
        >
          <div 
            className="bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 font-black">
                  <Shield className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Más Módulos y Opciones</h3>
                  <p className="text-[11px] text-slate-500 font-semibold">Sesión activa como Administrador</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsMoreMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Caja y Turnos */}
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  setIsShiftModalOpen(true);
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  currentShift
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50/70 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    currentShift ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    <Vault className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    currentShift ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                  }`}>
                    {currentShift ? `Turno #${currentShift.shiftNumber}` : 'Cerrada'}
                  </span>
                </div>
                <div className="mt-2.5">
                  <span className="text-xs font-black block">Control de Caja</span>
                  <span className="text-[10px] text-slate-500 font-semibold">Arqueo, retiros y cierre</span>
                </div>
              </button>

              {/* Kardex / Movimientos */}
              <button
                type="button"
                onClick={() => handleSelectTab('movimientos')}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  activeTab === 'movimientos'
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div className="mt-2.5">
                  <span className="text-xs font-black block">Kardex / Historial</span>
                  <span className={`text-[10px] font-semibold ${activeTab === 'movimientos' ? 'text-slate-300' : 'text-slate-500'}`}>
                    Entradas, salidas y mermas
                  </span>
                </div>
              </button>

              {/* Ajustes de Bodega */}
              <button
                type="button"
                onClick={() => handleSelectTab('ajustes')}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  activeTab === 'ajustes'
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                    <Settings className="w-4 h-4" />
                  </div>
                  {!isSettingsUnlocked && (
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                  )}
                </div>
                <div className="mt-2.5">
                  <span className="text-xs font-black block">Configuración</span>
                  <span className={`text-[10px] font-semibold ${activeTab === 'ajustes' ? 'text-slate-300' : 'text-slate-500'}`}>
                    Tasa BCV, ticket, respaldo
                  </span>
                </div>
              </button>

              {/* Tasa BCV Info con botón de refresco */}
              <div className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isSyncingBcv) syncBcvRateOnline();
                    }}
                    disabled={isSyncingBcv}
                    className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50 cursor-pointer"
                    title="Actualizar tasa BCV por internet"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBcv ? 'animate-spin text-emerald-600' : ''}`} />
                  </button>
                </div>
                <div className="mt-2.5">
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase block">Tasa BCV Hoy</span>
                  <span className="text-xs font-black text-emerald-950">
                    Bs. {bcvRate.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Base de Datos en la Nube (Supabase) */}
              <button
                type="button"
                onClick={() => handleSelectTab('supabase')}
                className={`col-span-2 p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  activeTab === 'supabase'
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-200 text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black block">Base de Datos (Supabase PostgreSQL)</span>
                    <span className={`text-[10px] font-semibold ${activeTab === 'supabase' ? 'text-slate-300' : 'text-emerald-800'}`}>
                      Script SQL para clonar y credenciales en la nube
                    </span>
                  </div>
                </div>
                {!isSettingsUnlocked && (
                  <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                )}
              </button>
            </div>

            {/* Cloud Connectivity Status Pill */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="font-bold text-slate-700">
                  {isOnline ? 'Servidor Conectado (Nube)' : 'Reconectando con servidor...'}
                </span>
              </div>
              {isOnline && serverLatencyMs !== null && (
                <span className="font-mono text-[10px] text-slate-400 font-bold">{serverLatencyMs}ms</span>
              )}
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={() => {
                setIsMoreMenuOpen(false);
                logout();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs flex items-center justify-center space-x-2 border border-rose-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Sticky Mobile Bottom Navigation Bar */}
      <nav 
        id="mobile-bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[calc(env(safe-area-inset-bottom,0px)+0.25rem)] print:hidden"
      >
        <div className="grid grid-cols-5 h-15">
          
          {/* 1. Punto de Venta (POS) */}
          <button
            type="button"
            onClick={() => handleSelectTab('pos')}
            className={`flex flex-col items-center justify-center relative transition-all active:scale-95 ${
              activeTab === 'pos' ? 'text-emerald-600 font-black' : 'text-slate-500 font-semibold'
            }`}
          >
            <div className={`relative p-1 rounded-xl transition-all ${
              activeTab === 'pos' ? 'bg-emerald-50 text-emerald-600 scale-105' : ''
            }`}>
              <ShoppingBag className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Vender</span>
          </button>

          {/* 2. Inventario */}
          <button
            type="button"
            onClick={() => handleSelectTab('inventario')}
            className={`flex flex-col items-center justify-center relative transition-all active:scale-95 ${
              activeTab === 'inventario' ? 'text-emerald-600 font-black' : 'text-slate-500 font-semibold'
            }`}
          >
            <div className={`relative p-1 rounded-xl transition-all ${
              activeTab === 'inventario' ? 'bg-emerald-50 text-emerald-600 scale-105' : ''
            }`}>
              <Package className="w-5 h-5" />
              {totalStockAlerts > 0 && (
                <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
                  {totalStockAlerts > 9 ? '9+' : totalStockAlerts}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Inventario</span>
          </button>

          {/* 3. Libreta (Créditos / Cobranzas) */}
          <button
            type="button"
            onClick={() => handleSelectTab('creditos')}
            className={`flex flex-col items-center justify-center relative transition-all active:scale-95 ${
              activeTab === 'creditos' ? 'text-emerald-600 font-black' : 'text-slate-500 font-semibold'
            }`}
          >
            <div className={`relative p-1 rounded-xl transition-all ${
              activeTab === 'creditos' ? 'bg-emerald-50 text-emerald-600 scale-105' : ''
            }`}>
              <BookOpen className="w-5 h-5" />
              {totalDebtorsCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
                  {totalDebtorsCount > 9 ? '9+' : totalDebtorsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Libreta</span>
          </button>

          {/* 4. Reportes */}
          <button
            type="button"
            onClick={() => handleSelectTab('reportes')}
            className={`flex flex-col items-center justify-center relative transition-all active:scale-95 ${
              activeTab === 'reportes' ? 'text-emerald-600 font-black' : 'text-slate-500 font-semibold'
            }`}
          >
            <div className={`relative p-1 rounded-xl transition-all ${
              activeTab === 'reportes' ? 'bg-emerald-50 text-emerald-600 scale-105' : ''
            }`}>
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Reportes</span>
          </button>

          {/* 5. Más */}
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen(true)}
            className={`flex flex-col items-center justify-center relative transition-all active:scale-95 ${
              isMoreMenuOpen || activeTab === 'ajustes' || activeTab === 'movimientos'
                ? 'text-emerald-600 font-black'
                : 'text-slate-500 font-semibold'
            }`}
          >
            <div className="relative p-1 rounded-xl transition-all">
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Más</span>
          </button>

        </div>
      </nav>
    </>
  );
};
