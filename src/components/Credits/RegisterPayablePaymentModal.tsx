import React, { useState } from 'react';
import { 
  X, 
  DollarSign, 
  CreditCard, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Banknote
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { PayableRecord, PaymentMethod } from '../../types';

interface RegisterPayablePaymentModalProps {
  payable: PayableRecord | null;
  onClose: () => void;
}

export const RegisterPayablePaymentModal: React.FC<RegisterPayablePaymentModalProps> = ({
  payable,
  onClose,
}) => {
  const { addPayablePayment, bcvRate, formatUSD, formatBs } = useStore();

  const [currency, setCurrency] = useState<'Bs.' | '$'>('$');
  const [amountInput, setAmountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('divisa_usd');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!payable) return null;

  const currentDebtUSD = payable.currentBalanceUSD;
  const currentDebtBs = currentDebtUSD * bcvRate;

  const parsedAmount = parseFloat(amountInput.replace(',', '.')) || 0;

  // Calculate equivalent
  const calculatedEquivalent = currency === '$' 
    ? parsedAmount * bcvRate 
    : (bcvRate > 0 ? parsedAmount / bcvRate : 0);

  const handlePayFull = () => {
    if (currency === '$') {
      setAmountInput(currentDebtUSD.toFixed(2));
    } else {
      setAmountInput(currentDebtBs.toFixed(2));
    }
  };

  const handleCurrencyChange = (newCurr: 'Bs.' | '$') => {
    setCurrency(newCurr);
    if (newCurr === '$') {
      setPaymentMethod('divisa_usd');
    } else {
      setPaymentMethod('pago_movil');
    }
    setAmountInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (parsedAmount <= 0) {
      setError('El monto a pagar debe ser mayor a 0.');
      return;
    }

    const paidInUSD = currency === '$' ? parsedAmount : parsedAmount / bcvRate;
    if (paidInUSD > currentDebtUSD + 0.05) {
      setError(`El monto ingresado ($${paidInUSD.toFixed(2)}) supera el saldo deudor pendiente ($${currentDebtUSD.toFixed(2)}).`);
      return;
    }

    const result = addPayablePayment(payable.id, {
      amountPaid: parsedAmount,
      currency,
      paymentMethod,
      paymentReference: paymentReference.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    if (!result.success) {
      setError(result.error || 'Error al procesar el pago.');
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Abonar a Proveedor
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {payable.supplierName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-xs font-bold text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Resumen de Deuda Actual */}
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">
                Saldo Pendiente Actual
              </span>
              <div className="text-xl font-black text-amber-950">
                {formatUSD(currentDebtUSD)}
              </div>
              <div className="text-xs font-bold text-amber-800">
                {formatBs(currentDebtBs)} <span className="text-[10px] font-medium opacity-80">(BCV: {formatBs(bcvRate)})</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePayFull}
              className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-950 font-black text-xs rounded-xl transition-colors cursor-pointer"
            >
              Pagar Total
            </button>
          </div>

          {/* Selector de Moneda */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Moneda del Pago / Abono
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleCurrencyChange('$')}
                className={`py-2 px-3 rounded-xl border text-xs font-black flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  currency === '$'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Dólares ($ USD)</span>
              </button>

              <button
                type="button"
                onClick={() => handleCurrencyChange('Bs.')}
                className={`py-2 px-3 rounded-xl border text-xs font-black flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  currency === 'Bs.'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Bolívares (Bs.)</span>
              </button>
            </div>
          </div>

          {/* Campo Monto */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Monto a Entregar ({currency}) *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
            {parsedAmount > 0 && (
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Equivalente: {currency === '$' ? formatBs(calculatedEquivalent) : formatUSD(calculatedEquivalent)}
              </p>
            )}
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Forma de Pago
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            >
              {currency === '$' ? (
                <>
                  <option value="divisa_usd">Divisa en Efectivo ($ USD)</option>
                  <option value="transferencia">Zelle / Transferencia Internacional</option>
                  <option value="otros">Otro Pago en Divisa</option>
                </>
              ) : (
                <>
                  <option value="pago_movil">Pago Móvil</option>
                  <option value="efectivo_bs">Efectivo en Bolívares (Bs.)</option>
                  <option value="transferencia">Transferencia Bancaria Nacional</option>
                  <option value="punto_de_venta">Punto de Venta / Débito</option>
                  <option value="biopago">Biopago</option>
                </>
              )}
            </select>
          </div>

          {/* Referencia opcional */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              N° Referencia o Comprobante (Opcional)
            </label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Ej. Ref: 849204"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Botones */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Abono / Pago</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
