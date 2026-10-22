import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Search, 
  Plus, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageCircle, 
  Printer, 
  Eye, 
  Phone, 
  ArrowRight, 
  Trash2, 
  Receipt,
  FileText,
  Filter,
  UserCheck,
  TrendingDown,
  Building2,
  BookOpen
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CreditRecord } from '../../types';
import { RegisterPaymentModal } from './RegisterPaymentModal';
import { NewCreditModal } from './NewCreditModal';
import { CustomerCreditDetailModal } from './CustomerCreditDetailModal';
import { PayablesSection } from './PayablesSection';

export const CreditsView: React.FC = () => {
  const { 
    credits, 
    bcvRate, 
    formatUSD, 
    formatBs, 
    totalPendingDebtUSD, 
    totalPendingDebtBs, 
    totalDebtorsCount,
    deleteCreditRecord,
    settings,
    currentUser,
    totalPayablesCount
  } = useStore();

  // Top Section: Receivables (Clientes) vs Payables (Proveedores)
  const [activeSection, setActiveSection] = useState<'receivables' | 'payables'>('receivables');

  // Search and filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('pending');
  const [viewMode, setViewMode] = useState<'customers' | 'tickets'>('customers');

  // Modals state
  const [isNewCreditModalOpen, setIsNewCreditModalOpen] = useState<boolean>(false);
  const [paymentModalRecord, setPaymentModalRecord] = useState<CreditRecord | null>(null);
  const [detailModalCustomer, setDetailModalCustomer] = useState<{ id: string; name: string } | null>(null);

  // Group credits by customer for Customer-Centric view
  const customerSummaries = useMemo(() => {
    const map = new Map<string, {
      customerId: string;
      customerName: string;
      customerIdDoc?: string;
      customerPhone?: string;
      customerAddress?: string;
      totalDebtUSD: number;
      totalOriginalUSD: number;
      pendingTicketsCount: number;
      paidTicketsCount: number;
      lastDate: string;
      records: CreditRecord[];
    }>();

    credits.forEach(record => {
      // Identifier can be customerId or clean name
      const key = record.customerId || record.customerName.toLowerCase().trim();
      const existing = map.get(key);

      const isPaid = record.status === 'pagado' || record.currentBalanceUSD <= 0.01;
      const debt = isPaid ? 0 : record.currentBalanceUSD;

      if (existing) {
        existing.totalDebtUSD += debt;
        existing.totalOriginalUSD += record.originalAmountUSD;
        if (isPaid) {
          existing.paidTicketsCount += 1;
        } else {
          existing.pendingTicketsCount += 1;
        }
        if (new Date(record.date).getTime() > new Date(existing.lastDate).getTime()) {
          existing.lastDate = record.date;
        }
        if (!existing.customerIdDoc && record.customerIdDoc) existing.customerIdDoc = record.customerIdDoc;
        if (!existing.customerPhone && record.customerPhone) existing.customerPhone = record.customerPhone;
        if (!existing.customerAddress && record.customerAddress) existing.customerAddress = record.customerAddress;
        existing.records.push(record);
      } else {
        map.set(key, {
          customerId: record.customerId,
          customerName: record.customerName,
          customerIdDoc: record.customerIdDoc,
          customerPhone: record.customerPhone,
          customerAddress: record.customerAddress,
          totalDebtUSD: debt,
          totalOriginalUSD: record.originalAmountUSD,
          pendingTicketsCount: isPaid ? 0 : 1,
          paidTicketsCount: isPaid ? 1 : 0,
          lastDate: record.date,
          records: [record],
        });
      }
    });

    return Array.from(map.values());
  }, [credits]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customerSummaries.filter(cust => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        cust.customerName.toLowerCase().includes(term) ||
        (cust.customerIdDoc && cust.customerIdDoc.toLowerCase().includes(term)) ||
        (cust.customerPhone && cust.customerPhone.includes(term));

      if (!matchesSearch) return false;

      if (statusFilter === 'pending') {
        return cust.totalDebtUSD > 0.01;
      }
      if (statusFilter === 'paid') {
        return cust.totalDebtUSD <= 0.01;
      }
      return true;
    }).sort((a, b) => b.totalDebtUSD - a.totalDebtUSD); // Highest debt first
  }, [customerSummaries, searchTerm, statusFilter]);

  // Filtered individual tickets
  const filteredTickets = useMemo(() => {
    return credits.filter(ticket => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        ticket.customerName.toLowerCase().includes(term) ||
        (ticket.customerIdDoc && ticket.customerIdDoc.toLowerCase().includes(term)) ||
        (ticket.saleNumber && ticket.saleNumber.toLowerCase().includes(term)) ||
        ticket.description.toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (statusFilter === 'pending') {
        return ticket.status !== 'pagado' && ticket.currentBalanceUSD > 0.01;
      }
      if (statusFilter === 'paid') {
        return ticket.status === 'pagado' || ticket.currentBalanceUSD <= 0.01;
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [credits, searchTerm, statusFilter]);

  // Quick WhatsApp message directly from the customer card
  const handleDirectWhatsApp = (phone?: string, name?: string, debtUSD?: number) => {
    if (!phone || !debtUSD) return;
    const raw = phone.replace(/\D/g, '');
    let intl = raw;
    if (raw.startsWith('0')) {
      intl = `58${raw.slice(1)}`;
    } else if (!raw.startsWith('58') && raw.length === 10) {
      intl = `58${raw}`;
    }

    const debtBs = debtUSD * bcvRate;
    const text = 
`Hola ${name || 'amigo(a)'}, te saludamos de *${settings.name}*.
Le recordamos cordialmente que tiene un saldo pendiente en la libreta de *${formatUSD(debtUSD)}* (equiv. a *${formatBs(debtBs)}* a tasa BCV).
¡Muchas gracias por su atención y apoyo!`;

    const url = `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Open Payment modal for customer's oldest active credit record
  const handleOpenPaymentForCustomer = (custRecords: CreditRecord[]) => {
    const activeRecords = custRecords.filter(r => r.status !== 'pagado' && r.currentBalanceUSD > 0.01);
    if (activeRecords.length > 0) {
      // Pick the oldest pending record first
      const oldest = [...activeRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
      setPaymentModalRecord(oldest);
    }
  };

  // Count total settled records
  const totalSettledCount = credits.filter(c => c.status === 'pagado' || c.currentBalanceUSD <= 0.01).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner / Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center space-x-2">
            <span>Libreta de Cuentas</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            {activeSection === 'receivables' 
              ? 'Control de clientes a crédito, deudas y abonos pendientes'
              : 'Control básico de compras a crédito y deudas con proveedores'
            }
          </p>
        </div>

        {activeSection === 'receivables' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Imprimir Libreta</span>
            </button>
            
            <button
              type="button"
              onClick={() => setIsNewCreditModalOpen(true)}
              id="open-new-credit-btn"
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Registrar Crédito</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Switcher Tabs: Por Cobrar vs Por Pagar */}
      <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-fit border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveSection('receivables')}
          className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSection === 'receivables'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-amber-600" />
          <span className="hidden sm:inline">Cuentas por Cobrar (Clientes / Créditos)</span>
          <span className="sm:hidden">Por Cobrar (Créditos)</span>
          {totalDebtorsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
              {totalDebtorsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('payables')}
          className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSection === 'payables'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span className="hidden sm:inline">Cuentas por Pagar (Proveedores)</span>
          <span className="sm:hidden">Por Pagar</span>
          {totalPayablesCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
              {totalPayablesCount}
            </span>
          )}
        </button>
      </div>

      {activeSection === 'payables' ? (
        <PayablesSection />
      ) : (
        <>
          {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Pending in USD */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total por Cobrar ($ USD)
            </span>
            <span className="text-2xl font-black text-slate-900 block mt-0.5">
              {formatUSD(totalPendingDebtUSD)}
            </span>
            <span className="text-[11px] font-semibold text-rose-600 flex items-center space-x-1 mt-0.5">
              <TrendingDown className="w-3.5 h-3.5 shrink-0" />
              <span>Cuentas activas en la calle</span>
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Total Pending in Bs. (BCV) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Equivalente en Bolívares
            </span>
            <span className="text-xl font-black text-slate-900 block mt-0.5 truncate max-w-[170px]">
              {formatBs(totalPendingDebtBs)}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 block mt-0.5">
              Calculado a {bcvRate.toFixed(2)} Bs/$
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        {/* Active Debtors Count */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Clientes con Deuda
            </span>
            <span className="text-2xl font-black text-slate-900 block mt-0.5">
              {totalDebtorsCount}
            </span>
            <span className="text-[11px] font-semibold text-amber-700 block mt-0.5">
              Personas con saldo pendiente
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Settled / Paid Records Count */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Cuentas Solventes
            </span>
            <span className="text-2xl font-black text-slate-900 block mt-0.5">
              {totalSettledCount}
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 block mt-0.5">
              Pagadas en su totalidad
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, cédula, teléfono o víveres..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Solo con Deuda ({totalDebtorsCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({customerSummaries.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'paid'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Solventes ({customerSummaries.filter(c => c.totalDebtUSD <= 0.01).length})
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('customers')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
              viewMode === 'customers'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Por Cliente</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('tickets')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
              viewMode === 'tickets'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Por Boleta</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'customers' ? (
        /* CUSTOMER-CENTRIC GRID VIEW */
        filteredCustomers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-2xs">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              No se encontraron clientes con esos criterios
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Intente buscando con otro nombre o ajuste los filtros de la libreta.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map(customer => {
              const hasDebt = customer.totalDebtUSD > 0.01;
              const debtBs = customer.totalDebtUSD * bcvRate;

              return (
                <div
                  key={customer.customerId || customer.customerName}
                  className={`bg-white border rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs ${
                    hasDebt ? 'border-amber-200/90' : 'border-slate-200'
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 ${
                            hasDebt ? 'bg-amber-600' : 'bg-emerald-600'
                          }`}
                        >
                          {customer.customerName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-slate-900 truncate">
                            {customer.customerName}
                          </h4>
                          <p className="text-xs text-slate-500 font-semibold truncate">
                            {customer.customerIdDoc ? `${customer.customerIdDoc}` : 'Sin Cédula'}
                            {customer.customerPhone ? ` • ${customer.customerPhone}` : ''}
                          </p>
                        </div>
                      </div>

                      {hasDebt ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 shrink-0">
                          Deudor
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 shrink-0">
                          Solvente
                        </span>
                      )}
                    </div>

                    {/* Address if present */}
                    {customer.customerAddress && (
                      <p className="text-[11px] text-slate-400 truncate mt-2">
                        📍 {customer.customerAddress}
                      </p>
                    )}

                    {/* Debt Highlight Box */}
                    <div
                      className={`mt-3.5 p-3.5 rounded-xl border flex items-center justify-between ${
                        hasDebt
                          ? 'bg-amber-50/60 border-amber-200/70'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                          Saldo Pendiente
                        </span>
                        <span
                          className={`text-xl font-black block mt-0.5 ${
                            hasDebt ? 'text-amber-900' : 'text-emerald-700'
                          }`}
                        >
                          {formatUSD(customer.totalDebtUSD)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                          En Bolívares
                        </span>
                        <span className="text-xs font-black text-slate-800 block mt-0.5">
                          {formatBs(debtBs)}
                        </span>
                      </div>
                    </div>

                    {/* Quick Metadata */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
                      <span>
                        Boletas pendientes: <strong className="text-slate-800">{customer.pendingTicketsCount}</strong>
                      </span>
                      <span>
                        Último crédito: {new Date(customer.lastDate).toLocaleDateString('es-VE')}
                      </span>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5">
                      {customer.customerPhone && hasDebt && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDirectWhatsApp(
                              customer.customerPhone,
                              customer.customerName,
                              customer.totalDebtUSD
                            )
                          }
                          title="Enviar recordatorio de cobro por WhatsApp"
                          className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-200"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setDetailModalCustomer({
                            id: customer.customerId,
                            name: customer.customerName,
                          })
                        }
                        title="Ver historial completo y extracto"
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Historial</span>
                      </button>
                    </div>

                    {hasDebt && (
                      <button
                        type="button"
                        onClick={() => handleOpenPaymentForCustomer(customer.records)}
                        id={`pay-btn-${customer.customerId}`}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-2xs transition-colors cursor-pointer flex items-center space-x-1.5"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Abonar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* INDIVIDUAL TICKETS TABLE VIEW */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Fecha & Boleta</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Víveres / Concepto</th>
                  <th className="py-3 px-4 text-right">Monto Original</th>
                  <th className="py-3 px-4 text-right">Saldo Deudor</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No hay registros de créditos que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map(ticket => {
                    const isPaid = ticket.status === 'pagado' || ticket.currentBalanceUSD <= 0.01;
                    return (
                      <tr key={ticket.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Date & Number */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900 block">
                            {ticket.saleNumber || 'Manual'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(ticket.date).toLocaleString('es-VE', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </td>

                        {/* Customer */}
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">
                            {ticket.customerName}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {ticket.customerIdDoc || ticket.customerPhone || 'Sin datos'}
                          </span>
                        </td>

                        {/* Items / Description */}
                        <td className="py-3 px-4 max-w-xs">
                          <p className="font-medium text-slate-700 truncate" title={ticket.description}>
                            {ticket.description}
                          </p>
                          {ticket.notes && (
                            <p className="text-[11px] text-amber-800 italic truncate" title={ticket.notes}>
                              Nota: {ticket.notes}
                            </p>
                          )}
                        </td>

                        {/* Original Amount */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span className="font-bold text-slate-700">
                            {formatUSD(ticket.originalAmountUSD)}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            {formatBs(ticket.originalAmountBs)}
                          </span>
                        </td>

                        {/* Current Debt */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span
                            className={`font-black ${
                              isPaid ? 'text-emerald-700' : 'text-rose-700 text-sm'
                            }`}
                          >
                            {formatUSD(ticket.currentBalanceUSD)}
                          </span>
                          {!isPaid && (
                            <span className="text-[11px] text-slate-500 block">
                              {formatBs(ticket.currentBalanceUSD * bcvRate)}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {isPaid ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                              Solvente
                            </span>
                          ) : ticket.status === 'parcial' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800">
                              Abonado
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800">
                              Pendiente
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => setPaymentModalRecord(ticket)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-xs transition-colors cursor-pointer"
                            >
                              Abonar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setDetailModalCustomer({
                                id: ticket.customerId,
                                name: ticket.customerName,
                              })
                            }
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}

      {/* MODALS */}
      {/* 1. Register Payment / Abono Modal */}
      <RegisterPaymentModal
        isOpen={!!paymentModalRecord}
        onClose={() => setPaymentModalRecord(null)}
        creditRecord={paymentModalRecord}
      />

      {/* 2. New Manual Credit Modal */}
      <NewCreditModal
        isOpen={isNewCreditModalOpen}
        onClose={() => setIsNewCreditModalOpen(false)}
      />

      {/* 3. Customer Statement & History Modal */}
      {detailModalCustomer && (
        <CustomerCreditDetailModal
          isOpen={true}
          onClose={() => setDetailModalCustomer(null)}
          customerId={detailModalCustomer.id}
          customerName={detailModalCustomer.name}
          onOpenPaymentModal={record => setPaymentModalRecord(record)}
        />
      )}
    </div>
  );
};
