import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  ShoppingBag, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  User, 
  Receipt, 
  Printer, 
  Download, 
  AlertCircle, 
  XCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { PaymentMethod, Sale } from '../../types';

export const ReportsView: React.FC = () => {
  const { 
    sales, 
    cancelSale, 
    setSelectedReceiptSale, 
    bcvRate,
    formatBs, 
    formatUSD, 
    settings,
    requestSupervisorAuth
  } = useStore();

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date(Date.now() - 86400000);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [cancellingSaleId, setCancellingSaleId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelReasonError, setCancelReasonError] = useState<string>('');

  // Filter sales for the selected date
  const daySales = useMemo(() => {
    return sales.filter(s => s.date.startsWith(selectedDate));
  }, [sales, selectedDate]);

  // Completed sales
  const completedSales = useMemo(() => {
    return daySales.filter(s => s.status === 'completada');
  }, [daySales]);

  // Key metrics for the day
  const metrics = useMemo(() => {
    let totalBs = 0;
    let totalUSD = 0;
    let profitBs = 0;
    let profitUSD = 0;

    const paymentTotals = {
      pago_movil_bs: 0,
      punto_debito_bs: 0,
      efectivo_bs: 0,
      efectivo_usd: 0,
      fiado_bs: 0,
      fiado_usd: 0,
      transferencia_bs: 0,
    };

    // Product ranking
    const productStats: Record<string, { name: string; quantity: number; totalBs: number; totalUSD: number; unit: string }> = {};

    completedSales.forEach(s => {
      totalBs += s.totalBs;
      totalUSD += s.totalUSD;
      profitBs += s.profitBs;
      profitUSD += s.profitUSD;

      if (s.paymentMethod === 'pago_movil') paymentTotals.pago_movil_bs += s.totalBs;
      else if (s.paymentMethod === 'punto_debito') paymentTotals.punto_debito_bs += s.totalBs;
      else if (s.paymentMethod === 'efectivo_bs') paymentTotals.efectivo_bs += s.totalBs;
      else if (s.paymentMethod === 'efectivo_usd') paymentTotals.efectivo_usd += s.totalUSD;
      else if (s.paymentMethod === 'fiado') {
        paymentTotals.fiado_bs += s.totalBs;
        paymentTotals.fiado_usd += s.totalUSD;
      } else if (s.paymentMethod === 'transferencia') paymentTotals.transferencia_bs += s.totalBs;
      else if (s.paymentMethod === 'mixto' && s.paymentSplits) {
        s.paymentSplits.forEach(split => {
          if (split.method === 'pago_movil') paymentTotals.pago_movil_bs += split.amountBs;
          else if (split.method === 'punto_debito') paymentTotals.punto_debito_bs += split.amountBs;
          else if (split.method === 'efectivo_bs') paymentTotals.efectivo_bs += split.amountBs;
          else if (split.method === 'efectivo_usd') paymentTotals.efectivo_usd += split.amountUSD;
          else if (split.method === 'transferencia') paymentTotals.transferencia_bs += split.amountBs;
        });
      }

      // Items
      s.items.forEach(item => {
        if (!productStats[item.productId]) {
          productStats[item.productId] = {
            name: item.productName,
            quantity: 0,
            totalBs: 0,
            totalUSD: 0,
            unit: item.unit,
          };
        }
        productStats[item.productId].quantity += item.quantity;
        productStats[item.productId].totalBs += item.subtotalBs;
        productStats[item.productId].totalUSD += item.subtotalUSD;
      });
    });

    const topProducts = Object.values(productStats).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    const averageTicketBs = completedSales.length > 0 ? totalBs / completedSales.length : 0;
    const averageTicketUSD = completedSales.length > 0 ? totalUSD / completedSales.length : 0;

    return {
      totalBs,
      totalUSD,
      profitBs,
      profitUSD,
      paymentTotals,
      topProducts,
      averageTicketBs,
      averageTicketUSD,
      count: completedSales.length,
    };
  }, [completedSales]);

  // Handle Cancel Sale
  const handleConfirmCancel = (saleId: string) => {
    const trimmedReason = cancelReason.trim();
    if (!trimmedReason) {
      setCancelReasonError('Debe ingresar o seleccionar el motivo de la anulación');
      return;
    }

    const saleToCancel = sales.find(s => s.id === saleId);
    setCancellingSaleId(null);
    setCancelReason('');
    setCancelReasonError('');

    requestSupervisorAuth({
      title: `Autorizar Anulación: Venta ${saleToCancel?.saleNumber || ''}`,
      description: `Motivo: "${trimmedReason}". Total: ${saleToCancel ? formatBs(saleToCancel.totalBs) : ''} (${saleToCancel ? formatUSD(saleToCancel.totalUSD) : ''}). Se reintegrarán los artículos al inventario.`,
      actionType: 'anular_venta',
      onAuthorized: () => {
        cancelSale(saleId, trimmedReason);
      },
    });
  };

  // Export Daily Report to CSV
  const handleExportCSV = () => {
    const headers = [
      'N° Venta',
      'Hora',
      'Cliente',
      'C.I. / RIF',
      'Teléfono',
      'Dirección',
      'Método de Pago',
      'Moneda Pago',
      'Total Bs.',
      'Total USD (Ref)',
      'Tasa BCV',
      'Ganancia Bs.',
      'Ganancia USD',
      'Estado',
      'Motivo Anulación',
      'Fecha Anulación',
    ];

    const rows = daySales.map(s => [
      `"${s.saleNumber}"`,
      `"${new Date(s.date).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}"`,
      `"${(s.customerName || 'Cliente Ocasional').replace(/"/g, '""')}"`,
      `"${(s.customerIdDoc || '').replace(/"/g, '""')}"`,
      `"${(s.customerPhone || '').replace(/"/g, '""')}"`,
      `"${(s.customerAddress || '').replace(/"/g, '""')}"`,
      `"${s.paymentMethod}"`,
      `"${s.paymentCurrency}"`,
      s.totalBs.toFixed(2),
      s.totalUSD.toFixed(2),
      s.bcvRate.toFixed(2),
      s.profitBs.toFixed(2),
      s.profitUSD.toFixed(2),
      `"${s.status}"`,
      `"${(s.cancelledReason || '').replace(/"/g, '""')}"`,
      `"${s.cancelledAt ? new Date(s.cancelledAt).toLocaleString('es-VE') : ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cierre_caja_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const paymentLabels: Record<PaymentMethod, { label: string; icon: React.ElementType; color: string }> = {
    pago_movil: { label: 'Pago Móvil (Bs.)', icon: Smartphone, color: 'text-emerald-700 bg-emerald-50' },
    punto_debito: { label: 'Punto / Débito (Bs.)', icon: CreditCard, color: 'text-blue-700 bg-blue-50' },
    efectivo_bs: { label: 'Efectivo Bolívares', icon: Banknote, color: 'text-emerald-800 bg-emerald-100' },
    efectivo_usd: { label: 'Efectivo Divisas ($)', icon: DollarSign, color: 'text-green-800 bg-green-100' },
    fiado: { label: 'Crédito', icon: User, color: 'text-purple-700 bg-purple-50' },
    transferencia: { label: 'Transferencia (Bs.)', icon: CreditCard, color: 'text-slate-700 bg-slate-100' },
    mixto: { label: 'Pago Mixto', icon: ShoppingBag, color: 'text-amber-800 bg-amber-50' },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Header & Date Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-black text-slate-900">Cierre de Caja & Reportes Diarios</h2>
          </div>
          <p className="text-xs text-slate-500 font-semibold">
            Auditoría de ingresos en Bolívares y Dólares con desglose por Pago Móvil, Punto y Efectivo
          </p>
        </div>

        {/* Date Selector Shortcuts */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedDate === todayStr ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setSelectedDate(yesterdayStr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedDate === yesterdayStr ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ayer
            </button>
          </div>

          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="p-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            title="Exportar reporte del día a CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ventas Totales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-950 mt-2">
            {formatBs(metrics.totalBs)}
          </p>
          <div className="flex items-center space-x-1.5 mt-1">
            <span className="text-xs font-black text-emerald-700">Ref: {formatUSD(metrics.totalUSD)}</span>
            <span className="text-[11px] text-slate-400">({metrics.count} tickets)</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ganancia Estimada</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-950 mt-2">
            {formatBs(metrics.profitBs)}
          </p>
          <span className="text-xs font-black text-blue-700 block mt-1">
            Ref: {formatUSD(metrics.profitUSD)}
          </span>
        </div>

        {/* Efectivo Físico en Caja (Bs y $) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Efectivo en Gaveta</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">
            {formatBs(metrics.paymentTotals.efectivo_bs)}
          </p>
          <span className="text-xs font-black text-emerald-800 block mt-1">
            + {formatUSD(metrics.paymentTotals.efectivo_usd)} (Billetes $)
          </span>
        </div>

        {/* Ticket Promedio */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket Promedio</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">
            {formatBs(metrics.averageTicketBs)}
          </p>
          <span className="text-xs font-bold text-slate-400 block mt-1">
            Ref: {formatUSD(metrics.averageTicketUSD)} / cliente
          </span>
        </div>
      </div>

      {/* Payment Method Breakdown & Top Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Payment Methods Breakdown (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
            <span>Desglose por Formas de Pago</span>
          </h3>

          <div className="space-y-3">
            {/* Pago Móvil */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-center space-x-2.5">
                <Smartphone className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-800">Pago Móvil (Bs.)</span>
              </div>
              <span className="text-xs font-black text-emerald-950">
                {formatBs(metrics.paymentTotals.pago_movil_bs)}
              </span>
            </div>

            {/* Punto de Venta / Tarjeta */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 border border-blue-100">
              <div className="flex items-center space-x-2.5">
                <CreditCard className="w-4 h-4 text-blue-700" />
                <span className="text-xs font-bold text-slate-800">Punto de Venta / Débito</span>
              </div>
              <span className="text-xs font-black text-blue-950">
                {formatBs(metrics.paymentTotals.punto_debito_bs)}
              </span>
            </div>

            {/* Efectivo Bolívares */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center space-x-2.5">
                <Banknote className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-800">Efectivo Bolívares</span>
              </div>
              <span className="text-xs font-black text-slate-900">
                {formatBs(metrics.paymentTotals.efectivo_bs)}
              </span>
            </div>

            {/* Efectivo Dólares */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-green-50/70 border border-green-200">
              <div className="flex items-center space-x-2.5">
                <DollarSign className="w-4 h-4 text-green-700" />
                <span className="text-xs font-bold text-slate-800">Efectivo Dólares ($)</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-green-950 block">
                  {formatUSD(metrics.paymentTotals.efectivo_usd)}
                </span>
                <span className="text-[10px] font-semibold text-green-700">
                  Ref: {formatBs(metrics.paymentTotals.efectivo_usd * bcvRate)}
                </span>
              </div>
            </div>

            {/* Cuentas a Crédito */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50/60 border border-purple-100">
              <div className="flex items-center space-x-2.5">
                <User className="w-4 h-4 text-purple-700" />
                <span className="text-xs font-bold text-slate-800">Créditos (Por Cobrar)</span>
              </div>
              <span className="text-xs font-black text-purple-950">
                {formatBs(metrics.paymentTotals.fiado_bs)}
              </span>
            </div>
          </div>
        </div>

        {/* Top 5 Products of the Day (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-slate-900">
            Productos Más Vendidos del Día
          </h3>

          {metrics.topProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-xs font-bold text-slate-500">No hay ventas registradas en esta fecha</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {metrics.topProducts.map((p, index) => (
                <div key={p.name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-lg bg-slate-200 font-black text-xs text-slate-700 flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{p.name}</h4>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        {p.quantity} {p.unit} vendidos
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-slate-900 block leading-tight">
                      {formatBs(p.totalBs)}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {formatUSD(p.totalUSD)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Transactions List for the Day */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900">
            Historial de Ventas del Día ({daySales.length})
          </h3>
          <span className="text-xs text-slate-500 font-semibold">
            Fecha seleccionada: {selectedDate}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">N° Ticket</th>
                <th className="py-3 px-4">Hora</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Método de Pago</th>
                <th className="py-3 px-4 text-right">Total Bs.</th>
                <th className="py-3 px-4 text-right">Ref. USD</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {daySales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="font-bold text-slate-600">No hay ventas registradas para este día</p>
                  </td>
                </tr>
              ) : (
                daySales.map((s) => {
                  const isCancelled = s.status === 'anulada';
                  const pConfig = paymentLabels[s.paymentMethod] || {
                    label: s.paymentMethod,
                    icon: CreditCard,
                    color: 'text-slate-700 bg-slate-100',
                  };
                  const Icon = pConfig.icon;

                  return (
                    <tr key={s.id} className={`hover:bg-slate-50/80 transition-colors ${isCancelled ? 'opacity-50 bg-slate-50/40' : ''}`}>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {s.saleNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {new Date(s.date).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <div>{s.customerName || 'Cliente Ocasional'}</div>
                        {s.customerIdDoc && (
                          <div className="text-[10px] font-mono text-slate-500 font-normal">
                            {s.customerIdDoc} {s.customerPhone ? `• ${s.customerPhone}` : ''}
                          </div>
                        )}
                        {s.customerAddress && (
                          <div className="text-[10px] text-slate-400 font-normal truncate max-w-[160px]">
                            {s.customerAddress}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${pConfig.color}`}>
                          <Icon className="w-3 h-3" />
                          <span>{pConfig.label}</span>
                        </span>
                        {s.paymentReference && (
                          <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                            Ref: {s.paymentReference}
                          </span>
                        )}
                        {s.paymentMethod === 'mixto' && s.paymentSplits && (
                          <span className="block text-[10px] text-amber-700 font-semibold mt-0.5">
                            {s.paymentSplits.length} métodos combinados
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatBs(s.totalBs)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 font-bold">
                        {formatUSD(s.totalUSD)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isCancelled ? (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-red-100 text-red-700 border border-red-200">
                              <XCircle className="w-3 h-3 text-red-600 shrink-0" />
                              <span>Anulada</span>
                            </span>
                            {s.cancelledReason && (
                              <span
                                className="text-[10px] text-red-700 font-bold max-w-[130px] truncate mt-0.5 cursor-help"
                                title={`Motivo: ${s.cancelledReason}${s.cancelledAt ? `\nFecha: ${new Date(s.cancelledAt).toLocaleString('es-VE')}` : ''}${s.cancelledBy ? `\nPor: ${s.cancelledBy}` : ''}`}
                              >
                                {s.cancelledReason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                            Completada
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => setSelectedReceiptSale(s)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center space-x-1 ${
                              isCancelled
                                ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                            title={isCancelled ? `Ver Venta Anulada (Motivo: ${s.cancelledReason || 'Ver motivo'})` : "Ver / Reimprimir Ticket"}
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            {isCancelled && <span className="text-[10px] font-black">Ver</span>}
                          </button>

                          {!isCancelled && (
                            <button
                              onClick={() => {
                                setCancellingSaleId(s.id);
                                setCancelReason('');
                                setCancelReasonError('');
                              }}
                              className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                              title="Anular venta y reincorporar stock"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation & Reason Modal for Cancelling a Sale */}
      {cancellingSaleId && (() => {
        const saleBeingCancelled = sales.find(s => s.id === cancellingSaleId);
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 my-auto animate-in fade-in">
              <div className="flex items-center space-x-2 text-red-600 border-b border-slate-100 pb-3">
                <div className="p-2 bg-red-100 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    Anular Venta {saleBeingCancelled?.saleNumber || ''}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Se solicitará la clave del supervisor para confirmar
                  </p>
                </div>
              </div>

              {/* Sale Info Summary */}
              {saleBeingCancelled && (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Monto a anular:</span>
                    <span className="font-black text-slate-900">
                      {formatBs(saleBeingCancelled.totalBs)} / {formatUSD(saleBeingCancelled.totalUSD)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Cliente:</span>
                    <span className="font-bold text-slate-800">
                      {saleBeingCancelled.customerName || 'Cliente Ocasional'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Artículos a reincorporar al stock:</span>
                    <span className="font-black text-emerald-700">
                      {saleBeingCancelled.items.reduce((acc, it) => acc + it.quantity, 0)} unidades
                    </span>
                  </div>
                </div>
              )}

              {/* Reason Input & Quick Presets */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-800">
                  Motivo de la Anulación <span className="text-red-500">*</span>
                </label>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Error de cobro / cajero',
                    'Cliente devolvió / desistió',
                    'Producto equivocado',
                    'Falla en método de pago',
                    'Venta duplicada',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setCancelReason(preset);
                        setCancelReasonError('');
                      }}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer border ${
                        cancelReason === preset
                          ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    if (cancelReasonError) setCancelReasonError('');
                  }}
                  placeholder="Escriba o detalle el motivo específico de anulación..."
                  rows={2}
                  className={`w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:outline-hidden transition-all ${
                    cancelReasonError
                      ? 'border-red-400 bg-red-50/40 focus:ring-red-400'
                      : 'border-slate-300 focus:ring-red-500 focus:border-red-500 bg-white'
                  }`}
                />

                {cancelReasonError && (
                  <p className="text-[11px] font-bold text-red-600 flex items-center space-x-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{cancelReasonError}</span>
                  </p>
                )}
              </div>

              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
                Al confirmar con la clave de supervisor, todos los artículos de esta venta se reincorporarán automáticamente al inventario físico en el Kardex y la venta quedará registrada como <strong>ANULADA</strong> con este motivo.
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setCancellingSaleId(null);
                    setCancelReason('');
                    setCancelReasonError('');
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmCancel(cancellingSaleId)}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer shadow-xs flex items-center justify-center space-x-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Pedir Clave y Anular</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
