import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, MessageCircle, Printer, CheckCircle2, Clock, AlertCircle, ShoppingBag, Receipt, ArrowDownRight, Phone } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CreditRecord, CreditPayment } from '../../types';

interface CustomerCreditDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  onOpenPaymentModal: (record: CreditRecord) => void;
}

export const CustomerCreditDetailModal: React.FC<CustomerCreditDetailModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  onOpenPaymentModal,
}) => {
  const { credits, bcvRate, formatUSD, formatBs, settings } = useStore();
  const [activeSubTab, setActiveSubTab] = useState<'tickets' | 'payments'>('tickets');

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('has-receipt-open');
      return () => {
        document.body.classList.remove('has-receipt-open');
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Find all credit records associated with this customer
  const customerRecords = credits.filter(
    c => c.customerId === customerId || c.customerName.toLowerCase() === customerName.toLowerCase()
  );

  const totalOriginalUSD = customerRecords.reduce((sum, r) => sum + r.originalAmountUSD, 0);
  const totalBalanceUSD = customerRecords
    .filter(r => r.status !== 'pagado')
    .reduce((sum, r) => sum + r.currentBalanceUSD, 0);
  const totalBalanceBs = totalBalanceUSD * bcvRate;

  // Flatten all payments
  const allPayments: (CreditPayment & { saleNumber?: string; recordId: string })[] = [];
  customerRecords.forEach(r => {
    r.payments.forEach(p => {
      allPayments.push({
        ...p,
        saleNumber: r.saleNumber,
        recordId: r.id,
      });
    });
  });

  // Sort payments by date descending
  allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPaidUSD = allPayments.reduce((sum, p) => sum + p.amountUSD, 0);

  const primaryRecord = customerRecords[0];
  const phone = primaryRecord?.customerPhone || '';
  const idDoc = primaryRecord?.customerIdDoc || '';
  const address = primaryRecord?.customerAddress || '';

  // WhatsApp Account Statement
  const handleShareStatement = () => {
    const rawPhone = phone.replace(/\D/g, '');
    let intlPhone = rawPhone;
    if (rawPhone.startsWith('0')) {
      intlPhone = `58${rawPhone.slice(1)}`;
    } else if (!rawPhone.startsWith('58') && rawPhone.length === 10) {
      intlPhone = `58${rawPhone}`;
    }

    const pendingListText = customerRecords
      .filter(r => r.status !== 'pagado')
      .map(
        r => `• ${new Date(r.date).toLocaleDateString('es-VE')}: ${r.description} -> Saldo: ${formatUSD(r.currentBalanceUSD)}`
      )
      .join('\n');

    const text = 
`🏪 *${settings.name}*
📋 *ESTADO DE CUENTA DE CRÉDITOS*
-----------------------------------------
👤 *Cliente:* ${customerName} ${idDoc ? `(${idDoc})` : ''}
📅 *Fecha:* ${new Date().toLocaleDateString('es-VE')}
💵 *Tasa BCV Referencia:* ${bcvRate.toFixed(2)} Bs/$
-----------------------------------------
${totalBalanceUSD <= 0.01 
  ? '✅ *ESTADO:* ¡Usted se encuentra totalmente solvente y al día!' 
  : `⚠️ *TOTAL PENDIENTE POR PAGAR:*
👉 *${formatUSD(totalBalanceUSD)}* (equiv. a *${formatBs(totalBalanceBs)}*)

*Cuentas pendientes:*
${pendingListText || 'Ninguna'}`}
-----------------------------------------
${settings.receiptFooter || 'Agradecemos su preferencia y puntualidad. ¡Feliz día!'}`;

    const url = intlPhone 
      ? `https://wa.me/${intlPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:static print:inset-auto print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:w-full">
      <div 
        id="customer-credit-detail-modal"
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 transition-all my-8 max-h-[90vh] flex flex-col print:shadow-none print:border-none print:max-w-none print:w-full print:m-0 print:p-0 print:max-h-none print:rounded-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">
              {customerName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <span>{customerName}</span>
                {totalBalanceUSD <= 0.01 ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                    Solvente
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800">
                    Deudor Activo
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {idDoc ? `Doc: ${idDoc} • ` : ''}
                {phone ? `Tlf: ${phone} • ` : ''}
                {address || 'Sin dirección'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-customer-detail-btn"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer print:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Bar */}
        <div className="bg-slate-900 text-white p-5 shrink-0">
          <div className="grid grid-cols-3 gap-4 text-center sm:text-left">
            <div>
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                Saldo Pendiente
              </span>
              <div className="text-xl sm:text-2xl font-black text-amber-400">
                {formatUSD(totalBalanceUSD)}
              </div>
              <p className="text-[11px] text-slate-300 font-medium">
                {formatBs(totalBalanceBs)}
              </p>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                Total Abonado
              </span>
              <div className="text-base sm:text-lg font-black text-emerald-400">
                {formatUSD(totalPaidUSD)}
              </div>
              <p className="text-[11px] text-slate-400">
                En {allPayments.length} abonos
              </p>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                Total Crédito Histórico
              </span>
              <div className="text-base sm:text-lg font-black text-slate-200">
                {formatUSD(totalOriginalUSD)}
              </div>
              <p className="text-[11px] text-slate-400">
                {customerRecords.length} boletas
              </p>
            </div>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-800 print:hidden">
            <button
              onClick={handleShareStatement}
              id="share-statement-whatsapp-btn"
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Recordar por WhatsApp</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Extracto</span>
            </button>
          </div>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50 shrink-0 print:hidden">
          <button
            type="button"
            onClick={() => setActiveSubTab('tickets')}
            className={`py-3 px-4 text-xs font-black border-b-2 transition-colors cursor-pointer flex items-center space-x-2 ${
              activeSubTab === 'tickets'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Boletas & Créditos ({customerRecords.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('payments')}
            className={`py-3 px-4 text-xs font-black border-b-2 transition-colors cursor-pointer flex items-center space-x-2 ${
              activeSubTab === 'payments'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>Historial de Abonos ({allPayments.length})</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {activeSubTab === 'tickets' ? (
            /* Tickets List */
            customerRecords.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-8">
                No hay boletas de crédito registradas para este cliente.
              </p>
            ) : (
              customerRecords.map(record => (
                <div
                  key={record.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-slate-900 text-xs">
                          {record.saleNumber || 'Crédito Manual'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(record.date).toLocaleString('es-VE', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-1">
                        {record.description}
                      </p>
                      {record.notes && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md inline-block mt-1">
                          Nota: {record.notes}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      {record.status === 'pagado' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Solvente</span>
                        </span>
                      ) : record.status === 'parcial' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3" />
                          <span>Abonado</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800">
                          <AlertCircle className="w-3 h-3" />
                          <span>Pendiente</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amounts row */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px]">Monto Original: </span>
                      <span className="font-bold text-slate-600">
                        {formatUSD(record.originalAmountUSD)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div>
                        <span className="text-slate-500 text-[11px]">Debe: </span>
                        <span className={`font-black ${record.currentBalanceUSD > 0.01 ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {formatUSD(record.currentBalanceUSD)}
                        </span>
                      </div>

                      {record.currentBalanceUSD > 0.01 && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenPaymentModal(record);
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition-colors cursor-pointer"
                        >
                          Abonar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            /* Payments History */
            allPayments.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-8">
                Aún no se han registrado abonos o pagos para este cliente.
              </p>
            ) : (
              allPayments.map(payment => (
                <div
                  key={payment.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-emerald-700 text-sm">
                        {formatUSD(payment.amountUSD)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        ({formatBs(payment.amountBs)})
                      </span>
                      <span className="text-[11px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-md capitalize">
                        {payment.paymentMethod.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {new Date(payment.date).toLocaleString('es-VE', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                      {payment.paymentReference && ` • Ref: ${payment.paymentReference}`}
                      {payment.receivedByUserName && ` • Recibió: ${payment.receivedByUserName}`}
                    </p>
                    {payment.notes && (
                      <p className="text-[11px] text-slate-600 italic">
                        "{payment.notes}"
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">
                      Aplicado a
                    </span>
                    <span className="font-bold text-slate-700 text-xs">
                      {payment.saleNumber || 'Cuenta'}
                    </span>
                  </div>
                </div>
              ))
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cerrar Libreta
          </button>
        </div>
      </div>
    </div>
  );
};
