import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Store, 
  Save, 
  Download, 
  Upload, 
  CheckCircle2, 
  DollarSign,
  ShieldCheck, 
  ShieldAlert,
  Lock, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  Database,
  Trash2,
  AlertCircle,
  X,
  Key,
  Hash,
  UserCheck,
  Printer,
  Zap,
  FolderOpen,
  Copy,
  Check,
  Globe,
  FileDown
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { api } from '../../services/api';
import { ReceiptPrintMode } from '../../types';

export const SettingsView: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    resetToSampleData, 
    products, 
    sales, 
    movements, 
    customers,
    credits,
    payables,
    categories,
    shifts,
    bcvRate, 
    updateBcvRate,
    syncBcvRateOnline,
    isSyncingBcv,
    users,
    currentUser,
    changePasswordOrPin,
    requestSupervisorAuth,
    isSettingsUnlocked,
    unlockSettings,
    lockSettings,
    setActiveTab,
    isDbConnected,
    verifyAdminPassword,
    isOnline,
    serverLatencyMs,
    restoreBackupData,
    refreshState,
  } = useStore();

  const [name, setName] = useState(settings.name);
  const [rif, setRif] = useState(settings.rif || '');
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter);
  const [receiptPrintMode, setReceiptPrintMode] = useState<ReceiptPrintMode>(settings.receiptPrintMode || 'ask');
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(settings.autoPrintReceipt !== false);
  const [showNonFiscalNotice, setShowNonFiscalNotice] = useState(settings.showNonFiscalNotice !== false);
  const [enableIgtf, setEnableIgtf] = useState(settings.enableIgtf || false);
  const [igtfRate, setIgtfRate] = useState((settings.igtfRate || 3).toString());
  const [rateInput, setRateInput] = useState(bcvRate.toString());
  const [autoUpdateBcv, setAutoUpdateBcv] = useState(settings.autoUpdateBcv !== false);
  const [bcvSyncFeedback, setBcvSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Database Info (Local SQLite)
  const [dbInfo, setDbInfo] = useState<{ 
    provider?: string;
    dbPath: string; 
    dataDir: string; 
    exists: boolean; 
    sizeBytes: number; 
    counts?: { products: number; sales: number; customers: number };
    platform: string 
  } | null>(null);
  const [copiedDbPath, setCopiedDbPath] = useState(false);
  const [copiedWebUrl, setCopiedWebUrl] = useState(false);
  const [openFolderMsg, setOpenFolderMsg] = useState('');
  const [isOpeningFolder, setIsOpeningFolder] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<{ type: 'idle' | 'success' | 'error' | 'loading'; message?: string }>({ type: 'idle' });

  useEffect(() => {
    api.getDbInfo().then((info) => {
      setDbInfo(info);
    }).catch(() => {});
  }, []);

  const handleOpenDbFolder = async () => {
    setIsOpeningFolder(true);
    setOpenFolderMsg('');
    try {
      const res = await api.openDbFolder();
      if (res.success) {
        setOpenFolderMsg('¡Carpeta abierta en el Explorador!');
      } else {
        setOpenFolderMsg(res.error || 'No se pudo abrir automáticamente en este entorno web.');
      }
    } catch {
      setOpenFolderMsg('El servidor está en modo web remoto; use "Descargar Base de Datos".');
    } finally {
      setIsOpeningFolder(false);
      setTimeout(() => setOpenFolderMsg(''), 4000);
    }
  };

  const handleCopyDbPath = () => {
    if (dbInfo?.dbPath) {
      navigator.clipboard.writeText(dbInfo.dbPath);
      setCopiedDbPath(true);
      setTimeout(() => setCopiedDbPath(false), 3000);
    }
  };

  const handleCopyWebUrl = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.origin);
      setCopiedWebUrl(true);
      setTimeout(() => setCopiedWebUrl(false), 3000);
    }
  };

  // Sincronizar estado local si settings o la tasa cambian
  useEffect(() => {
    setName(settings.name || '');
    setRif(settings.rif || '');
    setPhone(settings.phone || '');
    setAddress(settings.address || '');
    setReceiptFooter(settings.receiptFooter || '');
    setAutoPrintReceipt(settings.autoPrintReceipt !== false);
    setShowNonFiscalNotice(settings.showNonFiscalNotice !== false);
    setEnableIgtf(settings.enableIgtf || false);
    setIgtfRate((settings.igtfRate || 3).toString());
    setRateInput(bcvRate.toString());
    setAdminPasswordInput(settings.adminPassword || 'admin123');
    setRequireSupervisorPassword(settings.requireSupervisorPasswordForChanges !== false);
  }, [settings, bcvRate]);

  // Security settings state
  const [adminPasswordInput, setAdminPasswordInput] = useState(settings.adminPassword || 'admin123');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [requireSupervisorPassword, setRequireSupervisorPassword] = useState(
    settings.requireSupervisorPasswordForChanges !== false
  );

  // User credentials management state (Password & PIN)
  const [credentialTab, setCredentialTab] = useState<'password' | 'pin'>('password');
  const [currentCredentialInput, setCurrentCredentialInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');

  const [showCurrentCredential, setShowCurrentCredential] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const [credError, setCredError] = useState('');
  const [credSuccess, setCredSuccess] = useState('');
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredError('');
    setCredSuccess('');

    if (!currentCredentialInput.trim()) {
      setCredError('Por favor ingrese su contraseña o PIN actual para autorizar el cambio.');
      return;
    }
    const cleanNewPass = newPasswordInput.trim();
    if (!cleanNewPass || cleanNewPass.length < 4) {
      setCredError('La nueva contraseña debe contener al menos 4 caracteres.');
      return;
    }
    if (cleanNewPass !== confirmPasswordInput.trim()) {
      setCredError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    setIsUpdatingCreds(true);
    try {
      const res = await changePasswordOrPin({
        currentPasswordOrPin: currentCredentialInput.trim(),
        newPassword: cleanNewPass,
      });

      if (!res.success) {
        setCredError(res.error || 'Error al actualizar la contraseña.');
      } else {
        setCredSuccess('¡Contraseña de Administrador actualizada exitosamente en la base de datos!');
        setAdminPasswordInput(cleanNewPass);
        setCurrentCredentialInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
        setTimeout(() => setCredSuccess(''), 4000);
      }
    } catch (err: any) {
      setCredError(err.message || 'Error inesperado al guardar la contraseña.');
    } finally {
      setIsUpdatingCreds(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredError('');
    setCredSuccess('');

    if (!currentCredentialInput.trim()) {
      setCredError('Por favor ingrese su contraseña o PIN actual para autorizar el cambio.');
      return;
    }
    const cleanPin = newPinInput.trim();
    if (!/^\d{4,6}$/.test(cleanPin)) {
      setCredError('El nuevo PIN debe tener entre 4 y 6 dígitos numéricos (ejemplo: 1234).');
      return;
    }
    if (cleanPin !== confirmPinInput.trim()) {
      setCredError('El nuevo PIN y su confirmación no coinciden.');
      return;
    }

    setIsUpdatingCreds(true);
    try {
      const res = await changePasswordOrPin({
        currentPasswordOrPin: currentCredentialInput.trim(),
        newPin: cleanPin,
      });

      if (!res.success) {
        setCredError(res.error || 'Error al actualizar el PIN.');
      } else {
        setCredSuccess('¡PIN de acceso rápido actualizado exitosamente en la base de datos!');
        setCurrentCredentialInput('');
        setNewPinInput('');
        setConfirmPinInput('');
        setTimeout(() => setCredSuccess(''), 4000);
      }
    } catch (err: any) {
      setCredError(err.message || 'Error inesperado al guardar el PIN.');
    } finally {
      setIsUpdatingCreds(false);
    }
  };

  // Delete database modal state
  const [isDeleteDbModalOpen, setIsDeleteDbModalOpen] = useState(false);
  const [deleteDbPassword, setDeleteDbPassword] = useState('');
  const [showDeleteDbPassword, setShowDeleteDbPassword] = useState(false);
  const [deleteDbError, setDeleteDbError] = useState('');
  const [dbDeletedSuccess, setDbDeletedSuccess] = useState(false);

  // Inline unlock state in case direct render without modal
  const [inlinePassword, setInlinePassword] = useState('');
  const [showInlinePassword, setShowInlinePassword] = useState(false);
  const [inlineError, setInlineError] = useState('');

  const handleInlineUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlinePassword.trim()) {
      setInlineError('Por favor ingrese la contraseña de Administrador.');
      return;
    }
    const res = unlockSettings(inlinePassword);
    if (!res.success) {
      setInlineError(res.error || 'Contraseña de Administrador incorrecta.');
    } else {
      setInlinePassword('');
      setInlineError('');
    }
  };

  if (!isSettingsUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 px-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 text-center animate-in fade-in zoom-in-95">
          <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl mx-auto flex items-center justify-center shadow-xs mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-1">
            Módulo de Configuración Protegido
          </h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Se requiere la contraseña de Administrador para acceder a las opciones del sistema, tasas oficiales y copias de seguridad.
          </p>

          <form onSubmit={handleInlineUnlock} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Contraseña de Administrador:
              </label>
              <div className="relative">
                <input
                  type={showInlinePassword ? 'text' : 'password'}
                  autoFocus
                  value={inlinePassword}
                  onChange={(e) => {
                    setInlinePassword(e.target.value);
                    if (inlineError) setInlineError('');
                  }}
                  placeholder="Ingrese su clave..."
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowInlinePassword(!showInlinePassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showInlinePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {inlineError && (
                <p className="text-xs font-bold text-rose-600 mt-1.5 flex items-center space-x-1">
                  <span>⚠️</span>
                  <span>{inlineError}</span>
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('pos')}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer text-center"
              >
                Volver al POS
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-colors cursor-pointer text-center shadow-xs"
              >
                Desbloquear
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const handleManualBcvSync = async () => {
    setBcvSyncFeedback(null);
    const res = await syncBcvRateOnline();
    if (res.success && res.rate) {
      setRateInput(res.rate.toString());
      setBcvSyncFeedback({
        type: 'success',
        message: `¡Tasa oficial del BCV obtenida exitosamente! Bs. ${res.rate.toFixed(2)} por $1 USD.`
      });
    } else {
      setBcvSyncFeedback({
        type: 'error',
        message: res.error || 'No se pudo conectar al servicio del BCV. Verifique su conexión.'
      });
    }
    setTimeout(() => setBcvSyncFeedback(null), 6000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedRate = parseFloat(rateInput.replace(',', '.'));
    const cleanRate = !isNaN(parsedRate) && parsedRate > 0 ? parsedRate : bcvRate;
    
    const parsedIgtfRate = parseFloat(igtfRate.replace(',', '.'));
    const cleanIgtfRate = !isNaN(parsedIgtfRate) && parsedIgtfRate >= 0 ? parsedIgtfRate : 3;

    updateSettings({
      name: name.trim() || 'Merkafacil',
      rif: rif.trim(),
      phone: phone.trim(),
      address: address.trim(),
      receiptFooter: receiptFooter.trim(),
      receiptPrintMode,
      autoPrintReceipt,
      showNonFiscalNotice,
      enableIgtf,
      igtfRate: cleanIgtfRate,
      bcvRate: cleanRate,
      bcvLastUpdated: new Date().toISOString(),
      autoUpdateBcv,
      adminPassword: adminPasswordInput.trim() || 'admin123',
      requireSupervisorPasswordForChanges: requireSupervisorPassword,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleDownloadBackup = () => {
    const backupData = {
      version: '2.5',
      database: 'sqlite',
      exportDate: new Date().toISOString(),
      settings: { ...settings, bcvRate },
      categories,
      products,
      customers,
      credits,
      payables,
      sales,
      movements,
      shifts,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `copia_seguridad_merkafacil_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (file) {
      fileReader.readAsText(file, 'UTF-8');
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.settings || parsed.products || parsed.sales) {
            requestSupervisorAuth({
              title: 'Restaurar Copia de Seguridad',
              description: 'Se reemplazarán o actualizarán los datos de la base de datos en el servidor.',
              actionType: 'restaurar_backup',
              onAuthorized: async () => {
                setRestoreStatus({ type: 'loading', message: 'Restaurando datos en el servidor...' });
                try {
                  const res = await restoreBackupData(parsed);
                  if (res.success) {
                    setRestoreStatus({
                      type: 'success',
                      message: '¡Copia de seguridad restaurada con éxito! Todos los módulos han sido sincronizados.'
                    });
                    setTimeout(() => setRestoreStatus({ type: 'idle' }), 6000);
                  } else {
                    setRestoreStatus({
                      type: 'error',
                      message: res.error || 'No se pudo completar la restauración en el servidor.'
                    });
                  }
                } catch (err: any) {
                  setRestoreStatus({
                    type: 'error',
                    message: err.message || 'Error de conexión al restaurar copia de seguridad.'
                  });
                }
              },
            });
          } else {
            setRestoreStatus({
              type: 'error',
              message: 'El archivo JSON no tiene la estructura de copia de seguridad de Merkafacil.'
            });
          }
        } catch (err) {
          setRestoreStatus({
            type: 'error',
            message: 'Error al procesar el archivo JSON seleccionado.'
          });
        }
      };
      // Reset input
      e.target.value = '';
    }
  };

  const handleConfirmDeleteDatabase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteDbPassword.trim()) {
      setDeleteDbError('Debe ingresar la contraseña de Administrador para confirmar.');
      return;
    }

    if (!verifyAdminPassword(deleteDbPassword)) {
      setDeleteDbError('Contraseña de Administrador incorrecta. Operación cancelada.');
      return;
    }

    // Password verified! Wipe database and reset to clean zero
    resetToSampleData();
    setName(settings.name);
    setRateInput((settings.bcvRate || 54.50).toString());
    setIsDeleteDbModalOpen(false);
    setDeleteDbPassword('');
    setDeleteDbError('');
    setDbDeletedSuccess(true);
    setTimeout(() => setDbDeletedSuccess(false), 6000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-black text-slate-900">Ajustes de la Bodega & Sistema Monetario</h2>
        </div>
        <button
          onClick={lockSettings}
          id="lock-settings-btn"
          type="button"
          title="Bloquear configuración para requerir clave nuevamente"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5 text-amber-600" />
          <span>Bloquear Configuración</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-2 text-xs font-bold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>¡Datos de la bodega y tasa BCV actualizados correctamente!</span>
        </div>
      )}

      {/* Main Settings Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center space-x-2">
          <Store className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-black text-slate-900">Datos del Establecimiento</h3>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          
          {/* Tasa BCV Highlight Section */}
          <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl space-y-2">
            <div className="flex items-center space-x-2 text-emerald-900">
              <DollarSign className="w-4 h-4 text-emerald-700" />
              <h4 className="text-xs font-black uppercase tracking-wider">
                Tasa de Cambio Oficial (Banco Central de Venezuela - BCV)
              </h4>
            </div>
            
            <p className="text-xs text-slate-600">
              Todos los productos en el inventario mantienen su precio base en dólares ($ USD) para proteger tu ganancia contra la inflación, y el sistema calcula en tiempo real los precios en Bolívares (Bs.) al público según esta tasa oficial.
            </p>

            <div className="flex items-center space-x-3 pt-2">
              <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-xl border border-emerald-300">
                <span className="text-xs font-extrabold text-slate-700">1 USD = Bs.</span>
                <input
                  type="text"
                  required
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  placeholder="54.50"
                  className="w-24 text-sm font-black text-emerald-950 focus:outline-none"
                />
              </div>
              <span className="text-xs text-emerald-800 font-bold">
                (Esta tasa se muestra fija como referencia oficial en la barra superior y actualiza los precios en Bolívares en toda la aplicación)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre de la Bodega / Minimarket *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Bodega & Víveres La Bendición"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                RIF del Negocio
              </label>
              <input
                type="text"
                value={rif}
                onChange={(e) => setRif(e.target.value)}
                placeholder="Ej. J-31415926-0 / V-18456789-1"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teléfono / WhatsApp de la Bodega
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. 0414-1234567 / 0424-9876543"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Dirección del Local
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej. Calle Principal con Av. Bolívar, Local 2"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mensaje al pie del Ticket de Venta (Única frase de agradecimiento)
            </label>
            <input
              type="text"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="Ej. ¡Gracias por su compra! Dios bendiga su hogar."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Esta es la única frase que se imprimirá al final para no desperdiciar papel térmico.
            </p>
          </div>

          {/* Ajustes Fiscales y Legales (Venezuela / SENIAT) */}
          <div className="pt-3 border-t border-slate-200/80 space-y-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Cumplimiento Tributario y Legal (SENIAT Venezuela)
              </h4>
            </div>

            {/* 1. Leyenda de No Fiscalidad */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="space-y-0.5 max-w-[80%]">
                <div className="flex items-center space-x-2">
                  <h5 className="text-xs font-black text-slate-900">
                    Aviso Obligatorio: «SIN VALOR TRIBUTARIO / COMPROBANTE NO FISCAL»
                  </h5>
                  <span className="text-[9px] font-black uppercase bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                    Requerido SENIAT
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Imprime de forma visible la advertencia de no fiscalidad al inicio y al pie del ticket. Indispensable para evitar sanciones o acusaciones de factura paralela en auditorías fiscales.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                <input
                  type="checkbox"
                  checked={showNonFiscalNotice}
                  onChange={(e) => setShowNonFiscalNotice(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* 2. Cobro IGTF 3% Divisas */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <h5 className="text-xs font-black text-slate-900">
                      Cobro de IGTF en Pagos con Divisas en Efectivo
                    </h5>
                    <span className="text-[9px] font-black uppercase bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                      Sujeto Pasivo Especial
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Aplica y desglosa el porcentaje de IGTF cuando el cliente cancela en dólares en efectivo ($ USD Cash).
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                  <input
                    type="checkbox"
                    checked={enableIgtf}
                    onChange={(e) => setEnableIgtf(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {enableIgtf && (
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Alícuota IGTF para pagos en efectivo divisa:
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="20"
                      value={igtfRate}
                      onChange={(e) => setIgtfRate(e.target.value)}
                      className="w-16 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-xs font-black text-slate-700">%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Configuración de Impresión de Tickets */}
          <div className="pt-3 border-t border-slate-100 space-y-4">
            <div>
              <div className="flex items-center space-x-2">
                <Printer className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Comportamiento de Comprobante / Ticket al Finalizar la Venta
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Elija si desea que la emisión de comprobante sea opcional tras cada venta, automática o desactivada.
              </p>
            </div>

            {/* 3 Print Mode Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: Ask (Opcional - Recomendado) */}
              <label 
                className={`relative flex flex-col p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                  receiptPrintMode === 'ask'
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <input
                    type="radio"
                    name="receiptPrintMode"
                    value="ask"
                    checked={receiptPrintMode === 'ask'}
                    onChange={() => setReceiptPrintMode('ask')}
                    className="sr-only"
                  />
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-slate-900">
                      Impresión Opcional
                    </span>
                  </div>
                  <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                    Recomendado
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                  Pregunta al terminar: el cajero decide si <strong>imprimir comprobante</strong> o <strong>solo registrar venta</strong> con un aviso en pantalla.
                </p>
              </label>

              {/* Option 2: Always (Siempre Mostrar / Imprimir) */}
              <label 
                className={`relative flex flex-col p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                  receiptPrintMode === 'always'
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <input
                    type="radio"
                    name="receiptPrintMode"
                    value="always"
                    checked={receiptPrintMode === 'always'}
                    onChange={() => setReceiptPrintMode('always')}
                    className="sr-only"
                  />
                  <span className="text-xs font-black text-slate-900">
                    Siempre Mostrar Ticket
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                  Abre la ventana de ticket e impresión directamente al cobrar cada venta, ideal para negocios con entrega obligatoria de ticket físico.
                </p>
              </label>

              {/* Option 3: Never (Solo registrar - Sin comprobante) */}
              <label 
                className={`relative flex flex-col p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                  receiptPrintMode === 'never'
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <input
                    type="radio"
                    name="receiptPrintMode"
                    value="never"
                    checked={receiptPrintMode === 'never'}
                    onChange={() => setReceiptPrintMode('never')}
                    className="sr-only"
                  />
                  <span className="text-xs font-black text-slate-900">
                    Solo Registrar Venta
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                  No abre tickets ni ventanas de impresión. Registra la venta y muestra directamente el aviso de venta confirmada.
                </p>
              </label>
            </div>

            {/* Sub-option: Auto-print on thermal printer when ticket view opens */}
            {receiptPrintMode !== 'never' && (
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-900">
                      Auto-imprimir en Impresora Térmica al Abrir Comprobante
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Envía automáticamente la orden de impresión térmica al abrir el ticket sin requerir clics adicionales.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                  <input
                    type="checkbox"
                    id="auto-print-toggle"
                    checked={autoPrintReceipt}
                    onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            )}

            {/* Kiosk Printing Tip */}
            <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1.5">
              <div className="flex items-center space-x-1.5 font-bold text-amber-800">
                <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                <span>¿Cómo activar la impresión 100% directa y silenciosa (sin ventanas)?</span>
              </div>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                Para que el ticket salga directamente de la impresora térmica (58mm u 80mm) sin mostrar la ventana de diálogo de Windows/Chrome:
              </p>
              <ol className="list-decimal list-inside space-y-0.5 text-[10.5px] text-amber-950 font-medium pl-1">
                <li>Configure su impresora de tickets como <strong>Predeterminada</strong> en Windows.</li>
                <li>Haga clic derecho en el acceso directo de Google Chrome o Edge &gt; <strong>Propiedades</strong>.</li>
                <li>En el campo <strong>Destino</strong>, agregue al final un espacio y: <code className="bg-amber-200/90 px-1 py-0.5 rounded font-mono font-bold text-amber-950">--kiosk-printing</code></li>
              </ol>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Configuración General</span>
            </button>
          </div>
        </form>
      </div>

      {/* ================= SECCIÓN: SEGURIDAD Y CONTROL DE ACCESO ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <div>
            <h3 className="text-sm font-black text-slate-900">Seguridad & Clave de Acceso (Usuario Único)</h3>
            <p className="text-[11px] text-slate-500">
              Contraseña maestra para abrir y cerrar sesión en el sistema de la bodega
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Active User Credentials Badge */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-xs font-black text-slate-900">
                    {currentUser?.name || 'Administrador (Dueño de Bodega)'}
                  </p>
                  <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Usuario Activo
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Usuario con acceso total al inventario, ventas, reportes y configuración
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-[11px] font-semibold text-slate-600 self-end sm:self-auto">
              <span className="inline-flex items-center space-x-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                <Key className="w-3 h-3 text-slate-400" />
                <span>Clave: <strong className="text-slate-800">Protegida</strong></span>
              </span>
              <span className="inline-flex items-center space-x-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                <Hash className="w-3 h-3 text-slate-400" />
                <span>PIN: <strong className="text-slate-800 font-mono">{currentUser?.pin || users.find(u => u.role === 'admin')?.pin || '1234'}</strong></span>
              </span>
            </div>
          </div>

          {/* Subheader & Tabs for Changing Credentials */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Opciones de Cambio de Credenciales</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Seleccione si desea cambiar la contraseña alfanumérica o el PIN numérico de acceso rápido
                </p>
              </div>

              {/* Segmented Tab Buttons */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl space-x-1 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setCredentialTab('password');
                    setCredError('');
                    setCredSuccess('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    credentialTab === 'password'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Key className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cambiar Contraseña</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCredentialTab('pin');
                    setCredError('');
                    setCredSuccess('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    credentialTab === 'pin'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Hash className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Cambiar PIN</span>
                </button>
              </div>
            </div>

            {/* Error / Success Feedback Banners */}
            {credError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-700 text-xs font-semibold animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{credError}</span>
              </div>
            )}

            {credSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-800 text-xs font-bold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{credSuccess}</span>
              </div>
            )}

            {/* TAB 1: FORMULARIO CAMBIAR CONTRASEÑA */}
            {credentialTab === 'password' && (
              <form onSubmit={handleChangePassword} className="space-y-4 pt-1">
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900">
                  La <strong>contraseña de administrador</strong> es la clave principal utilizada para iniciar sesión al abrir el sistema, ingresar a este módulo de Ajustes y autorizar anulaciones de ventas.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Contraseña o PIN Actual
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentCredential ? 'text' : 'password'}
                        value={currentCredentialInput}
                        onChange={(e) => setCurrentCredentialInput(e.target.value)}
                        placeholder="Contraseña o PIN actual"
                        className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentCredential(!showCurrentCredential)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showCurrentCredential ? 'Ocultar' : 'Mostrar'}
                      >
                        {showCurrentCredential ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nueva Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showNewPassword ? 'Ocultar' : 'Mostrar'}
                      >
                        {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Confirmar Nueva Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        placeholder="Repita la nueva contraseña"
                        className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showConfirmPassword ? 'Ocultar' : 'Mostrar'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isUpdatingCreds}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>{isUpdatingCreds ? 'Guardando en Base de Datos...' : 'Actualizar Contraseña'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: FORMULARIO CAMBIAR PIN */}
            {credentialTab === 'pin' && (
              <form onSubmit={handleChangePin} className="space-y-4 pt-1">
                <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-[11px] text-indigo-900">
                  El <strong>PIN de acceso rápido</strong> es un código numérico de 4 a 6 dígitos (ejemplo: <code>1234</code>) diseñado para desbloquear rápidamente el punto de venta o abrir turnos de caja sin tener que escribir una clave larga.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Contraseña o PIN Actual
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentCredential ? 'text' : 'password'}
                        value={currentCredentialInput}
                        onChange={(e) => setCurrentCredentialInput(e.target.value)}
                        placeholder="Contraseña o PIN actual"
                        className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentCredential(!showCurrentCredential)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showCurrentCredential ? 'Ocultar' : 'Mostrar'}
                      >
                        {showCurrentCredential ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nuevo PIN Numérico
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPin ? 'text' : 'password'}
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Ej. 1234 (4 a 6 dígitos)"
                        maxLength={6}
                        className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPin(!showNewPin)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showNewPin ? 'Ocultar' : 'Mostrar'}
                      >
                        {showNewPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Confirmar Nuevo PIN
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPin ? 'text' : 'password'}
                        value={confirmPinInput}
                        onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Repita el nuevo PIN"
                        maxLength={6}
                        className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPin(!showConfirmPin)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showConfirmPin ? 'Ocultar' : 'Mostrar'}
                      >
                        {showConfirmPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isUpdatingCreds}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Hash className="w-3.5 h-3.5" />
                    <span>{isUpdatingCreds ? 'Guardando en Base de Datos...' : 'Actualizar PIN'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Supervisor Sensitive Action Protection Toggle */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <label className="flex items-center space-x-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={requireSupervisorPassword}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setRequireSupervisorPassword(checked);
                  updateSettings({ requireSupervisorPasswordForChanges: checked });
                }}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Pedir clave para anular ventas y modificar precios
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {requireSupervisorPassword 
                    ? 'Activado: Se solicitará la contraseña o PIN antes de autorizar anulaciones de ventas o cambios sensibles.' 
                    : 'Desactivado (Recomendado para un solo usuario): Cambios directos e inmediatos sin confirmación.'}
                </span>
              </div>
            </label>

            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
              requireSupervisorPassword ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {requireSupervisorPassword ? 'Activado' : 'Desactivado'}
            </span>
          </div>
        </div>
      </div>

      {/* Supabase Cloud PostgreSQL Direct Access Card */}
      <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-white">
                Base de Datos en la Nube (Supabase PostgreSQL)
              </h3>
              <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                Clonación 1-Clic SQL
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Obtén el Script SQL listo para pegar en Supabase, conecta las credenciales de cada nuevo negocio y sincroniza inventario, ventas y libreta en tiempo real.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('supabase')}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-colors cursor-pointer shrink-0 flex items-center space-x-1.5 self-start sm:self-auto shadow-xs"
        >
          <Database className="w-4 h-4" />
          <span>Abrir Panel Supabase</span>
        </button>
      </div>

      {/* Base de Datos Local (SQLite) Card */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-black text-slate-900">
                  Base de Datos Local (SQLite)
                </h4>
                <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  Almacenamiento Local (bodega.db)
                </span>
                {dbInfo?.sizeBytes ? (
                  <span className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    {(dbInfo.sizeBytes / 1024).toFixed(1)} KB
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Tus datos locales se guardan de forma instantánea en el archivo <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px] font-bold text-slate-800">bodega.db</code>. Para sincronizar inventario y ventas entre múltiples dispositivos y en la nube, utiliza el módulo <strong className="text-emerald-700">Supabase</strong>.
              </p>
            </div>
          </div>

          {/* Direct Download Backup Action */}
          <a
            href="/api/system/download-db"
            download="bodega.db"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs self-start shrink-0"
            title="Descargar copia directa de la base de datos local"
          >
            <FileDown className="w-4 h-4 text-emerald-400" />
            <span>Descargar Archivo .DB</span>
          </a>
        </div>

        {/* Multi-Device Web Access & URL Sharing */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-slate-800">
                Acceso Web en Red / Móvil:
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyWebUrl}
              className="flex items-center space-x-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
            >
              {copiedWebUrl ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>¡Enlace Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copiar Enlace del Sistema</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-slate-500 leading-normal">
            Puedes abrir este enlace en el celular o tablet de tus cajeros o en cualquier navegador para usar la interfaz táctil adaptada.
          </p>

          <div className="p-2 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg break-all select-all border border-slate-800 flex items-center justify-between gap-2">
            <span>{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-bold shrink-0">URL del Sistema</span>
          </div>
        </div>

        {/* Live File Path & Direct Access Buttons */}
        {dbInfo?.dbPath && (
          <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Ruta del Archivo SQLite en el Servidor:
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyDbPath}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  title="Copiar ruta al portapapeles"
                >
                  {copiedDbPath ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copiar Ruta</span>
                    </>
                  )}
                </button>

                {dbInfo.platform === 'win32' && (
                  <button
                    type="button"
                    onClick={handleOpenDbFolder}
                    disabled={isOpeningFolder}
                    className="flex items-center space-x-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    title="Abre la carpeta de Windows directamente"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>{isOpeningFolder ? 'Abriendo...' : 'Abrir Carpeta'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="p-2 bg-slate-900 text-slate-300 font-mono text-[11px] rounded-lg break-all select-all border border-slate-800">
              {dbInfo.dbPath}
            </div>

            {openFolderMsg && (
              <p className="text-xs font-bold text-emerald-700 animate-in fade-in">
                {openFolderMsg}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Backup & Data Recovery */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-black text-slate-900">Copia de Seguridad y Respaldo de Datos</h3>
          <p className="text-xs text-slate-500">
            Descarga un archivo de respaldo completo en formato JSON o el archivo nativo .db para almacenar en la nube, pendrive o restaurar cuando lo necesites.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleDownloadBackup}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer border border-slate-200 shadow-2xs"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Descargar Respaldo JSON Completo</span>
            </button>

            <label className="py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer border border-emerald-200 shadow-2xs">
              <Upload className="w-4 h-4 text-emerald-700" />
              <span>Restaurar Respaldo JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreBackup}
                className="hidden"
              />
            </label>
          </div>

          {restoreStatus.type === 'loading' && (
            <div className="p-3.5 bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs rounded-xl flex items-center gap-2 animate-pulse">
              <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin shrink-0"></div>
              <span className="font-bold">{restoreStatus.message}</span>
            </div>
          )}

          {restoreStatus.type === 'success' && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">{restoreStatus.message}</span>
            </div>
          )}

          {restoreStatus.type === 'error' && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-bold">{restoreStatus.message}</span>
            </div>
          )}

          {dbDeletedSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">Base de datos borrada con éxito. Todos los registros se reiniciaron a cero (0).</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span>Borrar Base de Datos</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Elimina de forma irreversible todos los registros (productos, ventas, clientes, créditos e inventario)
              </p>
            </div>
            <button
              id="delete-db-btn"
              type="button"
              onClick={() => {
                setIsDeleteDbModalOpen(true);
                setDeleteDbPassword('');
                setDeleteDbError('');
              }}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shadow-xs shrink-0 self-start sm:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Borrar Base de Datos</span>
            </button>
          </div>
        </div>

        {/* Developer & System Credits Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3 text-left w-full sm:w-auto">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
              ET
            </div>
            <div>
              <p className="font-bold text-slate-800">
                Sistema desarrollado por <span className="text-emerald-700">Educom-tec</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Solución de Punto de Venta, Inventario & Bodega
              </p>
            </div>
          </div>
          <div className="w-full sm:w-auto flex justify-start sm:justify-end">
            <a
              href="mailto:rodriguezraul.pro@gmail.com"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 text-slate-600 font-semibold transition-all text-xs"
            >
              <span>rodriguezraul.pro@gmail.com</span>
            </a>
          </div>
        </div>
      </div>

      {/* Delete Database Confirmation & Password Modal */}
      {isDeleteDbModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div 
            id="delete-db-confirm-modal"
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    Borrar Base de Datos
                  </h3>
                  <p className="text-xs text-red-600 font-bold">
                    Acción crítica e irreversible
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteDbModalOpen(false);
                  setDeleteDbPassword('');
                  setDeleteDbError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Box */}
            <div className="my-4 p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-red-800 font-extrabold text-xs">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                <span>¡ADVERTENCIA DE SEGURIDAD!</span>
              </div>
              <p className="text-xs text-red-900/90 leading-relaxed font-medium">
                Esta acción eliminará de forma <strong>permanente e irreversible</strong> toda la información de la base de datos local SQLite:
              </p>
              <ul className="text-[11px] text-red-800/90 list-disc list-inside space-y-1 font-medium pl-1">
                <li>Todos los productos y catálogo del inventario</li>
                <li>Todo el historial de ventas y cobros realizados</li>
                <li>Directorio de clientes y libreta de cuentas por cobrar (créditos)</li>
                <li>Kardex de movimientos y arqueos de caja / turnos</li>
              </ul>
              <p className="text-[11px] text-red-950 font-black pt-1">
                La base de datos quedará completamente vacía en cero (0).
              </p>
            </div>

            {/* Password Verification Form */}
            <form onSubmit={handleConfirmDeleteDatabase} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ingrese la contraseña de Administrador para autorizar:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="delete-db-password-input"
                    type={showDeleteDbPassword ? 'text' : 'password'}
                    autoFocus
                    value={deleteDbPassword}
                    onChange={(e) => {
                      setDeleteDbPassword(e.target.value);
                      if (deleteDbError) setDeleteDbError('');
                    }}
                    placeholder="Contraseña de Administrador"
                    className={`w-full pl-9 pr-10 py-2.5 bg-slate-50 border rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 transition-all ${
                      deleteDbError
                        ? 'border-red-400 focus:ring-red-400 text-red-900'
                        : 'border-slate-200 focus:ring-red-500 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeleteDbPassword(!showDeleteDbPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showDeleteDbPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {deleteDbError && (
                  <div className="flex items-center space-x-1.5 mt-2 text-xs font-bold text-red-600">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{deleteDbError}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteDbModalOpen(false);
                    setDeleteDbPassword('');
                    setDeleteDbError('');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="confirm-delete-db-btn"
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Borrar Base de Datos</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
