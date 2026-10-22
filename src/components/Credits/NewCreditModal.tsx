import React, { useState } from 'react';
import { X, Plus, User, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface NewCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewCreditModal: React.FC<NewCreditModalProps> = ({ isOpen, onClose }) => {
  const { customers, addOrUpdateCustomer, addCreditRecord, bcvRate, formatUSD, formatBs } = useStore();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('new');
  
  // New customer fields
  const [docType, setDocType] = useState<'V' | 'E' | 'J' | 'G'>('V');
  const [docNumber, setDocNumber] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');

  // Credit details
  const [amountUSD, setAmountUSD] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const parsedAmountUSD = parseFloat(amountUSD) || 0;
  const equivalentBs = parsedAmountUSD * bcvRate;

  const handleSelectExisting = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (customerId !== 'new') {
      const cust = customers.find(c => c.id === customerId);
      if (cust) {
        setDocType(cust.idDocType);
        setDocNumber(cust.idDocNumber);
        setCustomerName(cust.name);
        setCustomerPhone(cust.phone || '');
        setCustomerAddress(cust.address || '');
      }
    } else {
      setDocNumber('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError('Por favor ingrese el nombre del cliente.');
      return;
    }

    if (parsedAmountUSD <= 0) {
      setError('Por favor ingrese un monto de crédito válido mayor a $0.');
      return;
    }

    if (!description.trim()) {
      setError('Indique el detalle o concepto de los víveres entregados a fiar.');
      return;
    }

    let customerId = selectedCustomerId;
    let customerIdDoc: string | undefined = undefined;

    if (docNumber.trim()) {
      customerIdDoc = `${docType}-${docNumber.trim()}`;
    }

    // Save or update customer in directory
    if (customerId === 'new') {
      const savedCust = addOrUpdateCustomer({
        idDocType: docType,
        idDocNumber: docNumber.trim() || `TMP-${Date.now()}`,
        name: customerName.trim(),
        phone: customerPhone.trim() || undefined,
        address: customerAddress.trim() || undefined,
      });
      customerId = savedCust.id;
    }

    addCreditRecord({
      customerId,
      customerName: customerName.trim(),
      customerIdDoc,
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      originalAmountUSD: parsedAmountUSD,
      description: description.trim(),
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="new-credit-modal"
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 transition-all my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Registrar Nuevo Crédito
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Añadir cuenta por cobrar a la libreta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-new-credit-modal-btn"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Customer Selection Option */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Seleccionar Cliente
            </label>
            <select
              id="select-existing-customer"
              value={selectedCustomerId}
              onChange={e => handleSelectExisting(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            >
              <option value="new">+ Registrar Nuevo Cliente...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.idDocType}-{c.idDocNumber}) {c.phone ? `• ${c.phone}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Details */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tipo Doc.
                </label>
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value as any)}
                  disabled={selectedCustomerId !== 'new'}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:ring-2 focus:ring-amber-500"
                >
                  <option value="V">V- (Venezolano)</option>
                  <option value="E">E- (Extranjero)</option>
                  <option value="J">J- (Jurídico)</option>
                  <option value="G">G- (Gobierno)</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Cédula / RIF (Opcional)
                </label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={e => setDocNumber(e.target.value)}
                  disabled={selectedCustomerId !== 'new'}
                  placeholder="Ej: 14892103"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Nombre y Apellido <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                disabled={selectedCustomerId !== 'new'}
                placeholder="Ej: Don Pedro Ramos"
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Teléfono (WhatsApp)
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  disabled={selectedCustomerId !== 'new'}
                  placeholder="Ej: 0414-1234567"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Dirección o Sector
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  disabled={selectedCustomerId !== 'new'}
                  placeholder="Ej: Casa #12 frente al parque"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Amount in USD with BCV Conversion */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-700">
                Monto del Crédito ($ USD) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500 font-semibold">
                Equivale a: {formatBs(equivalentBs)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm">
                $
              </span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                id="new-credit-amount-input"
                value={amountUSD}
                onChange={e => setAmountUSD(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-base font-black focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Description of Items */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Víveres o Concepto Entregado <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              id="new-credit-desc-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej: 2 Harina PAN, 1 Queso Llanero, 1 Mantequilla"
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium"
            />
          </div>

          {/* Notes / Promise to pay */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observaciones / Compromiso de Pago (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Quedó en pagar el viernes cuando le paguen la quincena"
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
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
              id="confirm-new-credit-btn"
              className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Guardar en Libreta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
