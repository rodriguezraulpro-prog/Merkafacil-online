import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { PosView } from './components/POS/PosView';
import { InventoryView } from './components/Inventory/InventoryView';
import { ReportsView } from './components/Reports/ReportsView';
import { MovementsView } from './components/Movements/MovementsView';
import { SettingsView } from './components/Settings/SettingsView';
import { SupabaseDatabaseView } from './components/Database/SupabaseDatabaseView';
import { CreditsView } from './components/Credits/CreditsView';
import { TicketModal } from './components/TicketModal';
import { SaleConfirmationModal } from './components/POS/SaleConfirmationModal';
import { SupervisorAuthModal } from './components/Security/SupervisorAuthModal';
import { SettingsAuthModal } from './components/Security/SettingsAuthModal';
import { LoginModal } from './components/Security/LoginModal';
import { ShiftModal } from './components/Shifts/ShiftModal';
import { ShiftReceiptModal } from './components/Shifts/ShiftReceiptModal';
import { MobileBottomNav } from './components/MobileBottomNav';

const AppContent: React.FC = () => {
  const { 
    activeTab, 
    selectedReceiptSale, 
    setSelectedReceiptSale,
    pendingReceiptSale,
    setPendingReceiptSale,
    setConfirmedSaleNotice,
    selectedReceiptShift,
    setSelectedReceiptShift,
    currentUser,
    isLoginModalOpen,
    isOnline,
    serverLatencyMs,
  } = useStore();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Offline Connectivity Warning Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-xs sticky top-0 z-50 print:hidden">
          <span className="w-2 h-2 rounded-full bg-amber-950 animate-ping"></span>
          <span>Navegador sin conexión o reconectando con el servidor. La aplicación se sincronizará automáticamente.</span>
        </div>
      )}

      {/* Top Navigation & Brand Header */}
      <Header />

      {/* Main Content Area based on Active Tab */}
      <main className={`flex-1 pb-24 md:pb-12 ${(selectedReceiptSale || selectedReceiptShift) ? 'print:hidden' : ''}`}>
        {currentUser ? (
          <>
            {activeTab === 'pos' && <PosView />}
            {activeTab === 'inventario' && <InventoryView />}
            {activeTab === 'creditos' && <CreditsView />}
            {activeTab === 'reportes' && <ReportsView />}
            {activeTab === 'movimientos' && <MovementsView />}
            {activeTab === 'supabase' && <SupabaseDatabaseView />}
            {activeTab === 'ajustes' && <SettingsView />}
          </>
        ) : (
          <div className="flex-1 min-h-[60vh] flex items-center justify-center p-4">
            <div className="text-center text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                <span className="text-3xl">🏪</span>
              </div>
              <h2 className="text-base font-bold text-slate-700">Merkafacil</h2>
              <p className="text-xs text-slate-400 mt-0.5">Sistema de Punto de Venta & Inventario</p>
            </div>
          </div>
        )}
      </main>

      {/* Discreet Developer Credits Footer (Hidden on mobile or above bottom nav) */}
      <footer className="py-2.5 px-4 bg-white/75 border-t border-slate-200 text-center text-xs text-slate-400 mb-16 md:mb-0 hidden sm:block print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px]">
          <span className="text-slate-400">
            Merkafacil POS &copy; {new Date().getFullYear()}
          </span>
          <span className="text-slate-500 font-medium inline-flex items-center gap-1.5 flex-wrap justify-center">
            <span>Sistema creado por <strong className="font-bold text-slate-700">Educom-tec</strong></span>
            <span className="text-slate-300">•</span>
            <a 
              href="mailto:rodriguezraul.pro@gmail.com" 
              className="text-slate-500 hover:text-emerald-600 transition-colors font-semibold"
              title="Contacto y soporte técnico"
            >
              rodriguezraul.pro@gmail.com
            </a>
          </span>
          <span className="text-slate-500 hidden sm:inline-flex items-center gap-1.5 font-medium">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span>Sistema Web Online {serverLatencyMs !== null ? `(${serverLatencyMs}ms)` : ''}</span>
          </span>
        </div>
      </footer>

      {/* Native-style Mobile Bottom Navigation Bar (Phones) */}
      <MobileBottomNav />

      {/* Printable / Viewable Receipt Modal */}
      {selectedReceiptSale && (
        <TicketModal
          sale={selectedReceiptSale}
          onClose={() => setSelectedReceiptSale(null)}
        />
      )}

      {/* Optional Receipt Print Confirmation Modal after completing purchase */}
      {pendingReceiptSale && (
        <SaleConfirmationModal
          sale={pendingReceiptSale}
          onPrintReceipt={() => {
            const saleToPrint = pendingReceiptSale;
            setPendingReceiptSale(null);
            setSelectedReceiptSale(saleToPrint);
          }}
          onDismissWithoutPrint={() => {
            const s = pendingReceiptSale;
            setPendingReceiptSale(null);
            setConfirmedSaleNotice({
              saleId: s.id,
              saleNumber: s.saleNumber,
              totalBs: s.totalBs,
              totalUSD: s.totalUSD,
              customerName: s.customerName || 'Cliente Ocasional',
              date: s.date,
              changeBs: s.changeBs,
              changeUSD: s.changeUSD,
              paymentMethod: s.paymentMethod,
              sale: s,
            });
          }}
        />
      )}

      {/* Cash Shift Arqueo & Closure Receipt (Corte Z) Modal */}
      {selectedReceiptShift && (
        <ShiftReceiptModal
          shift={selectedReceiptShift}
          onClose={() => setSelectedReceiptShift(null)}
        />
      )}

      {/* Cash Shifts & Drawer Management Modal */}
      <ShiftModal />

      {/* User Login Modal when triggered from header */}
      {(isLoginModalOpen || !currentUser) && <LoginModal />}

      {/* Supervisor Password Verification Modal (if enabled in settings) */}
      <SupervisorAuthModal />

      {/* Admin Password Modal to access Settings/Config module */}
      <SettingsAuthModal />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
