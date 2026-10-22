import React, { useEffect, useState } from 'react';
import { 
  Printer, 
  CheckCircle2, 
  X, 
  Receipt, 
  ArrowRight, 
  Banknote, 
  User, 
  CreditCard, 
  SlidersHorizontal,
  Clock,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Check
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Sale, ReceiptPrintMode } from '../../types';

interface SaleConfirmationModalProps {
  sale: Sale;
  onPrintReceipt: () => void;
  onDismissWithoutPrint: () => void;
}

export const SaleConfirmationModal: React.FC<SaleConfirmationModalProps> = ({
  sale,
  onPrintReceipt,
  onDismissWithoutPrint,
}) => {
  const { formatBs, formatUSD, settings, updateSettings } = useStore();
  const [selectedMode, setSelectedMode] = useState<ReceiptPrintMode>(
    settings.receiptPrintMode || 'ask'
  );
  const [showConfigOptions, setShowConfigOptions] = useState(false);
  const [showProductsDetails, setShowProductsDetails] = useState(false);

  // Keyboard shortcut listener: Enter = Imprimir Comprobante, Escape = No Imprimir
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        onPrintReceipt();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onDismissWithoutPrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrintReceipt, onDismissWithoutPrint]);

  const paymentLabels: Record<string, string> = {
    pago_movil: 'Pago Móvil (Bs.)',
    punto_debito: 'Punto de Venta / Débito',
    efectivo_bs: 'Efectivo Bolívares',
    efectivo_usd: 'Efectivo Divisas ($)',
    fiado: 'Crédito (Libreta)',
    transferencia: 'Transferencia Bancaria',
    mixto: 'Pago Mixto / Combinado',
  };

  const handleModeChange = (newMode: ReceiptPrintMode) => {
    setSelectedMode(newMode);
    updateSettings({ receiptPrintMode: newMode });
  };

  const totalItemsCount = sale.items.reduce((acc, item) => acc + item.quantity, 0);

  const formattedDateTime = new Date(sale.date).toLocaleString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-confirm-title"
      >
        {/* Celebration Header - Vibrant Green Gradient */}
        <div className="relative bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-700 text-white pt-7 pb-6 px-6 text-center">
          <button
            type="button"
            onClick={onDismissWithoutPrint}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-full transition-colors cursor-pointer"
            title="Cerrar sin imprimir (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Centered White Circle Badge with Checkmark */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white text-emerald-600 shadow-lg shadow-black/10 mb-3 transition-transform hover:scale-105">
            <Check className="w-10 h-10 stroke-[3] text-emerald-600" />
          </div>

          <h3 id="sale-confirm-title" className="text-2xl font-black tracking-tight text-white">
            ¡Venta Registrada con Éxito!
          </h3>

          {/* Translucent pill badge */}
          <div className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-emerald-50 text-xs font-medium border border-white/20 shadow-xs">
            <span>Ticket <strong className="font-bold text-white">#{sale.saleNumber}</strong></span>
            <span>•</span>
            <span>{formattedDateTime}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* Main Sale Summary Card */}
          <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 sm:p-5">
            
            {/* Total Cobrado Display */}
            <div className="text-center pb-4 border-b border-slate-200/80">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block">
                Total Cobrado
              </span>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-1 tracking-tight">
                Bs. {formatBs(sale.totalBs)}
              </div>
              <div className="mt-1.5 inline-flex items-center gap-1.5 text-base sm:text-lg font-black text-emerald-600 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200/80 shadow-xs">
                <span>$ {formatUSD(sale.totalUSD)}</span>
                {sale.bcvRate > 0 && (
                  <span className="text-[11px] font-normal text-slate-400 border-l border-emerald-200 pl-1.5">
                    Tasa: Bs. {formatBs(sale.bcvRate)}
                  </span>
                )}
              </div>
            </div>

            {/* Structured Details Table / Rows */}
            <div className="divide-y divide-slate-200/70 text-xs mt-3">
              
              {/* Cliente */}
              <div className="py-2.5 flex items-center justify-between gap-3">
                <div className="text-slate-500 font-medium flex items-center gap-1.5 shrink-0">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Cliente:</span>
                </div>
                <div className="font-bold text-slate-800 text-right truncate">
                  {sale.customerName || 'Cliente Ocasional'}
                  {sale.customerIdDoc ? (
                    <span className="text-slate-500 font-normal ml-1">({sale.customerIdDoc})</span>
                  ) : null}
                </div>
              </div>

              {/* Cajero / Vendedor */}
              <div className="py-2.5 flex items-center justify-between gap-3">
                <div className="text-slate-500 font-medium flex items-center gap-1.5 shrink-0">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Cajero:</span>
                </div>
                <div className="font-bold text-slate-800 text-right">
                  {sale.cashierName || 'Caja Principal'}
                </div>
              </div>

              {/* Método de Pago */}
              <div className="py-2.5 flex items-center justify-between gap-3">
                <div className="text-slate-500 font-medium flex items-center gap-1.5 shrink-0">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span>Método de Pago:</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-800">
                    {paymentLabels[sale.paymentMethod] || sale.paymentMethod}
                  </span>
                  {sale.paymentReference && (
                    <span className="block text-[10px] text-slate-500 font-mono">
                      Ref: {sale.paymentReference}
                    </span>
                  )}
                  {sale.paymentSplits && sale.paymentSplits.length > 0 && (
                    <div className="text-[10px] text-slate-500 mt-0.5 space-y-0.5">
                      {sale.paymentSplits.map((split, idx) => (
                        <div key={idx}>
                          {paymentLabels[split.method] || split.method}: {split.currency === 'Bs.' ? `Bs. ${formatBs(split.amount)}` : `$ ${formatUSD(split.amount)}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Vuelto / Cambio (if applicable) */}
              {(sale.changeBs > 0.01 || sale.changeUSD > 0.01) && (
                <div className="py-2.5 bg-emerald-50/70 -mx-4 px-4 sm:-mx-5 sm:px-5 flex items-center justify-between gap-3 text-emerald-950">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 shrink-0">
                    <Banknote className="w-4 h-4 text-emerald-700" />
                    <span>Vuelto al Cliente:</span>
                  </div>
                  <div className="text-right font-black text-emerald-700">
                    {sale.changeBs > 0.01 && <div>Bs. {formatBs(sale.changeBs)}</div>}
                    {sale.changeUSD > 0.01 && <div className="text-[11px] text-emerald-800">$ {formatUSD(sale.changeUSD)}</div>}
                  </div>
                </div>
              )}

              {/* Expandable Products Row */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowProductsDetails(!showProductsDetails)}
                  className="w-full flex items-center justify-between text-slate-600 hover:text-slate-900 font-medium py-1 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                    <span>Productos vendidos ({sale.items.length} ítems, {totalItemsCount} unid.)</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
                    <span>{showProductsDetails ? 'Ocultar' : 'Ver detalle'}</span>
                    {showProductsDetails ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </button>

                {/* Expanded Products Table */}
                {showProductsDetails && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2.5 space-y-2 animate-in fade-in duration-100">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                          <th className="pb-1">Cant.</th>
                          <th className="pb-1">Producto</th>
                          <th className="pb-1 text-right">Total Bs.</th>
                          <th className="pb-1 text-right">Total $</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sale.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1 font-mono font-bold text-slate-700">
                              {item.quantity} {item.unit || ''}
                            </td>
                            <td className="py-1 font-medium text-slate-800 max-w-[140px] truncate" title={item.productName}>
                              {item.productName}
                            </td>
                            <td className="py-1 text-right font-bold text-slate-800">
                              Bs. {formatBs(item.subtotalBs)}
                            </td>
                            <td className="py-1 text-right text-emerald-600 font-semibold">
                              ${formatUSD(item.subtotalUSD)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Optional Receipt Prompt Banner */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-start gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shrink-0 mt-0.5">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-blue-950">
                ¿Desea imprimir comprobante o factura?
              </h4>
              <p className="text-[11px] text-blue-800/90 mt-0.5 leading-relaxed">
                La venta ya quedó asentada en el sistema e inventario. Si su cliente no necesita papel, puede continuar directamente sin imprimir.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* Primary Action: Print Receipt */}
            <button
              type="button"
              id="confirm-print-receipt-btn"
              onClick={onPrintReceipt}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer text-sm"
              title="Ver e imprimir ticket de venta (Presione Enter)"
            >
              <Printer className="w-4 h-4" />
              <span>Sí, Imprimir Comprobante</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-emerald-700/80 rounded text-emerald-100">
                ↵ Enter
              </kbd>
            </button>

            {/* Secondary Action: Only Register / Continue */}
            <button
              type="button"
              id="confirm-dismiss-no-print-btn"
              onClick={onDismissWithoutPrint}
              className="w-full bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer text-sm border border-slate-200"
              title="Continuar sin imprimir comprobante (Presione Esc)"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Listo / No Imprimir</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-slate-200 rounded text-slate-600">
                Esc
              </kbd>
            </button>
          </div>

          {/* Quick Preference Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <button
              type="button"
              onClick={() => setShowConfigOptions(!showConfigOptions)}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer py-1"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Configuración de impresión al cobrar</span>
              <span className="text-[10px] font-bold text-slate-400">({showConfigOptions ? 'ocultar' : 'cambiar'})</span>
            </button>
            <span className="text-[10px] text-slate-400">
              Modo: <strong>{selectedMode === 'ask' ? 'Opcional (Preguntar)' : selectedMode === 'always' ? 'Siempre imprimir' : 'Solo registrar'}</strong>
            </span>
          </div>

          {/* Collapsible Quick Mode Selector */}
          {showConfigOptions && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs animate-in fade-in duration-100">
              <span className="font-bold text-slate-700 block text-[11px]">
                Seleccione el comportamiento preferido para próximas ventas:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleModeChange('ask')}
                  className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                    selectedMode === 'ask' 
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-extrabold text-[11px]">Preguntar siempre</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Opcional con 1 clic (Recomendado)</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('always')}
                  className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                    selectedMode === 'always' 
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-extrabold text-[11px]">Siempre imprimir</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Abre ticket directo</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('never')}
                  className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                    selectedMode === 'never' 
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-extrabold text-[11px]">Solo registrar</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Sin ventana de ticket</div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
