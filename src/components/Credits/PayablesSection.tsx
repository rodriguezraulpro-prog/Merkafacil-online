import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  CreditCard,
  DollarSign,
  Receipt,
  Phone,
  FileText,
  Banknote
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { PayableRecord } from '../../types';
import { NewPayableModal } from './NewPayableModal';
import { RegisterPayablePaymentModal } from './RegisterPayablePaymentModal';

export const PayablesSection: React.FC = () => {
  const { 
    payables, 
    deletePayableRecord, 
    bcvRate, 
    formatUSD, 
    formatBs,
    totalPendingPayableUSD,
    totalPendingPayableBs,
    totalPayablesCount
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'pendientes' | 'todas' | 'pagadas'>('pendientes');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [payingPayable, setPayingPayable] = useState<PayableRecord | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter payables
  const filteredPayables = useMemo(() => {
    return payables.filter(p => {
      // Status filter
      if (filterStatus === 'pendientes' && p.status === 'pagado') return false;
      if (filterStatus === 'pagadas' && p.status !== 'pagado') return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSupplier = p.supplierName.toLowerCase().includes(q);
        const matchDesc = p.description.toLowerCase().includes(q);
        const matchInvoice = p.invoiceNumber?.toLowerCase().includes(q) || false;
        const matchDoc = p.supplierDoc?.toLowerCase().includes(q) || false;
        return matchSupplier || matchDesc || matchInvoice || matchDoc;
      }
      return true;
    });
  }, [payables, filterStatus, searchQuery]);

  const handleDelete = (id: string, supplierName: string) => {
    if (window.confirm(`¿Está seguro de eliminar la cuenta por pagar a "${supplierName}"?`)) {
      deletePayableRecord(id);
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDate < today;
  };

  const isDueToday = (dueDate?: string) => {
    if (!dueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDate === today;
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Metric: Total Pending Debt */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Total por Pagar a Proveedores
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatUSD(totalPendingPayableUSD)}
            </div>
            <div className="text-xs font-bold text-amber-700 mt-0.5">
              ≈ {formatBs(totalPendingPayableBs)}{' '}
              <span className="text-[10px] font-medium text-slate-400">
                (BCV: {formatBs(bcvRate)})
              </span>
            </div>
          </div>
        </div>

        {/* Metric: Pending Accounts Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Cuentas Pendientes
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {totalPayablesCount}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">
              {totalPayablesCount === 1 ? 'Factura / compra por pagar' : 'Facturas / compras por pagar'}
            </div>
          </div>
        </div>

        {/* Action Button Card */}
        <div className="bg-linear-to-br from-indigo-700 to-indigo-900 p-5 rounded-2xl shadow-xs flex flex-col justify-between text-white">
          <div>
            <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider block">
              Registro Rápido
            </span>
            <p className="text-xs text-indigo-100 mt-1">
              Anota compras a crédito de mercancía a tus proveedores.
            </p>
          </div>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="mt-3 w-full py-2.5 px-4 bg-white hover:bg-indigo-50 text-indigo-900 rounded-xl font-black text-xs shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Registrar Cuenta por Pagar</span>
          </button>
        </div>

      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar proveedor o concepto..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus('pendientes')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              filterStatus === 'pendientes'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Pendientes ({payables.filter(p => p.status !== 'pagado').length})
          </button>
          <button
            onClick={() => setFilterStatus('todas')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              filterStatus === 'todas'
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todas ({payables.length})
          </button>
          <button
            onClick={() => setFilterStatus('pagadas')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              filterStatus === 'pagadas'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Pagadas ({payables.filter(p => p.status === 'pagado').length})
          </button>
        </div>
      </div>

      {/* Payables List */}
      {filteredPayables.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
            <Building2 className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-black text-slate-800">
            {searchQuery ? 'No se encontraron cuentas con ese criterio' : 'No hay cuentas por pagar registradas'}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Lleva el control de lo que le debes a tus proveedores de manera sencilla y clara.
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar primera cuenta</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPayables.map((payable) => {
            const isExpanded = expandedId === payable.id;
            const overdue = isOverdue(payable.dueDate) && payable.status !== 'pagado';
            const dueToday = isDueToday(payable.dueDate) && payable.status !== 'pagado';
            const currentDebtBs = payable.currentBalanceUSD * bcvRate;

            return (
              <div
                key={payable.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
              >
                {/* Main Card Row */}
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Left: Supplier & Detail */}
                  <div className="flex items-start space-x-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      payable.status === 'pagado'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : payable.status === 'parcial'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      <Building2 className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h4 className="text-sm font-black text-slate-900 truncate">
                          {payable.supplierName}
                        </h4>
                        
                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          payable.status === 'pagado'
                            ? 'bg-emerald-100 text-emerald-800'
                            : payable.status === 'parcial'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {payable.status === 'pagado' ? 'Pagado' : payable.status === 'parcial' ? 'Abono Parcial' : 'Pendiente'}
                        </span>

                        {/* Due Date Alert */}
                        {overdue && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Vencida</span>
                          </span>
                        )}
                        {dueToday && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>Vence hoy</span>
                          </span>
                        )}
                      </div>

                      {/* Concepto / Mercancía */}
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">
                        {payable.description}
                      </p>

                      {/* Metadata row */}
                      <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                        <span>Registrado: {new Date(payable.date).toLocaleDateString('es-VE')}</span>
                        {payable.invoiceNumber && (
                          <span>• Fact: #{payable.invoiceNumber}</span>
                        )}
                        {payable.dueDate && (
                          <span>• Vence: {new Date(payable.dueDate).toLocaleDateString('es-VE')}</span>
                        )}
                        {payable.supplierPhone && (
                          <span className="flex items-center space-x-0.5">
                            <Phone className="w-3 h-3" />
                            <span>{payable.supplierPhone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amounts & Actions */}
                  <div className="flex items-center justify-between md:justify-end space-x-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {/* Balances */}
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {payable.status === 'pagado' ? 'Total Pagado' : 'Saldo Pendiente'}
                      </div>
                      <div className="text-base font-black text-slate-900">
                        {formatUSD(payable.currentBalanceUSD)}
                      </div>
                      <div className="text-xs font-bold text-amber-800">
                        {formatBs(currentDebtBs)}
                      </div>
                      {payable.status !== 'pendiente' && (
                        <div className="text-[10px] text-slate-400 font-medium">
                          Original: {formatUSD(payable.originalAmountUSD)}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-2">
                      {payable.status !== 'pagado' && (
                        <button
                          onClick={() => setPayingPayable(payable)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Banknote className="w-4 h-4" />
                          <span>Abonar / Pagar</span>
                        </button>
                      )}

                      {/* Expand history button if has payments */}
                      {payable.payments.length > 0 && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : payable.id)}
                          title="Ver historial de abonos"
                          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}

                      {/* Delete button */}
                      <button
                        onClick={() => handleDelete(payable.id, payable.supplierName)}
                        title="Eliminar cuenta"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>

                </div>

                {/* Collapsible Payment History */}
                {isExpanded && payable.payments.length > 0 && (
                  <div className="bg-slate-50 p-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Historial de Abonos Realizados ({payable.payments.length})
                      </h5>
                      <span className="text-[11px] font-bold text-slate-500">
                        Total abonado: {formatUSD(payable.originalAmountUSD - payable.currentBalanceUSD)}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-200/70 border border-slate-200 bg-white rounded-xl overflow-hidden">
                      {payable.payments.map((pmt) => (
                        <div key={pmt.id} className="p-3 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-slate-800">
                              {new Date(pmt.date).toLocaleDateString('es-VE')} {new Date(pmt.date).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                              <span className="font-semibold text-slate-700 uppercase">
                                {pmt.paymentMethod.replace(/_/g, ' ')}
                              </span>
                              {pmt.paymentReference && (
                                <span>• Ref: {pmt.paymentReference}</span>
                              )}
                              {pmt.paidByUserName && (
                                <span>• Por: {pmt.paidByUserName}</span>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-black text-emerald-700">
                              +{formatUSD(pmt.amountUSD)}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-500">
                              {formatBs(pmt.amountBs)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Nueva Cuenta por Pagar */}
      <NewPayableModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
      />

      {/* Modal: Registrar Abono a Proveedor */}
      <RegisterPayablePaymentModal
        payable={payingPayable}
        onClose={() => setPayingPayable(null)}
      />

    </div>
  );
};
