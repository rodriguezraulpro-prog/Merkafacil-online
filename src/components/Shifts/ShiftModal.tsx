import React, { useState } from 'react';
import { 
  Vault, 
  X, 
  DollarSign, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Calendar, 
  User, 
  Receipt, 
  History, 
  PlusCircle, 
  MinusCircle,
  HelpCircle
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CashShift } from '../../types';

export const ShiftModal: React.FC = () => {
  const {
    currentShift,
    shifts,
    isShiftModalOpen,
    setIsShiftModalOpen,
    openShift,
    closeShift,
    addCashMovement,
    currentShiftCashBs,
    currentShiftCashUSD,
    currentUser,
    setSelectedReceiptShift,
    formatBs,
    formatUSD,
    requestSupervisorAuth,
  } = useStore();

  const [activeSubTab, setActiveSubTab] = useState<'resumen' | 'movimientos' | 'historial'>('resumen');

  // Form states for Opening Shift
  const [openBs, setOpenBs] = useState('');
  const [openUSD, setOpenUSD] = useState('');
  const [openNotes, setOpenNotes] = useState('');
  const [openError, setOpenError] = useState('');

  // Form states for Closing Shift
  const [countedBs, setCountedBs] = useState('');
  const [countedUSD, setCountedUSD] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closeError, setCloseError] = useState('');

  // Form states for Manual Cash Movement
  const [movType, setMovType] = useState<'ingreso' | 'egreso'>('egreso');
  const [movCurrency, setMovCurrency] = useState<'Bs.' | '$'>('Bs.');
  const [movAmount, setMovAmount] = useState('');
  const [movReason, setMovReason] = useState('');
  const [movError, setMovError] = useState('');
  const [movSuccess, setMovSuccess] = useState('');

  if (!isShiftModalOpen) return null;

  // Handle Opening Shift
  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    setOpenError('');

    const initBs = parseFloat(openBs) || 0;
    const initUSD = parseFloat(openUSD) || 0;

    const res = openShift({
      initialCashBs: initBs,
      initialCashUSD: initUSD,
      notes: openNotes,
    });

    if (res.success) {
      setOpenBs('');
      setOpenUSD('');
      setOpenNotes('');
    } else {
      setOpenError(res.error || 'Error al abrir el turno');
    }
  };

  // Handle Manual Movement
  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    setMovError('');
    setMovSuccess('');

    const amt = parseFloat(movAmount);
    if (!amt || amt <= 0) {
      setMovError('Ingrese un monto válido mayor a 0');
      return;
    }
    if (!movReason.trim()) {
      setMovError('Debe especificar el motivo del movimiento');
      return;
    }

    const res = addCashMovement({
      type: movType,
      currency: movCurrency,
      amount: amt,
      reason: movReason,
    });

    if (res.success) {
      setMovAmount('');
      setMovReason('');
      setMovSuccess('Movimiento registrado en caja con éxito.');
      setTimeout(() => setMovSuccess(''), 3000);
    } else {
      setMovError(res.error || 'Error al registrar movimiento');
    }
  };

  // Handle Closing Shift with optional supervisor password check
  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    setCloseError('');

    const cBs = parseFloat(countedBs) || 0;
    const cUSD = parseFloat(countedUSD) || 0;

    const executeClose = () => {
      const res = closeShift({
        countedCashBs: cBs,
        countedCashUSD: cUSD,
        notes: closeNotes,
      });

      if (res.success) {
        setCountedBs('');
        setCountedUSD('');
        setCloseNotes('');
        setIsShiftModalOpen(false);
      } else {
        setCloseError(res.error || 'Error al cerrar el turno');
      }
    };

    requestSupervisorAuth({
      title: `Cierre y Arqueo de Turno #${currentShift?.shiftNumber || ''}`,
      description: `Efectivo contado: Bs. ${cBs.toFixed(2)} / $ ${cUSD.toFixed(2)}`,
      actionType: 'cierre_turno',
      onAuthorized: executeClose,
    });
  };

  const currentDiffBs = countedBs ? (parseFloat(countedBs) || 0) - currentShiftCashBs : null;
  const currentDiffUSD = countedUSD ? (parseFloat(countedUSD) || 0) - currentShiftCashUSD : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="shift-modal"
        className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              currentShift ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
            }`}>
              <Vault className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Control de Caja y Turnos
                </h2>
                <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                  currentShift ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {currentShift ? `Turno #${currentShift.shiftNumber} Abierto` : 'Caja Cerrada'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {currentShift 
                  ? `Iniciado por: ${currentShift.openedByUserName} • ${new Date(currentShift.openedAt).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Abra un turno de caja para comenzar la recepción de cobros en efectivo'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsShiftModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex space-x-2 border-b border-slate-100 py-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('resumen')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeSubTab === 'resumen' 
                ? 'bg-slate-900 text-white' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Vault className="w-3.5 h-3.5" />
            <span>{currentShift ? 'Arqueo & Cierre' : 'Apertura de Caja'}</span>
          </button>

          {currentShift && (
            <button
              type="button"
              onClick={() => setActiveSubTab('movimientos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeSubTab === 'movimientos' 
                  ? 'bg-slate-900 text-white' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              <span>Ingresos / Retiros ({currentShift.cashEntries?.length || 0})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveSubTab('historial')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeSubTab === 'historial' 
                ? 'bg-slate-900 text-white' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historial de Turnos ({shifts.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          
          {/* TAB 1: RESUMEN / APERTURA O CIERRE */}
          {activeSubTab === 'resumen' && (
            <>
              {!currentShift ? (
                /* APERTURA DE TURNO VIEW */
                <form onSubmit={handleOpenShift} className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center space-x-2 text-emerald-900 font-black text-sm mb-1">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span>Apertura de Nuevo Turno de Caja</span>
                    </div>
                    <p className="text-xs text-emerald-700">
                      Cajero responsable: <span className="font-bold">{currentUser?.name || 'Administrador'}</span>. Ingrese el fondo de cambio inicial presente en la gaveta de efectivo.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Fondo Inicial en Bolívares (Bs.)
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none font-bold text-slate-400 text-xs">
                          Bs.
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={openBs}
                          onChange={(e) => setOpenBs(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Sencillo o cambio inicial en Bs.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Fondo Inicial en Dólares ($ USD Efectivo)
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none font-bold text-slate-400 text-xs">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={openUSD}
                          onChange={(e) => setOpenUSD(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Billetes de cambio inicial en USD</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Notas u Observaciones (Opcional)
                    </label>
                    <input
                      type="text"
                      value={openNotes}
                      onChange={(e) => setOpenNotes(e.target.value)}
                      placeholder="Ej: Billetes de 1$ y 5$, monedas de cambio..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {openError && (
                    <div className="flex items-center space-x-1.5 text-rose-600 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{openError}</span>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      id="btn-confirm-open-shift"
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center space-x-2"
                    >
                      <Vault className="w-4 h-4" />
                      <span>Abrir Turno de Caja</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* CIERRE Y ARQUEO DE CAJA VIEW */
                <div className="space-y-4">
                  {/* Live Drawer Balance Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-900 text-white rounded-xl shadow-xs">
                      <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                        <span>Efectivo Esperado en Bs.</span>
                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400">GAVETA</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-emerald-400">
                        {formatBs(currentShiftCashBs)}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                        <span>Fondo Inicial: {formatBs(currentShift.initialCashBs)}</span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-emerald-950 text-white rounded-xl shadow-xs">
                      <div className="flex items-center justify-between text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
                        <span>Efectivo Esperado en USD</span>
                        <span className="text-[10px] bg-emerald-900 px-1.5 py-0.5 rounded text-emerald-200">GAVETA</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-emerald-300">
                        {formatUSD(currentShiftCashUSD)}
                      </div>
                      <div className="text-[11px] text-emerald-300/80 mt-1 flex justify-between">
                        <span>Fondo Inicial: {formatUSD(currentShift.initialCashUSD)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Arqueo Físico Form */}
                  <form onSubmit={handleCloseShift} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs uppercase tracking-wider text-slate-900">
                        Conteo Físico para Arqueo / Cierre:
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Cuente el dinero físico real en caja
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Efectivo Contado en Bs.
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={countedBs}
                          onChange={(e) => setCountedBs(e.target.value)}
                          placeholder="Monto contado en Bs."
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        {currentDiffBs !== null && (
                          <div className={`text-[11px] font-bold mt-1 ${
                            Math.abs(currentDiffBs) < 0.05 ? 'text-emerald-600' : currentDiffBs > 0 ? 'text-blue-600' : 'text-rose-600'
                          }`}>
                            {Math.abs(currentDiffBs) < 0.05
                              ? '✓ Cuadrado con caja'
                              : currentDiffBs > 0
                              ? `Sobrante: +${formatBs(currentDiffBs)}`
                              : `Faltante: ${formatBs(currentDiffBs)}`}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Efectivo Contado en USD ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={countedUSD}
                          onChange={(e) => setCountedUSD(e.target.value)}
                          placeholder="Monto contado en $"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        {currentDiffUSD !== null && (
                          <div className={`text-[11px] font-bold mt-1 ${
                            Math.abs(currentDiffUSD) < 0.05 ? 'text-emerald-600' : currentDiffUSD > 0 ? 'text-blue-600' : 'text-rose-600'
                          }`}>
                            {Math.abs(currentDiffUSD) < 0.05
                              ? '✓ Cuadrado con caja'
                              : currentDiffUSD > 0
                              ? `Sobrante: +${formatUSD(currentDiffUSD)}`
                              : `Faltante: ${formatUSD(currentDiffUSD)}`}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Observaciones del Cierre de Caja
                      </label>
                      <input
                        type="text"
                        value={closeNotes}
                        onChange={(e) => setCloseNotes(e.target.value)}
                        placeholder="Ej: Turno entregado a siguiente cajero sin novedades..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {closeError && (
                      <div className="flex items-center space-x-1.5 text-rose-600 text-xs font-bold">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{closeError}</span>
                      </div>
                    )}

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        id="btn-confirm-close-shift"
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center space-x-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Cerrar Turno y Generar Arqueo (Corte Z)</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}

          {/* TAB 2: MOVIMIENTOS MANUALES DE CAJA (INGRESOS / EGRESOS) */}
          {activeSubTab === 'movimientos' && currentShift && (
            <div className="space-y-4">
              <form onSubmit={handleAddMovement} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="block font-black text-xs uppercase tracking-wider text-slate-900">
                  Registrar Entrada o Retiro de Efectivo de Caja:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tipo:</label>
                    <select
                      value={movType}
                      onChange={(e) => setMovType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    >
                      <option value="egreso">Egreso / Retiro de Dinero</option>
                      <option value="ingreso">Ingreso / Entrada de Dinero</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Moneda:</label>
                    <select
                      value={movCurrency}
                      onChange={(e) => setMovCurrency(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    >
                      <option value="Bs.">Bolívares (Bs.)</option>
                      <option value="$">Dólares ($ USD)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Monto:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={movAmount}
                      onChange={(e) => setMovAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Motivo o Justificación:</label>
                  <input
                    type="text"
                    required
                    value={movReason}
                    onChange={(e) => setMovReason(e.target.value)}
                    placeholder="Ej: Pago de hielo, compra de bolsas plásticas, retiro de seguridad..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800"
                  />
                </div>

                {movError && (
                  <div className="text-rose-600 text-xs font-bold">{movError}</div>
                )}
                {movSuccess && (
                  <div className="text-emerald-600 text-xs font-bold">{movSuccess}</div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Guardar Movimiento
                  </button>
                </div>
              </form>

              {/* List of Movements */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 font-bold text-xs text-slate-700">
                  Movimientos Registrados en este Turno ({currentShift.cashEntries?.length || 0})
                </div>
                {(!currentShift.cashEntries || currentShift.cashEntries.length === 0) ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No se han registrado retiros ni ingresos manuales en este turno.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    {currentShift.cashEntries.map(entry => (
                      <div key={entry.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                        <div className="flex items-center space-x-2">
                          {entry.type === 'ingreso' ? (
                            <PlusCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <MinusCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">{entry.reason}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(entry.timestamp).toLocaleTimeString('es-VE')} • {entry.performedBy}
                            </span>
                          </div>
                        </div>
                        <span className={`font-black ${entry.type === 'ingreso' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {entry.type === 'ingreso' ? '+' : '-'}{entry.currency === 'Bs.' ? formatBs(entry.amount) : formatUSD(entry.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: HISTORIAL DE TURNOS ANTERIORES */}
          {activeSubTab === 'historial' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 font-medium">
                Lista de turnos registrados y comprobantes de cierre Z generados:
              </p>

              {shifts.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                  No hay turnos registrados en el sistema todavía.
                </div>
              ) : (
                <div className="space-y-2">
                  {shifts.map(sh => (
                    <div
                      key={sh.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-sm text-slate-900">Turno #{sh.shiftNumber}</span>
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                            sh.status === 'abierta' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {sh.status === 'abierta' ? 'ABIERTO' : 'CERRADO'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Apertura: {new Date(sh.openedAt).toLocaleString('es-VE')} ({sh.openedByUserName})
                        </p>
                        {sh.closedAt && (
                          <p className="text-[11px] text-slate-500">
                            Cierre: {new Date(sh.closedAt).toLocaleString('es-VE')} • Ventas: {sh.totalSalesCount || 0}
                          </p>
                        )}
                      </div>

                      {sh.status === 'cerrada' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReceiptShift(sh);
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Ver Corte Z</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
