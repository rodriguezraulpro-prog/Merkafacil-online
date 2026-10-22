import React, { useState, useMemo } from 'react';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  RotateCcw, 
  AlertTriangle, 
  Filter, 
  Calendar, 
  Clock, 
  Download, 
  X, 
  ArrowUpDown,
  Check
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { StockMovementType } from '../../types';

type DatePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';
type TimePreset = 'all' | 'morning' | 'afternoon' | 'night' | 'custom';

export const MovementsView: React.FC = () => {
  const { movements } = useStore();

  // Basic filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Date and Time filter states
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [timePreset, setTimePreset] = useState<TimePreset>('all');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');

  // Helper date strings
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayStr = () => {
    const d = new Date(Date.now() - 86400000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getPastDaysStr = (days: number) => {
    const d = new Date(Date.now() - days * 86400000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getMonthStartStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  // Handlers for Date presets
  const handleDatePresetSelect = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = getTodayStr();

    switch (preset) {
      case 'all':
        setStartDate('');
        setEndDate('');
        break;
      case 'today':
        setStartDate(today);
        setEndDate(today);
        break;
      case 'yesterday': {
        const yesterday = getYesterdayStr();
        setStartDate(yesterday);
        setEndDate(yesterday);
        break;
      }
      case 'week':
        setStartDate(getPastDaysStr(7));
        setEndDate(today);
        break;
      case 'month':
        setStartDate(getMonthStartStr());
        setEndDate(today);
        break;
      case 'custom':
        // Keep existing or initialize with today
        if (!startDate) setStartDate(today);
        if (!endDate) setEndDate(today);
        break;
    }
  };

  // Handlers for Time presets
  const handleTimePresetSelect = (preset: TimePreset) => {
    setTimePreset(preset);
    switch (preset) {
      case 'all':
        setStartTime('');
        setEndTime('');
        break;
      case 'morning':
        setStartTime('06:00');
        setEndTime('12:00');
        break;
      case 'afternoon':
        setStartTime('12:00');
        setEndTime('18:00');
        break;
      case 'night':
        setStartTime('18:00');
        setEndTime('23:59');
        break;
      case 'custom':
        break;
    }
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setSortOrder('desc');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setTimePreset('all');
    setStartTime('');
    setEndTime('');
  };

  const isAnyFilterActive = Boolean(
    searchQuery.trim() || 
    typeFilter !== 'all' || 
    startDate || 
    endDate || 
    startTime || 
    endTime || 
    datePreset !== 'all' ||
    timePreset !== 'all'
  );

  // Filtered and sorted movements
  const filteredMovements = useMemo(() => {
    return movements
      .filter((m) => {
        // 1. Text Search (Product name or Reason)
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = 
          !q || 
          m.productName.toLowerCase().includes(q) || 
          m.reason.toLowerCase().includes(q);

        if (!matchesSearch) return false;

        // 2. Type Filter
        if (typeFilter !== 'all' && m.type !== typeFilter) {
          return false;
        }

        // 3. Parse movement local date and time
        const d = new Date(m.date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const movementDateStr = `${year}-${month}-${day}`;

        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const movementTimeStr = `${hours}:${minutes}`;

        // 4. Date Range Filter
        if (startDate && movementDateStr < startDate) {
          return false;
        }
        if (endDate && movementDateStr > endDate) {
          return false;
        }

        // 5. Time Range Filter
        if (startTime && endTime) {
          if (startTime <= endTime) {
            if (movementTimeStr < startTime || movementTimeStr > endTime) return false;
          } else {
            // Spanning midnight
            if (movementTimeStr < startTime && movementTimeStr > endTime) return false;
          }
        } else if (startTime) {
          if (movementTimeStr < startTime) return false;
        } else if (endTime) {
          if (movementTimeStr > endTime) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [movements, searchQuery, typeFilter, startDate, endDate, startTime, endTime, sortOrder]);

  // Statistics calculation for the filtered set
  const stats = useMemo(() => {
    let entradasQty = 0;
    let salidasQty = 0;
    let ajustesCount = 0;

    filteredMovements.forEach((m) => {
      if (m.type === 'entrada' || m.type === 'devolucion_anulada') {
        entradasQty += Math.abs(m.quantity);
      } else if (m.type === 'salida_venta') {
        salidasQty += Math.abs(m.quantity);
      } else if (m.type === 'ajuste_merma') {
        ajustesCount += 1;
      }
    });

    return {
      totalCount: filteredMovements.length,
      entradasQty,
      salidasQty,
      ajustesCount,
      balanceNeto: entradasQty - salidasQty,
    };
  }, [filteredMovements]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Fecha',
      'Hora',
      'Producto',
      'Tipo de Movimiento',
      'Cantidad',
      'Stock Anterior',
      'Stock Resultante',
      'Motivo / Detalle'
    ];

    const rows = filteredMovements.map((m) => {
      const d = new Date(m.date);
      const dateStr = d.toLocaleDateString('es-VE');
      const timeStr = d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
      return [
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${m.productName.replace(/"/g, '""')}"`,
        `"${m.type}"`,
        m.quantity,
        m.previousStock,
        m.newStock,
        `"${m.reason.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const fileDate = startDate ? `${startDate}_a_${endDate || startDate}` : 'completo';
    link.setAttribute('download', `kardex_movimientos_${fileDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const typeConfig: Record<StockMovementType, { label: string; bg: string; text: string; icon: React.ElementType }> = {
    entrada: {
      label: 'Entrada / Compra',
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      icon: ArrowUpRight,
    },
    salida_venta: {
      label: 'Salida por Venta',
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      icon: ArrowDownRight,
    },
    ajuste_merma: {
      label: 'Ajuste / Merma',
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      icon: AlertTriangle,
    },
    devolucion_anulada: {
      label: 'Devolución (Anulación)',
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      icon: RotateCcw,
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Header & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-black text-slate-900">Kardex & Movimientos de Stock</h2>
        </div>

        <div className="flex items-center gap-2">
          {isAnyFilterActive && (
            <button
              onClick={resetAllFilters}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Restablecer todos los filtros"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            disabled={filteredMovements.length === 0}
            className={`px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-2xs ${
              filteredMovements.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
            title="Descargar reporte en Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar Kardex ({filteredMovements.length})</span>
          </button>
        </div>
      </div>

      {/* Mini Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Movimientos Filtrados
          </span>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-xl font-black text-slate-900">{stats.totalCount}</span>
            <span className="text-xs text-slate-400 font-semibold">de {movements.length}</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            Entradas / Reposición
          </span>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-xl font-black text-emerald-600">+{stats.entradasQty}</span>
            <span className="text-xs text-emerald-600/70 font-semibold">unidades</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-blue-100 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
            Salidas por Venta
          </span>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-xl font-black text-blue-600">-{stats.salidasQty}</span>
            <span className="text-xs text-blue-600/70 font-semibold">unidades</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Balance Neto Stock
          </span>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className={`text-xl font-black ${stats.balanceNeto >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {stats.balanceNeto > 0 ? `+${stats.balanceNeto}` : stats.balanceNeto}
            </span>
            <span className="text-xs text-slate-400 font-semibold">unid.</span>
          </div>
        </div>
      </div>

      {/* FILTERS PANEL */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        
        {/* Row 1: Search & Type & Order */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por producto, lote, proveedor o motivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">Todos los movimientos</option>
                <option value="entrada">Entradas (Compras / Proveedor)</option>
                <option value="salida_venta">Salidas por Venta</option>
                <option value="ajuste_merma">Ajustes y Mermas</option>
                <option value="devolucion_anulada">Devoluciones por Anulación</option>
              </select>
            </div>

            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
              title="Cambiar orden cronológico"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>{sortOrder === 'desc' ? 'Más recientes' : 'Más antiguos'}</span>
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 space-y-3">
          
          {/* Row 2: Date Filter Section */}
          <div className="flex flex-col md:flex-row md:items-center gap-2.5">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 shrink-0 min-w-32">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Filtro por Fecha:</span>
            </div>

            {/* Quick Date Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'Todo' },
                { id: 'today', label: 'Hoy' },
                { id: 'yesterday', label: 'Ayer' },
                { id: 'week', label: 'Últimos 7 días' },
                { id: 'month', label: 'Este mes' },
                { id: 'custom', label: 'Personalizado' },
              ].map((p) => {
                const isSelected = datePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleDatePresetSelect(p.id as DatePreset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Date Inputs (Desde - Hasta) */}
            <div className="flex items-center space-x-2 md:ml-auto">
              <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                <span className="text-[11px] font-bold text-slate-400">Desde:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                />
              </div>

              <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                <span className="text-[11px] font-bold text-slate-400">Hasta:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                />
              </div>

              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setDatePreset('all');
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Quitar rango de fecha"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Row 3: Time Filter Section (Filtro por Hora) */}
          <div className="flex flex-col md:flex-row md:items-center gap-2.5">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 shrink-0 min-w-32">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Filtro por Hora:</span>
            </div>

            {/* Quick Time Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'Cualquier hora' },
                { id: 'morning', label: 'Mañana (06:00 - 12:00)' },
                { id: 'afternoon', label: 'Tarde (12:00 - 18:00)' },
                { id: 'night', label: 'Noche (18:00 - 23:59)' },
                { id: 'custom', label: 'Hora fija' },
              ].map((t) => {
                const isSelected = timePreset === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTimePresetSelect(t.id as TimePreset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Time Inputs (Hora desde - Hora hasta) */}
            <div className="flex items-center space-x-2 md:ml-auto">
              <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                <span className="text-[11px] font-bold text-slate-400">De:</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setTimePreset('custom');
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                />
              </div>

              <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                <span className="text-[11px] font-bold text-slate-400">A:</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setTimePreset('custom');
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                />
              </div>

              {(startTime || endTime) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartTime('');
                    setEndTime('');
                    setTimePreset('all');
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Quitar filtro de hora"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4">Tipo de Movimiento</th>
                <th className="py-3 px-4 text-center">Cantidad</th>
                <th className="py-3 px-4 text-center">Stock Antes ➔ Después</th>
                <th className="py-3 px-4">Motivo / Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-extrabold text-sm text-slate-700">
                      No hay movimientos que coincidan con los filtros
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Prueba ampliando el rango de fecha u hora seleccionados
                    </p>
                    {isAnyFilterActive && (
                      <button
                        onClick={resetAllFilters}
                        className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restablecer filtros</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => {
                  const config = typeConfig[m.type] || {
                    label: m.type,
                    bg: 'bg-slate-100',
                    text: 'text-slate-800',
                    icon: History,
                  };
                  const Icon = config.icon;
                  const d = new Date(m.date);
                  
                  const dateStr = d.toLocaleDateString('es-VE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });

                  const timeStr = d.toLocaleTimeString('es-VE', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-800 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {dateStr}
                          </span>
                          <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {timeStr}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        {m.productName}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${config.bg} ${config.text}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{config.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-black">
                        <span className={m.quantity > 0 ? 'text-emerald-700' : 'text-red-600'}>
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600">
                        <span className="font-semibold text-slate-500">{m.previousStock}</span>
                        <span className="mx-1 text-slate-400">➔</span>
                        <span className="font-black text-slate-900">{m.newStock}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium truncate max-w-xs">
                        {m.reason}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

