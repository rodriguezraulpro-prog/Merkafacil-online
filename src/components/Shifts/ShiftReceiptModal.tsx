import React, { useRef } from 'react';
import { Printer, X, CheckCircle2, AlertTriangle, ArrowDownRight, ArrowUpRight, Clock, ShieldCheck, DollarSign } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CashShift } from '../../types';

interface ShiftReceiptModalProps {
  shift: CashShift | null;
  onClose: () => void;
}

export const ShiftReceiptModal: React.FC<ShiftReceiptModalProps> = ({ shift, onClose }) => {
  const { settings, formatBs, formatUSD } = useStore();
  const printRef = useRef<HTMLDivElement>(null);

  // Tag body with has-receipt-open class while modal is mounted for clean print isolation
  React.useEffect(() => {
    document.body.classList.add('has-receipt-open');
    return () => {
      document.body.classList.remove('has-receipt-open');
    };
  }, []);

  if (!shift) return null;

  const handlePrint = () => {
    window.print();
  };

  const isCuadrado = Math.abs(shift.differenceBs || 0) < 0.05 && Math.abs(shift.differenceUSD || 0) < 0.05;
  const isSobrante = (shift.differenceBs || 0) > 0.05 || (shift.differenceUSD || 0) > 0.05;
  const isFaltante = (shift.differenceBs || 0) < -0.05 || (shift.differenceUSD || 0) < -0.05;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 print:static print:inset-auto print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:w-full">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 print:shadow-none print:border-none print:max-w-none print:w-full print:m-0 print:p-0 print:rounded-none">
        
        {/* Modal Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 print:hidden">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Printer className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Arqueo y Cierre de Caja</h3>
              <p className="text-[11px] text-slate-500">Comprobante Oficial de Turno #{shift.shiftNumber}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Ticket Receipt */}
        <div 
          ref={printRef}
          id="receipt-paper"
          className="mt-4 font-mono text-xs text-slate-800 bg-amber-50/40 p-4 rounded-xl border border-dashed border-slate-300 print:mt-0 print:bg-white print:p-0 print:border-none print:overflow-visible"
        >
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-400 space-y-1">
            <h2 className="font-black text-sm uppercase tracking-wide text-slate-900">{settings.name}</h2>
            {settings.rif && <p className="text-[11px]">RIF: {settings.rif}</p>}
            <p className="text-[11px]">{settings.address}</p>
            {settings.phone && <p className="text-[11px]">Telf: {settings.phone}</p>}
            <div className="pt-2">
              <span className="font-extrabold uppercase bg-slate-900 text-white px-2 py-0.5 rounded text-[11px]">
                COMPROBANTE DE CIERRE DE CAJA (CORTE Z)
              </span>
            </div>
          </div>

          {/* Turno Info */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-600">TURNO:</span>
              <span className="font-bold text-slate-900">#{shift.shiftNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">APERTURA:</span>
              <span className="font-bold">{new Date(shift.openedAt).toLocaleString('es-VE')}</span>
            </div>
            {shift.closedAt && (
              <div className="flex justify-between">
                <span className="text-slate-600">CIERRE:</span>
                <span className="font-bold">{new Date(shift.closedAt).toLocaleString('es-VE')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-600">CAJERO / APERTURA:</span>
              <span className="font-bold">{shift.openedByUserName}</span>
            </div>
            {shift.closedByUserName && (
              <div className="flex justify-between">
                <span className="text-slate-600">RESPONSABLE CIERRE:</span>
                <span className="font-bold">{shift.closedByUserName}</span>
              </div>
            )}
          </div>

          {/* Resumen de Ventas */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="font-bold uppercase text-slate-900 mb-1">RESUMEN DE FACTURACIÓN:</div>
            <div className="flex justify-between">
              <span>Total Tickets / Ventas:</span>
              <span className="font-bold">{shift.totalSalesCount ?? 0}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>TOTAL VENTAS (Bs.):</span>
              <span>{formatBs(shift.totalSalesBs ?? 0)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>TOTAL VENTAS ($ USD):</span>
              <span>{formatUSD(shift.totalSalesUSD ?? 0)}</span>
            </div>
          </div>

          {/* Desglose por Formas de Pago */}
          {shift.paymentSummary && (
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="font-bold uppercase text-slate-900 mb-1">COBROS POR MÉTODO:</div>
              <div className="flex justify-between">
                <span>Efectivo Bs:</span>
                <span>{formatBs(shift.paymentSummary.efectivoBs)}</span>
              </div>
              <div className="flex justify-between">
                <span>Efectivo USD:</span>
                <span>{formatUSD(shift.paymentSummary.efectivoUSD)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pago Móvil:</span>
                <span>{formatBs(shift.paymentSummary.pagoMovilBs)}</span>
              </div>
              <div className="flex justify-between">
                <span>Punto Débito:</span>
                <span>{formatBs(shift.paymentSummary.puntoDebitoBs)}</span>
              </div>
              <div className="flex justify-between">
                <span>Transferencia:</span>
                <span>{formatBs(shift.paymentSummary.transferenciaBs)}</span>
              </div>
              {shift.paymentSummary.fiadoBs > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Crédito / Cuentas por Cobrar:</span>
                  <span>{formatBs(shift.paymentSummary.fiadoBs)}</span>
                </div>
              )}
            </div>
          )}

          {/* Arqueo de Caja (Fondo + Esperado vs Contado) */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1.5 text-[11px]">
            <div className="font-bold uppercase text-slate-900">ARQUEO FÍSICO DE EFECTIVO:</div>
            
            <div className="bg-white p-2 rounded border border-slate-200 space-y-1">
              <div className="font-bold text-slate-800">EN BOLÍVARES (Bs.):</div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fondo Inicial:</span>
                <span>{formatBs(shift.initialCashBs)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Saldo Esperado en Caja:</span>
                <span className="font-bold">{formatBs(shift.expectedCashBs ?? shift.initialCashBs)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Saldo Físico Contado:</span>
                <span className="font-black text-slate-900">{formatBs(shift.countedCashBs ?? 0)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-100 font-bold">
                <span>DIFERENCIA:</span>
                <span className={`${
                  (shift.differenceBs || 0) < 0 ? 'text-rose-600' : (shift.differenceBs || 0) > 0 ? 'text-emerald-700' : 'text-slate-800'
                }`}>
                  {(shift.differenceBs || 0) > 0 ? '+' : ''}{formatBs(shift.differenceBs ?? 0)}
                </span>
              </div>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200 space-y-1 mt-2">
              <div className="font-bold text-slate-800">EN DÓLARES ($ USD EFECTIVO):</div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fondo Inicial:</span>
                <span>{formatUSD(shift.initialCashUSD)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Saldo Esperado en Caja:</span>
                <span className="font-bold">{formatUSD(shift.expectedCashUSD ?? shift.initialCashUSD)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Saldo Físico Contado:</span>
                <span className="font-black text-slate-900">{formatUSD(shift.countedCashUSD ?? 0)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-100 font-bold">
                <span>DIFERENCIA:</span>
                <span className={`${
                  (shift.differenceUSD || 0) < 0 ? 'text-rose-600' : (shift.differenceUSD || 0) > 0 ? 'text-emerald-700' : 'text-slate-800'
                }`}>
                  {(shift.differenceUSD || 0) > 0 ? '+' : ''}{formatUSD(shift.differenceUSD ?? 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Resultado del Cuadre */}
          <div className="pt-3 pb-2 text-center">
            {isCuadrado ? (
              <div className="inline-flex items-center space-x-1 text-emerald-700 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>✓ CAJA CUADRADA EXITOSAMENTE</span>
              </div>
            ) : isSobrante ? (
              <div className="inline-flex items-center space-x-1 text-blue-700 font-bold">
                <ArrowUpRight className="w-4 h-4" />
                <span>▲ SOBRANTE DE CAJA REGISTRADO</span>
              </div>
            ) : (
              <div className="inline-flex items-center space-x-1 text-rose-700 font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>▼ FALTANTE EN ARQUEO DE CAJA</span>
              </div>
            )}
          </div>

          {shift.notes && (
            <div className="mt-2 text-[10px] text-slate-600 border-t border-slate-300 pt-1">
              <span className="font-bold">Observaciones:</span> {shift.notes}
            </div>
          )}

          {/* Footer signature line */}
          <div className="mt-6 pt-6 border-t border-slate-300 grid grid-cols-2 gap-4 text-center text-[10px] text-slate-500">
            <div>
              <div className="border-b border-slate-400 pb-4"></div>
              <span className="block mt-1 font-bold">Firma Cajero</span>
            </div>
            <div>
              <div className="border-b border-slate-400 pb-4"></div>
              <span className="block mt-1 font-bold">Firma Supervisor</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-4 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Aceptar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
