import React, { useEffect, useState } from 'react';
import { Printer, X, CheckCircle2, ShoppingBag, Zap, XCircle, AlertTriangle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Sale } from '../types';

interface TicketModalProps {
  sale: Sale;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({ sale, onClose }) => {
  const { settings, formatBs, formatUSD } = useStore();
  const [autoPrinted, setAutoPrinted] = useState(false);
  const isCancelled = sale.status === 'anulada';

  const handlePrint = () => {
    window.print();
  };

  // Auto-print receipt upon sale completion if enabled in settings (only for active sales)
  useEffect(() => {
    if (!isCancelled && settings.autoPrintReceipt !== false && !autoPrinted) {
      setAutoPrinted(true);
      const timer = setTimeout(() => {
        window.print();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [settings.autoPrintReceipt, autoPrinted, isCancelled]);

  // Tag body with has-receipt-open class while modal is mounted for clean print isolation
  useEffect(() => {
    document.body.classList.add('has-receipt-open');
    return () => {
      document.body.classList.remove('has-receipt-open');
    };
  }, []);

  // Keyboard shortcut to quickly dismiss with ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const formattedDate = new Date(sale.date).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const paymentLabels: Record<string, string> = {
    pago_movil: 'Pago Móvil (Bs.)',
    punto_debito: 'Punto de Venta / Débito',
    efectivo_bs: 'Efectivo Bolívares',
    efectivo_usd: 'Efectivo Divisas ($)',
    fiado: 'Crédito / Cuenta por Cobrar',
    transferencia: 'Transferencia Bancaria',
    mixto: 'Pago Mixto / Combinado',
  };

  // Cálculo de Desglose Fiscal (Exento, Base Imponible, IVA 16%, IGTF 3%)
  const exemptItems = sale.items.filter(i => (i.taxType || 'exento') === 'exento');
  const gravadoItems = sale.items.filter(i => i.taxType === 'gravado');

  const exemptAmountBs = sale.exemptAmountBs !== undefined 
    ? sale.exemptAmountBs 
    : exemptItems.reduce((sum, i) => sum + i.subtotalBs, 0);
  const exemptAmountUSD = sale.exemptAmountUSD !== undefined 
    ? sale.exemptAmountUSD 
    : exemptItems.reduce((sum, i) => sum + i.subtotalUSD, 0);

  const taxableAmountBs = sale.taxableAmountBs !== undefined 
    ? sale.taxableAmountBs 
    : (gravadoItems.reduce((sum, i) => sum + i.subtotalBs, 0) / 1.16);
  const taxableAmountUSD = sale.taxableAmountUSD !== undefined 
    ? sale.taxableAmountUSD 
    : (gravadoItems.reduce((sum, i) => sum + i.subtotalUSD, 0) / 1.16);

  const vatAmountBs = sale.vatAmountBs !== undefined 
    ? sale.vatAmountBs 
    : (taxableAmountBs * 0.16);
  const vatAmountUSD = sale.vatAmountUSD !== undefined 
    ? sale.vatAmountUSD 
    : (taxableAmountUSD * 0.16);

  const igtfAmountUSD = sale.igtfAmountUSD || 0;
  const igtfAmountBs = sale.igtfAmountBs || (igtfAmountUSD * sale.bcvRate);

  const finalTotalUSD = sale.totalUSD + igtfAmountUSD;
  const finalTotalBs = sale.totalBs + igtfAmountBs;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:static print:inset-auto print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:w-full">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200 print:shadow-none print:border-none print:max-w-none print:w-full print:m-0 print:p-0 print:rounded-none my-auto">
        
        {/* Modal Header Actions (Hidden when printing) */}
        <div className={`px-5 py-3.5 text-white flex items-center justify-between print:hidden ${
          isCancelled ? 'bg-red-950 border-b border-red-800' : 'bg-slate-900'
        }`}>
          <div className="flex items-center space-x-2">
            {isCancelled ? (
              <XCircle className="w-5 h-5 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span className="font-extrabold text-sm">Ticket {sale.saleNumber}</span>
            {isCancelled ? (
              <span className="text-[10px] font-black bg-red-600 text-white px-2.5 py-0.5 rounded-full flex items-center space-x-1 uppercase tracking-wide">
                <span>Venta Anulada</span>
              </span>
            ) : (
              settings.autoPrintReceipt !== false && (
                <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  <span>Auto-impreso</span>
                </span>
              )
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className={`px-3 py-1.5 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                isCancelled ? 'bg-red-700 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div id="receipt-paper" className="p-6 text-slate-800 font-mono text-xs space-y-4 max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0">
          
          {/* Header */}
          <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
            <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
              {settings.name}
            </h2>
            {settings.rif && (
              <p className="text-[11px] font-bold text-slate-600">RIF: {settings.rif}</p>
            )}
            <p className="text-[11px] text-slate-500">{settings.address}</p>
            {settings.phone && (
              <p className="text-[11px] text-slate-500">Telf: {settings.phone}</p>
            )}
            <div className="pt-2 text-[10px] text-slate-700 font-bold uppercase tracking-wider">
              COMPROBANTE DE COMPRA
            </div>

            {/* Aviso Obligatorio de No Fiscalidad (Normativa SENIAT) */}
            {settings.showNonFiscalNotice !== false && (
              <div className="mt-2 py-1 px-2 border-y-2 border-dashed border-slate-400 bg-slate-100 text-center space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-900">
                  *** COMPROBANTE NO FISCAL ***
                </p>
                <p className="text-[8.5px] font-bold text-slate-700 uppercase tracking-tight">
                  SIN VALOR TRIBUTARIO • CONTROL INTERNO
                </p>
              </div>
            )}

            {/* Banner Destacado si la Venta está Anulada */}
            {isCancelled && (
              <div className="mt-3 p-3 bg-red-50 border-2 border-red-600 rounded-xl text-center space-y-2">
                <div className="flex items-center justify-center space-x-1.5 text-red-700 font-black text-xs uppercase tracking-wider">
                  <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>*** COMPROBANTE ANULADO ***</span>
                </div>
                <div className="bg-white/95 border border-red-200 rounded-lg p-2.5 text-left text-[11px] space-y-1.5">
                  <div>
                    <span className="font-black text-red-700 uppercase text-[9.5px] block tracking-wide">
                      Motivo de Anulación:
                    </span>
                    <p className="font-extrabold text-slate-900 leading-snug bg-red-50/50 p-1.5 rounded border border-red-100">
                      {sale.cancelledReason || 'Anulada sin motivo especificado'}
                    </p>
                  </div>
                  {sale.cancelledAt && (
                    <div className="text-[10px] text-slate-600 pt-0.5 border-t border-slate-100 flex justify-between">
                      <span className="text-slate-500">Fecha de anulación:</span>
                      <span className="font-bold text-slate-800">
                        {new Date(sale.cancelledAt).toLocaleString('es-VE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    </div>
                  )}
                  {sale.cancelledBy && (
                    <div className="text-[10px] text-slate-600 flex justify-between">
                      <span className="text-slate-500">Autorizado / Anulado por:</span>
                      <span className="font-bold text-slate-800">{sale.cancelledBy}</span>
                    </div>
                  )}
                </div>
                <p className="text-[8.5px] text-red-700 font-bold uppercase tracking-tight">
                  Mercancía reincorporada al stock de inventario • Sin efecto contable
                </p>
              </div>
            )}
          </div>

          {/* Ticket Metadata */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2">
            <div className="flex justify-between">
              <span className="text-slate-500">N° Ticket:</span>
              <span className="font-bold text-slate-900">{sale.saleNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Fecha y Hora:</span>
              <span className="text-slate-900">{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cliente:</span>
              <span className="font-bold text-slate-900">{sale.customerName || 'Cliente Ocasional'}</span>
            </div>
            {sale.customerIdDoc && (
              <div className="flex justify-between">
                <span className="text-slate-500">C.I. / RIF:</span>
                <span className="font-bold text-slate-800">{sale.customerIdDoc}</span>
              </div>
            )}
            {sale.customerPhone && (
              <div className="flex justify-between">
                <span className="text-slate-500">Teléfono:</span>
                <span className="text-slate-800">{sale.customerPhone}</span>
              </div>
            )}
            {sale.customerAddress && (
              <div className="flex justify-between">
                <span className="text-slate-500">Dirección:</span>
                <span className="text-slate-800 text-right max-w-[200px] truncate">{sale.customerAddress}</span>
              </div>
            )}
            <div className="flex justify-between bg-emerald-50 px-1 py-0.5 rounded text-emerald-900 font-bold">
              <span>Tasa BCV Aplicada:</span>
              <span>Bs. {sale.bcvRate.toFixed(2)}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2 border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between font-bold text-[10px] text-slate-400 uppercase">
              <span>Cant. / Descripción</span>
              <span>Total Bs. (Ref $)</span>
            </div>
            
            <div className="space-y-2 text-[11px]">
              {sale.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 leading-tight">
                      {item.quantity % 1 !== 0 ? `${item.quantity} kg` : `${item.quantity}`} x {item.productName}{' '}
                      <span className="font-black text-[10px] text-slate-700">
                        {(item.taxType || 'exento') === 'gravado' ? '(G)' : '(E)'}
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      a {formatBs(item.unitPriceBs)} ({formatUSD(item.unitPriceUSD)}{item.quantity % 1 !== 0 ? '/kg' : ''})
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-900">{formatBs(item.subtotalBs)}</p>
                    <p className="text-[10px] text-slate-500">{formatUSD(item.subtotalUSD)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals & Payments */}
          <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3 text-[11px]">
            {/* Desglose de Impuestos (Normativa SENIAT) */}
            <div className="space-y-1 py-1 border-b border-dashed border-slate-200 text-[10.5px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Exento (E):</span>
                <span className="font-semibold text-slate-800">
                  {formatBs(exemptAmountBs)} <span className="text-[9.5px] text-slate-400 font-normal">({formatUSD(exemptAmountUSD)})</span>
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Gravado (Base Imponible):</span>
                <span className="font-semibold text-slate-800">
                  {formatBs(taxableAmountBs)} <span className="text-[9.5px] text-slate-400 font-normal">({formatUSD(taxableAmountUSD)})</span>
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>IVA (16%):</span>
                <span className="font-semibold text-slate-800">
                  {formatBs(vatAmountBs)} <span className="text-[9.5px] text-slate-400 font-normal">({formatUSD(vatAmountUSD)})</span>
                </span>
              </div>
              {igtfAmountUSD > 0 && (
                <div className="flex justify-between text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded font-bold">
                  <span>IGTF (3% Divisas Efectivo):</span>
                  <span>+{formatBs(igtfAmountBs)} ({formatUSD(igtfAmountUSD)})</span>
                </div>
              )}
            </div>

            {sale.discountUSD > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Descuento Otorgado:</span>
                <span>-{formatBs(sale.discountBs)} (-{formatUSD(sale.discountUSD)})</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
              <span>TOTAL A PAGAR:</span>
              <div className="text-right">
                <span className="block text-emerald-800">{formatBs(finalTotalBs)}</span>
                <span className="text-[11px] font-extrabold text-slate-500 block">
                  Ref: {formatUSD(finalTotalUSD)}
                </span>
              </div>
            </div>

            <div className="pt-2 text-[10px] space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Forma de Pago:</span>
                <span className="font-bold text-slate-900">
                  {paymentLabels[sale.paymentMethod] || sale.paymentMethod}
                </span>
              </div>
              {sale.paymentReference && (
                <div className="flex justify-between">
                  <span>Nº de Referencia:</span>
                  <span className="font-extrabold text-slate-900 font-mono">
                    {sale.paymentReference}
                  </span>
                </div>
              )}
              {sale.paymentSplits && sale.paymentSplits.length > 0 && (
                <div className="py-1 my-1 border-y border-dashed border-slate-200 space-y-1">
                  <span className="font-bold text-slate-700 block text-[9px] uppercase tracking-wider">
                    {sale.paymentMethod === 'fiado' ? 'Desglose de Pago y Crédito en Libreta:' : 'Desglose de Pago:'}
                  </span>
                  {sale.paymentSplits.map((split, idx) => (
                    <div key={idx} className="flex justify-between text-[9.5px]">
                      <span className={split.method === 'fiado' ? 'font-bold text-purple-900' : ''}>
                        • {split.method === 'fiado' ? 'Queda debiendo a Crédito' : (paymentLabels[split.method] || split.method)}
                        {split.reference ? ` (Ref: ${split.reference})` : ''}
                      </span>
                      <span className={`font-bold ${split.method === 'fiado' ? 'text-purple-950 font-black' : 'text-slate-800'}`}>
                        {split.currency === '$' ? formatUSD(split.amount) : formatBs(split.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between">
                <span>{sale.paymentMethod === 'fiado' ? 'Abonado al Momento:' : `Monto Recibido (${sale.paymentCurrency}):`}</span>
                <span className="font-bold text-slate-900">
                  {sale.paymentMethod === 'fiado' && sale.amountPaid <= 0
                    ? 'Bs. 0,00 (100% Crédito)'
                    : sale.paymentCurrency === 'Mixto' 
                    ? formatBs(sale.amountPaid) 
                    : `${sale.paymentCurrency} ${sale.amountPaid.toFixed(2)}`}
                </span>
              </div>
              {(sale.changeBs > 0 || sale.changeUSD > 0) && (
                <div className="flex justify-between font-bold text-emerald-800">
                  <span>Vuelto Entregado:</span>
                  <span>
                    {formatBs(sale.changeBs)}
                    {sale.changeUSD > 0 ? ` / ${formatUSD(sale.changeUSD)}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Note - Mensaje único configurable y Leyenda Legal */}
          <div className="text-center space-y-2 pt-1 text-[10px] text-slate-500">
            {isCancelled ? (
              <div className="py-2 px-3 bg-red-100 text-red-900 border border-red-300 rounded-lg space-y-0.5">
                <p className="font-black text-[11px] uppercase tracking-wider">*** ESTA VENTA FUE ANULADA ***</p>
                <p className="text-[9px] font-bold">No posee valor comercial, legal ni fiscal</p>
              </div>
            ) : (
              <p className="font-bold text-slate-700 text-[11px] leading-snug">{settings.receiptFooter}</p>
            )}

            {settings.showNonFiscalNotice !== false && (
              <div className="pt-2 border-t border-dashed border-slate-300 space-y-0.5">
                <p className="font-black text-slate-800 text-[9.5px] uppercase tracking-wider">
                  «SIN VALOR TRIBUTARIO / COMPROBANTE NO FISCAL»
                </p>
                <p className="text-[8px] text-slate-400 uppercase tracking-tight">
                  Documento emitido para control y uso interno del establecimiento
                </p>
              </div>
            )}

            <p className="text-[8.5px] text-slate-400">Sistema Bodega & Minimarket • Modo Local</p>
          </div>
        </div>

        {/* Print Button for Bottom Modal on Mobile */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col space-y-2 print:hidden">
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs ${
                isCancelled ? 'bg-red-700 hover:bg-red-600 active:bg-red-800' : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>{isCancelled ? 'Imprimir Copia de Anulación' : 'Imprimir Nuevamente'}</span>
            </button>
            <button
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cerrar (Esc)
            </button>
          </div>
          <p className="text-center text-[10.5px] text-slate-400 font-sans">
            Presione la tecla <kbd className="bg-white px-1.5 py-0.5 border border-slate-200 rounded text-slate-700 font-mono text-[10px] shadow-2xs">ESC</kbd> o pulse Cerrar para continuar con la siguiente venta
          </p>
        </div>
      </div>
    </div>
  );
};
