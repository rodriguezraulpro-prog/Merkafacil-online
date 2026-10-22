import React, { useEffect } from 'react';
import { CheckCircle2, Printer, X, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ConfirmedSaleNotice } from '../../types';

interface ConfirmedSaleNoticeBannerProps {
  notice: ConfirmedSaleNotice;
  onPrint?: () => void;
  onDismiss: () => void;
}

export const ConfirmedSaleNoticeBanner: React.FC<ConfirmedSaleNoticeBannerProps> = ({
  notice,
  onPrint,
  onDismiss,
}) => {
  const { formatBs, formatUSD } = useStore();

  // Auto-dismiss after 10 seconds if not interacted with
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 10000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div 
      className="mb-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-400/80 rounded-2xl p-3 sm:p-4 shadow-md shadow-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start sm:items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="text-xs sm:text-sm font-black text-emerald-950">
              ¡Venta Registrada y Confirmada con Éxito!
            </span>
            <span className="text-[11px] font-black uppercase bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
              Ticket #{notice.saleNumber}
            </span>
          </div>
          <div className="text-xs text-emerald-800 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
            <span>
              Total: <strong>Bs. {formatBs(notice.totalBs)}</strong> (${formatUSD(notice.totalUSD)})
            </span>
            <span>•</span>
            <span>Cliente: <strong>{notice.customerName || 'Cliente Ocasional'}</strong></span>
            {((notice.changeBs ?? 0) > 0.01 || (notice.changeUSD ?? 0) > 0.01) && (
              <>
                <span>•</span>
                <span className="text-emerald-900 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                  Vuelto: Bs. {formatBs(notice.changeBs ?? 0)} / $ {formatUSD(notice.changeUSD ?? 0)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            id="banner-print-receipt-btn"
            className="text-xs font-bold bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1.5 rounded-xl transition-colors flex items-center space-x-1.5 shadow-2xs cursor-pointer"
            title="Imprimir comprobante si el cliente lo requiere ahora"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-700" />
            <span>Imprimir Comprobante</span>
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-200/50 rounded-lg transition-colors cursor-pointer"
          title="Ocultar aviso (✕)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
