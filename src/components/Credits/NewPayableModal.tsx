import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  DollarSign, 
  Calendar, 
  FileText, 
  Phone, 
  Hash, 
  AlertCircle 
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface NewPayableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewPayableModal: React.FC<NewPayableModalProps> = ({ isOpen, onClose }) => {
  const { addPayableRecord, bcvRate, formatBs } = useStore();

  const [supplierName, setSupplierName] = useState('');
  const [supplierDoc, setSupplierDoc] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [amountUSDInput, setAmountUSDInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const parsedUSD = parseFloat(amountUSDInput.replace(',', '.')) || 0;
  const equivalentBs = parsedUSD * bcvRate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!supplierName.trim()) {
      setError('Por favor indique el nombre del proveedor o acreedor.');
      return;
    }

    if (parsedUSD <= 0) {
      setError('El monto de la cuenta por pagar debe ser mayor a 0.');
      return;
    }

    if (!description.trim()) {
      setError('Por favor indique el concepto o detalle de la compra/deuda.');
      return;
    }

    addPayableRecord({
      supplierName: supplierName.trim(),
      supplierDoc: supplierDoc.trim() || undefined,
      supplierPhone: supplierPhone.trim() || undefined,
      invoiceNumber: invoiceNumber.trim() || undefined,
      description: description.trim(),
      originalAmountUSD: parsedUSD,
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Nueva Cuenta por Pagar
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Deuda o compra a crédito con un proveedor
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-xs font-bold text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Proveedor */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nombre del Proveedor o Acreedor *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                autoFocus
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Ej. Distribuidora Polar / Quesera Don Juan / Harinas del Centro"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Monto en USD */}
          <div className="bg-indigo-50/70 border border-indigo-200 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                Monto Total a Pagar ($ USD) *
              </label>
              <span className="text-[11px] font-bold text-indigo-700">
                Tasa BCV: {formatBs(bcvRate)}
              </span>
            </div>

            <div className="relative">
              <DollarSign className="w-5 h-5 text-indigo-600 absolute left-3.5 top-2.5" />
              <input
                type="text"
                required
                value={amountUSDInput}
                onChange={(e) => setAmountUSDInput(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-3 py-2 bg-white border border-indigo-300 rounded-xl text-lg font-black text-indigo-950 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            {parsedUSD > 0 && (
              <div className="text-xs font-extrabold text-indigo-900 pt-1 flex items-center justify-between">
                <span>Equivalente oficial en Bolívares:</span>
                <span className="text-sm text-indigo-700">{formatBs(equivalentBs)}</span>
              </div>
            )}
          </div>

          {/* Concepto / Descripción */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Concepto / Mercancía Comprada *
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. 10 cajas de malta, 5 bultos de harina pan, 20kg de queso"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Datos Opcionales (2 Columnas) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* N° Factura / Nota */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                N° Factura o Nota (Opcional)
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Ej. #004581"
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Fecha Límite / Vencimiento */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Fecha de Vencimiento (Opcional)
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            {/* RIF o Cédula Proveedor */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                RIF del Proveedor (Opcional)
              </label>
              <input
                type="text"
                value={supplierDoc}
                onChange={(e) => setSupplierDoc(e.target.value)}
                placeholder="Ej. J-12345678-9"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Teléfono de Contacto (Opcional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  placeholder="Ej. 0414-1234567"
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Notas adicionales */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Notas adicionales (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Condiciones acordadas, vendedor que despachó, etc."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer flex items-center space-x-2"
            >
              <Building2 className="w-4 h-4" />
              <span>Guardar Cuenta por Pagar</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
