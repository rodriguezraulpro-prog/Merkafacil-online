import React, { useState, useEffect } from 'react';
import { X, DollarSign, CheckCircle2, MessageCircle, Printer, AlertCircle, ArrowRight, ShieldCheck, Wallet, Receipt } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CreditRecord, CreditPayment, PaymentMethod } from '../../types';

interface RegisterPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditRecord: CreditRecord | null;
}

export const RegisterPaymentModal: React.FC<RegisterPaymentModalProps> = ({
  isOpen,
  onClose,
  creditRecord,
}) => {
  const { 
    bcvRate, 
    formatUSD, 
    formatBs, 
    addCreditPayment, 
    currentShift, 
    settings 
  } = useStore();

  const [paymentCurrency, setPaymentCurrency] = useState<'Bs.' | '$'>('$');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo_usd');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [registerInCashDrawer, setRegisterInCashDrawer] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Success state to show receipt / voucher
  const [completedPayment, setCompletedPayment] = useState<{
    payment: CreditPayment;
    record: CreditRecord;
    previousBalanceUSD: number;
    newBalanceUSD: number;
  } | null>(null);

  useEffect(() => {
    if (creditRecord) {
      // Default to paying the entire balance or ready to type
      setAmountPaid(creditRecord.currentBalanceUSD.toFixed(2));
      setPaymentCurrency('$');
      setPaymentMethod('efectivo_usd');
      setPaymentReference('');
      setNotes('');
      setError(null);
      setCompletedPayment(null);
      setRegisterInCashDrawer(!!currentShift);
    }
  }, [creditRecord, currentShift]);

  if (!isOpen || !creditRecord) return null;

  const currentDebtUSD = creditRecord.currentBalanceUSD;
  const currentDebtBs = currentDebtUSD * bcvRate;

  // Numeric amount
  const parsedAmount = parseFloat(amountPaid) || 0;
  const equivalentUSD = paymentCurrency === '$' ? parsedAmount : parsedAmount / bcvRate;
  const equivalentBs = paymentCurrency === 'Bs.' ? parsedAmount : parsedAmount * bcvRate;
  const remainingDebtUSD = Math.max(0, currentDebtUSD - equivalentUSD);
  const remainingDebtBs = remainingDebtUSD * bcvRate;
  const isFullPayment = remainingDebtUSD <= 0.01;

  // Handle Quick Amount buttons
  const handleQuickAmount = (amountUSD: number) => {
    const capped = Math.min(amountUSD, currentDebtUSD);
    if (paymentCurrency === '$') {
      setAmountPaid(capped.toFixed(2));
    } else {
      setAmountPaid((capped * bcvRate).toFixed(2));
    }
  };

  const handleCurrencyChange = (curr: 'Bs.' | '$') => {
    setPaymentCurrency(curr);
    if (curr === 'Bs.') {
      setAmountPaid((equivalentUSD * bcvRate).toFixed(2));
      if (paymentMethod === 'efectivo_usd') {
        setPaymentMethod('pago_movil');
      }
    } else {
      setAmountPaid(equivalentUSD.toFixed(2));
      if (paymentMethod === 'pago_movil' || paymentMethod === 'efectivo_bs') {
        setPaymentMethod('efectivo_usd');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (parsedAmount <= 0) {
      setError('Por favor ingrese un monto válido mayor a 0.');
      return;
    }

    if (equivalentUSD > currentDebtUSD + 0.05) {
      setError(
        `El monto a abonar (${formatUSD(equivalentUSD)}) no puede ser mayor al saldo deudor (${formatUSD(currentDebtUSD)}).`
      );
      return;
    }

    if (
      (paymentMethod === 'pago_movil' || paymentMethod === 'punto_debito' || paymentMethod === 'transferencia') &&
      !paymentReference.trim()
    ) {
      setError('Debe indicar los últimos dígitos o número de referencia de la transacción bancaria.');
      return;
    }

    const previousBal = creditRecord.currentBalanceUSD;
    const res = addCreditPayment(creditRecord.id, {
      amountPaid: parsedAmount,
      currency: paymentCurrency,
      paymentMethod,
      paymentReference: paymentReference.trim() || undefined,
      notes: notes.trim() || undefined,
      registerInCashDrawer,
    });

    if (!res.success || !res.payment) {
      setError(res.error || 'No se pudo registrar el abono.');
      return;
    }

    const newBal = Math.max(0, previousBal - equivalentUSD);
    setCompletedPayment({
      payment: res.payment,
      record: creditRecord,
      previousBalanceUSD: previousBal,
      newBalanceUSD: newBal,
    });
  };

  // Generate WhatsApp message for the payment voucher
  const handleShareWhatsApp = () => {
    if (!completedPayment) return;
    const { payment, record, previousBalanceUSD, newBalanceUSD } = completedPayment;
    const phone = record.customerPhone ? record.customerPhone.replace(/\D/g, '') : '';
    
    // Venezuelan phone formatting (e.g. 04141234567 -> 584141234567)
    let intlPhone = phone;
    if (phone.startsWith('0')) {
      intlPhone = `58${phone.slice(1)}`;
    } else if (!phone.startsWith('58') && phone.length === 10) {
      intlPhone = `58${phone}`;
    }

    const dateStr = new Date(payment.date).toLocaleString('es-VE', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    const methodLabels: Record<string, string> = {
      efectivo_bs: 'Efectivo Bolívares (Bs.)',
      efectivo_usd: 'Efectivo Dólares ($)',
      pago_movil: 'Pago Móvil',
      punto_debito: 'Punto de Venta / Débito',
      transferencia: 'Transferencia Bancaria',
    };

    const methodText = methodLabels[payment.paymentMethod] || payment.paymentMethod;
    const refText = payment.paymentReference ? ` (Ref: ${payment.paymentReference})` : '';

    const text = 
`🏪 *${settings.name}*
📄 *COMPROBANTE DE ABONO A CUENTA*
-----------------------------------------
👤 *Cliente:* ${record.customerName} ${record.customerIdDoc ? `(${record.customerIdDoc})` : ''}
📅 *Fecha:* ${dateStr}
💵 *Monto Abonado:* ${formatUSD(payment.amountUSD)} / ${formatBs(payment.amountBs)}
💳 *Forma de Pago:* ${methodText}${refText}
-----------------------------------------
📊 *Saldo Anterior:* ${formatUSD(previousBalanceUSD)}
${newBalanceUSD <= 0.01 
  ? '✅ *ESTADO DE CUENTA:* ¡TOTALMENTE SOLVENTE Y PAGADO!' 
  : `⏳ *Saldo Pendiente Restante:* ${formatUSD(newBalanceUSD)} (${formatBs(newBalanceUSD * bcvRate)})`}
-----------------------------------------
${settings.receiptFooter || '¡Muchas gracias por su pago y confianza!'}`;

    const url = intlPhone 
      ? `https://wa.me/${intlPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="register-payment-modal"
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 transition-all my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {completedPayment ? 'Comprobante de Abono' : 'Registrar Abono / Pago'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Cliente: <span className="font-bold text-slate-800">{creditRecord.customerName}</span>
                {creditRecord.customerIdDoc && ` • ${creditRecord.customerIdDoc}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-payment-modal-btn"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {completedPayment ? (
          /* Payment Success Voucher / Receipt View */
          <div className="p-6 space-y-5">
            <div className="text-center py-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-slate-900">
                ¡Abono Registrado con Éxito!
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                La deuda del cliente ha sido actualizada en la libreta.
              </p>
            </div>

            {/* Voucher Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3.5 text-xs text-slate-700">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Cliente:</span>
                <span className="font-black text-slate-900 text-sm">
                  {completedPayment.record.customerName}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Monto Pagado:</span>
                <div className="text-right">
                  <span className="font-black text-emerald-700 text-base">
                    {formatUSD(completedPayment.payment.amountUSD)}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Equiv. {formatBs(completedPayment.payment.amountBs)}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Método de Pago:</span>
                <span className="font-bold text-slate-800 capitalize">
                  {completedPayment.payment.paymentMethod.replace('_', ' ')}
                  {completedPayment.payment.paymentReference && ` (Ref: ${completedPayment.payment.paymentReference})`}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Saldo Restante:</span>
                <div className="text-right">
                  {completedPayment.newBalanceUSD <= 0.01 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                      ¡Totalmente Solvente!
                    </span>
                  ) : (
                    <>
                      <span className="font-black text-amber-800 text-sm">
                        {formatUSD(completedPayment.newBalanceUSD)}
                      </span>
                      <p className="text-[11px] text-slate-500">
                        {formatBs(completedPayment.newBalanceUSD * bcvRate)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                id="share-payment-whatsapp-btn"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar Comprobante por WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                id="finish-payment-btn"
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cerrar y Volver a la Libreta
              </button>
            </div>
          </div>
        ) : (
          /* Payment Input Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Current Debt Alert Banner */}
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-amber-800 font-bold uppercase tracking-wider block">
                  Saldo Deudor Actual
                </span>
                <div className="flex items-baseline space-x-2 mt-0.5">
                  <span className="text-xl font-black text-slate-900">
                    {formatUSD(currentDebtUSD)}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    ({formatBs(currentDebtBs)})
                  </span>
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <span>Tasa BCV:</span>
                <p className="font-black text-slate-800">{bcvRate.toFixed(2)} Bs/$</p>
              </div>
            </div>

            {/* Currency Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Moneda en que Paga el Cliente
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="pay-currency-usd"
                  onClick={() => handleCurrencyChange('$')}
                  className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                    paymentCurrency === '$'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>Dólares ($ USD)</span>
                </button>
                <button
                  type="button"
                  id="pay-currency-bs"
                  onClick={() => handleCurrencyChange('Bs.')}
                  className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                    paymentCurrency === 'Bs.'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>Bolívares (Bs.)</span>
                </button>
              </div>
            </div>

            {/* Amount Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Monto a Abonar ({paymentCurrency})
                </label>
                <span className="text-[11px] text-slate-500">
                  {paymentCurrency === '$'
                    ? `Equivale a ${formatBs(equivalentBs)}`
                    : `Equivale a ${formatUSD(equivalentUSD)}`}
                </span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm">
                  {paymentCurrency}
                </span>
                <input
                  type="number"
                  step="any"
                  id="payment-amount-input"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  placeholder="0.00"
                  required
                  min="0.01"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-base font-black focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Quick Amount Shortcuts */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => handleQuickAmount(currentDebtUSD)}
                  className="px-2.5 py-1 text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  Pagar Total ({formatUSD(currentDebtUSD)})
                </button>
                {currentDebtUSD > 5 && (
                  <button
                    type="button"
                    onClick={() => handleQuickAmount(5)}
                    className="px-2 py-1 text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    $5.00
                  </button>
                )}
                {currentDebtUSD > 10 && (
                  <button
                    type="button"
                    onClick={() => handleQuickAmount(10)}
                    className="px-2 py-1 text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    $10.00
                  </button>
                )}
                {currentDebtUSD > 20 && (
                  <button
                    type="button"
                    onClick={() => handleQuickAmount(20)}
                    className="px-2 py-1 text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    $20.00
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleQuickAmount(currentDebtUSD / 2)}
                  className="px-2 py-1 text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  50%
                </button>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Método de Recepción
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {paymentCurrency === '$' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('efectivo_usd')}
                      className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                        paymentMethod === 'efectivo_usd'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      💵 Efectivo Dólares ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transferencia')}
                      className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                        paymentMethod === 'transferencia'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      🏦 Zelle / Transferencia $
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pago_movil')}
                      className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                        paymentMethod === 'pago_movil'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      📱 Pago Móvil
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('punto_debito')}
                      className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                        paymentMethod === 'punto_debito'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      💳 Punto de Venta (Débito)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('efectivo_bs')}
                      className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                        paymentMethod === 'efectivo_bs'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      💵 Efectivo Bolívares (Bs.)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transferencia')}
                      className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                        paymentMethod === 'transferencia'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      🏛️ Transferencia Bancaria
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Reference field for digital payments */}
            {(paymentMethod === 'pago_movil' ||
              paymentMethod === 'punto_debito' ||
              paymentMethod === 'transferencia') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número de Referencia / Lote <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="payment-reference-input"
                  value={paymentReference}
                  onChange={e => setPaymentReference(e.target.value)}
                  placeholder="Ej: 492102"
                  required
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nota u Observación (Opcional)
              </label>
              <input
                type="text"
                id="payment-notes-input"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ej: Abono de quincena, entregó billete de 20..."
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Register in open Cash Shift checkbox */}
            {currentShift && (paymentMethod === 'efectivo_bs' || paymentMethod === 'efectivo_usd') && (
              <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-3 flex items-start space-x-2.5">
                <input
                  type="checkbox"
                  id="register-in-drawer-chk"
                  checked={registerInCashDrawer}
                  onChange={e => setRegisterInCashDrawer(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="register-in-drawer-chk" className="text-xs text-slate-700 font-medium cursor-pointer">
                  <span className="font-bold text-emerald-900">Ingresar en la Caja del Turno Actual</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Suma automáticamente este efectivo al dinero en gaveta para el cuadre final.
                  </p>
                </label>
              </div>
            )}

            {/* Projected Remaining Balance Preview */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">
                {isFullPayment ? 'Estado tras el pago:' : 'Saldo restante tras este abono:'}
              </span>
              <div className="text-right">
                {isFullPayment ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                    ✓ Quedará Solvente
                  </span>
                ) : (
                  <span className="font-black text-slate-900">
                    {formatUSD(remainingDebtUSD)} ({formatBs(remainingDebtBs)})
                  </span>
                )}
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="submit-credit-payment-btn"
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <span>Confirmar Abono</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
