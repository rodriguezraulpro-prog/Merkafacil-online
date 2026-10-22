import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Barcode, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  User, 
  UserCheck,
  MapPin,
  Phone,
  Zap,
  X, 
  Check, 
  AlertCircle, 
  Tag,
  DollarSign,
  LayoutList,
  LayoutGrid,
  Package,
  ChevronLeft,
  ChevronRight,
  Layers,
  Hash,
  PlusCircle,
  Split,
  Vault,
  Clock,
  Scale,
  BookOpen,
  FileText,
  Printer
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStore } from '../../context/StoreContext';
import { Category, PaymentMethod, Product, PaymentSplit } from '../../types';
import { WeightModal } from './WeightModal';
import { ConfirmedSaleNoticeBanner } from './ConfirmedSaleNoticeBanner';

export const PosView: React.FC = () => {
  const { 
    products, 
    categories,
    customers,
    findCustomerByIdDoc,
    addOrUpdateCustomer,
    cart, 
    settings,
    addToCart, 
    updateCartQuantity, 
    removeFromCart, 
    clearCart, 
    cartTotalUSD,
    cartTotalBs, 
    cartItemCount, 
    completeSale, 
    bcvRate,
    formatBs,
    formatUSD,
    usdToBs,
    currentShift,
    openShift,
    setIsShiftModalOpen,
    confirmedSaleNotice,
    dismissConfirmedSaleNotice,
    setSelectedReceiptSale,
  } = useStore();

  const allCategories = useMemo(() => ['Todas', ...categories], [categories]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Todas' | Category>('Todas');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [mobilePosTab, setMobilePosTab] = useState<'catalog' | 'cart'>('catalog');
  const categoriesRef = useRef<HTMLDivElement>(null);

  // Customer Identification State (Venezuelan Cédula / RIF lookup & registration)
  const [docType, setDocType] = useState<'V' | 'E' | 'J' | 'G'>('V');
  const [docNumber, setDocNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Inline Shift Opening State (when cash drawer is closed)
  const [inlineOpenBs, setInlineOpenBs] = useState('');
  const [inlineOpenUSD, setInlineOpenUSD] = useState('');
  const [inlineOpenNotes, setInlineOpenNotes] = useState('');
  const [inlineOpenError, setInlineOpenError] = useState('');

  const handleInlineOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    setInlineOpenError('');
    const initBs = parseFloat(inlineOpenBs) || 0;
    const initUSD = parseFloat(inlineOpenUSD) || 0;

    const res = openShift({
      initialCashBs: initBs,
      initialCashUSD: initUSD,
      notes: inlineOpenNotes,
    });

    if (res.success) {
      setInlineOpenBs('');
      setInlineOpenUSD('');
      setInlineOpenNotes('');
    } else {
      setInlineOpenError(res.error || 'Error al abrir la caja');
    }
  };
  const [isCustomerIdentified, setIsCustomerIdentified] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  const handleDocNumberChange = (value: string, currentType = docType) => {
    const cleanDigits = value.replace(/\D/g, '');
    setDocNumber(cleanDigits);

    if (cleanDigits.length >= 5) {
      const found = findCustomerByIdDoc(cleanDigits, currentType);
      if (found) {
        setCustomerName(found.name);
        setCustomerPhone(found.phone || '');
        setCustomerAddress(found.address || '');
        setIsCustomerIdentified(true);
        setIsNewCustomer(false);
      } else {
        setIsCustomerIdentified(false);
        setIsNewCustomer(true);
      }
    } else {
      setIsNewCustomer(false);
      if (!cleanDigits) {
        setIsCustomerIdentified(false);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
      }
    }
  };

  const handleDocTypeChange = (newType: 'V' | 'E' | 'J' | 'G') => {
    setDocType(newType);
    if (docNumber.length >= 5) {
      handleDocNumberChange(docNumber, newType);
    }
  };

  const handleSetOccasionalCustomer = () => {
    setDocNumber('');
    setCustomerName('Cliente Ocasional');
    setCustomerPhone('');
    setCustomerAddress('');
    setIsCustomerIdentified(true);
    setIsNewCustomer(false);
  };

  const handleClearCustomer = () => {
    setDocNumber('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setIsCustomerIdentified(false);
    setIsNewCustomer(false);
  };

  const handleSaveNewCustomer = () => {
    if (!customerName.trim()) return;
    if (docNumber.trim()) {
      addOrUpdateCustomer({
        idDocType: docType,
        idDocNumber: docNumber,
        name: customerName,
        phone: customerPhone || undefined,
        address: customerAddress || undefined,
      });
    }
    setIsCustomerIdentified(true);
    setIsNewCustomer(false);
  };

  const resetCustomer = () => {
    setDocNumber('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setIsCustomerIdentified(false);
    setIsNewCustomer(false);
  };

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoriesRef.current) {
      const scrollAmount = 220;
      categoriesRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  
  // Checkout Modal States
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'single' | 'mixed'>('single');
  const [paymentCurrency, setPaymentCurrency] = useState<'Bs.' | '$'>('Bs.');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo_bs');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [discountUSDInput, setDiscountUSDInput] = useState<string>('0');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // IGTF 3% en divisas efectivo
  const [applyIgtf, setApplyIgtf] = useState<boolean>(settings.enableIgtf || false);

  useEffect(() => {
    setApplyIgtf(settings.enableIgtf || false);
  }, [settings.enableIgtf]);

  // Fiado Specific / Partial Debt States
  const [fiadoScope, setFiadoScope] = useState<'full' | 'specific'>('full');
  const [fiadoOwedInput, setFiadoOwedInput] = useState<string>('');
  const [fiadoDownPaymentInput, setFiadoDownPaymentInput] = useState<string>('0');
  const [fiadoDownPaymentMethod, setFiadoDownPaymentMethod] = useState<PaymentMethod>('efectivo_bs');
  const [fiadoDownPaymentReference, setFiadoDownPaymentReference] = useState<string>('');

  // Mixed Payment Split States
  interface SplitEntry {
    id: string;
    method: 'pago_movil' | 'punto_debito' | 'efectivo_bs' | 'efectivo_usd' | 'transferencia' | 'fiado';
    currency: 'Bs.' | '$';
    amount: string;
    reference: string;
    note: string;
  }
  const [splits, setSplits] = useState<SplitEntry[]>([]);

  // Weight / Scale Modal States
  const [weighingProduct, setWeighingProduct] = useState<Product | null>(null);
  const [weighingInitialWeight, setWeighingInitialWeight] = useState<number>(1);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState<boolean>(false);

  const handleOpenWeightModal = (product: Product, initialWeight?: number) => {
    setWeighingProduct(product);
    const existing = cart.find(c => c.product.id === product.id);
    const defaultWeight = initialWeight ?? (existing ? existing.quantity : 1);
    setWeighingInitialWeight(defaultWeight);
    setIsWeightModalOpen(true);
  };

  const handleConfirmWeight = (weightKg: number) => {
    if (!weighingProduct) return;
    addToCart(weighingProduct, weightKg, true);
  };

  const handleProductAction = (product: Product) => {
    if (product.stock <= 0) return;
    if (product.unit === 'kg') {
      const existing = cart.find(c => c.product.id === product.id);
      handleOpenWeightModal(product, existing ? existing.quantity : 1);
    } else {
      addToCart(product, 1);
    }
  };

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q || 
        p.name.toLowerCase().includes(q) || 
        p.barcode.toLowerCase().includes(q);
      
      const matchesCat = selectedCategory === 'Todas' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Handle barcode or exact single result enter key
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const q = searchQuery.trim();
      if (!q) return;

      const exactBarcode = products.find(p => p.barcode === q);
      if (exactBarcode) {
        if (exactBarcode.stock > 0) {
          handleProductAction(exactBarcode);
          setSearchQuery('');
        }
        return;
      }

      if (filteredProducts.length === 1 && filteredProducts[0].stock > 0) {
        handleProductAction(filteredProducts[0]);
        setSearchQuery('');
      }
    }
  };

  // Calculations for checkout
  const discountUSD = parseFloat(discountUSDInput) || 0;
  const finalTotalUSD = Math.max(0, cartTotalUSD - discountUSD);
  const finalTotalBs = finalTotalUSD * bcvRate;

  // IGTF 3% Divisas en Efectivo
  const isUsdCash = paymentMethod === 'efectivo_usd';
  const igtfRateVal = settings.igtfRate || 3;
  const currentIgtfUSD = (applyIgtf && isUsdCash) ? (finalTotalUSD * igtfRateVal / 100) : 0;
  const currentIgtfBs = currentIgtfUSD * bcvRate;

  // Expected amount according to selected payment currency (Single Mode)
  const targetTotal = paymentCurrency === '$' ? (finalTotalUSD + currentIgtfUSD) : finalTotalBs;
  const amountPaidNum = parseFloat(amountPaidInput.replace(',', '.')) || 0;

  // Change calculations (Single Mode)
  let changeUSD = 0;
  let changeBs = 0;
  if (paymentCurrency === '$') {
    changeUSD = Math.max(0, amountPaidNum - (finalTotalUSD + currentIgtfUSD));
    changeBs = changeUSD * bcvRate;
  } else {
    changeBs = Math.max(0, amountPaidNum - finalTotalBs);
    changeUSD = bcvRate > 0 ? changeBs / bcvRate : 0;
  }

  // Fiado Specific Debt calculations
  const fiadoOwedNum = parseFloat(fiadoOwedInput.replace(',', '.')) || 0;
  const fiadoDownPaymentNum = parseFloat(fiadoDownPaymentInput.replace(',', '.')) || 0;

  const handleSetFiadoScope = (scope: 'full' | 'specific') => {
    setFiadoScope(scope);
    setCheckoutError(null);
    if (scope === 'full') {
      setFiadoOwedInput(targetTotal.toFixed(2));
      setFiadoDownPaymentInput('0');
      setFiadoDownPaymentReference('');
    } else {
      const half = (targetTotal / 2).toFixed(2);
      setFiadoOwedInput(half);
      setFiadoDownPaymentInput((targetTotal - parseFloat(half)).toFixed(2));
    }
  };

  const handleFiadoOwedChange = (val: string) => {
    setFiadoOwedInput(val);
    const num = parseFloat(val.replace(',', '.')) || 0;
    const diff = Math.max(0, targetTotal - num);
    setFiadoDownPaymentInput(diff.toFixed(2));
  };

  const handleFiadoDownPaymentChange = (val: string) => {
    setFiadoDownPaymentInput(val);
    const num = parseFloat(val.replace(',', '.')) || 0;
    const diff = Math.max(0, targetTotal - num);
    setFiadoOwedInput(diff.toFixed(2));
  };

  // Calculations for Mixed Payment
  const totalSplitsBs = useMemo(() => {
    return splits.reduce((acc, s) => {
      const val = parseFloat(s.amount.replace(',', '.')) || 0;
      return acc + (s.currency === '$' ? val * bcvRate : val);
    }, 0);
  }, [splits, bcvRate]);

  const totalSplitsUSD = bcvRate > 0 ? totalSplitsBs / bcvRate : 0;
  const remainingSplitBs = Math.max(0, finalTotalBs - totalSplitsBs);
  const remainingSplitUSD = bcvRate > 0 ? remainingSplitBs / bcvRate : 0;
  const splitChangeBs = Math.max(0, totalSplitsBs - finalTotalBs);
  const splitChangeUSD = bcvRate > 0 ? splitChangeBs / bcvRate : 0;
  const isSplitCovered = totalSplitsBs >= finalTotalBs - 0.01;

  const openCheckout = () => {
    if (cart.length === 0) return;
    setPaymentMode('single');
    setPaymentCurrency('Bs.');
    setPaymentMethod('efectivo_bs');
    setPaymentReference('');
    setApplyIgtf(settings.enableIgtf || false);
    setAmountPaidInput(finalTotalBs.toFixed(2));
    setDiscountUSDInput('0');
    setCheckoutError(null);
    setFiadoScope('full');
    setFiadoOwedInput(finalTotalBs.toFixed(2));
    setFiadoDownPaymentInput('0');
    setFiadoDownPaymentMethod('efectivo_bs');
    setFiadoDownPaymentReference('');

    // Initial default split pair (Cash + Card)
    const halfBs = (finalTotalBs / 2).toFixed(2);
    setSplits([
      {
        id: 'split-1',
        method: 'efectivo_bs',
        currency: 'Bs.',
        amount: halfBs,
        reference: '',
        note: 'Efectivo',
      },
      {
        id: 'split-2',
        method: 'punto_debito',
        currency: 'Bs.',
        amount: (finalTotalBs - parseFloat(halfBs)).toFixed(2),
        reference: '',
        note: 'Tarjeta #1',
      },
    ]);
    setIsCheckoutOpen(true);
  };

  // Handle switching payment currency in single mode
  const handleCurrencySwitch = (curr: 'Bs.' | '$') => {
    setPaymentCurrency(curr);
    setPaymentReference('');
    if (curr === '$') {
      setPaymentMethod('efectivo_usd');
      const igtf = applyIgtf ? (finalTotalUSD * (settings.igtfRate || 3)) / 100 : 0;
      setAmountPaidInput((finalTotalUSD + igtf).toFixed(2));
      setFiadoOwedInput(finalTotalUSD.toFixed(2));
      setFiadoDownPaymentMethod('efectivo_usd');
    } else {
      setPaymentMethod('efectivo_bs');
      setAmountPaidInput(finalTotalBs.toFixed(2));
      setFiadoOwedInput(finalTotalBs.toFixed(2));
      setFiadoDownPaymentMethod('efectivo_bs');
    }
    setFiadoDownPaymentInput('0');
    setFiadoDownPaymentReference('');
  };

  // Handle selecting payment method in single mode
  const handleSelectPaymentMethod = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setPaymentReference('');
    if (method === 'efectivo_usd') {
      const igtf = applyIgtf ? (finalTotalUSD * (settings.igtfRate || 3)) / 100 : 0;
      setAmountPaidInput((finalTotalUSD + igtf).toFixed(2));
    }
    if (method === 'fiado') {
      setFiadoScope('full');
      setFiadoOwedInput(targetTotal.toFixed(2));
      setFiadoDownPaymentInput('0');
      setFiadoDownPaymentReference('');
      if (paymentCurrency === '$') {
        setFiadoDownPaymentMethod('efectivo_usd');
      } else {
        setFiadoDownPaymentMethod('efectivo_bs');
      }
      // For fiados, client cannot be anonymous/occasional
      if (customerName === 'Cliente Ocasional' || !customerName.trim()) {
        handleClearCustomer();
      }
    }
  };

  // Split management helpers
  const handleAddSplit = () => {
    const missingBs = Math.max(0, finalTotalBs - totalSplitsBs);
    setSplits(prev => [
      ...prev,
      {
        id: `split-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        method: 'punto_debito',
        currency: 'Bs.',
        amount: missingBs > 0 ? missingBs.toFixed(2) : '',
        reference: '',
        note: `Tarjeta #${prev.length + 1}`,
      },
    ]);
  };

  const handleRemoveSplit = (id: string) => {
    if (splits.length <= 1) return;
    setSplits(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateSplit = (id: string, updates: Partial<SplitEntry>) => {
    setSplits(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, ...updates };
      // If method is changed to USD cash, auto-set currency to '$'
      if (updates.method === 'efectivo_usd') {
        updated.currency = '$';
      } else if (updates.method && s.currency === '$') {
        updated.currency = 'Bs.';
      }
      return updated;
    }));
  };

  const handleFillRemaining = (splitId: string) => {
    setSplits(prev => {
      const otherTotalBs = prev
        .filter(s => s.id !== splitId)
        .reduce((acc, s) => {
          const val = parseFloat(s.amount.replace(',', '.')) || 0;
          return acc + (s.currency === '$' ? val * bcvRate : val);
        }, 0);

      const missingBs = Math.max(0, finalTotalBs - otherTotalBs);
      return prev.map(s => {
        if (s.id !== splitId) return s;
        const newAmt = s.currency === '$' ? (bcvRate > 0 ? missingBs / bcvRate : 0) : missingBs;
        return {
          ...s,
          amount: newAmt > 0 ? newAmt.toFixed(2) : '0',
        };
      });
    });
  };

  const handleProcessSale = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    if (paymentMode === 'single') {
      if (paymentMethod === 'fiado') {
        const isOccasional = !customerName.trim() || customerName.trim().toLowerCase() === 'cliente ocasional';
        if (isOccasional) {
          setCheckoutError('Para registrar un crédito en la Libreta es obligatorio ingresar el Nombre y Apellido real del cliente.');
          return;
        }
        if (!docNumber.trim()) {
          setCheckoutError('Para registrar un crédito en la Libreta es obligatorio ingresar el número de Cédula o RIF del cliente.');
          return;
        }

        let owedAmount = targetTotal;
        let downPaymentAmount = 0;
        let fiadoSplits: PaymentSplit[] | undefined = undefined;

        if (fiadoScope === 'specific') {
          const parsedOwed = parseFloat(fiadoOwedInput.replace(',', '.')) || 0;
          if (parsedOwed <= 0) {
            setCheckoutError('El monto que queda debiendo en la libreta debe ser mayor a 0.');
            return;
          }
          if (parsedOwed > targetTotal + 0.01) {
            setCheckoutError(`El monto adeudado (${paymentCurrency} ${parsedOwed.toFixed(2)}) no puede superar el total de la venta (${paymentCurrency} ${targetTotal.toFixed(2)}).`);
            return;
          }

          owedAmount = parsedOwed;
          downPaymentAmount = Math.max(0, targetTotal - parsedOwed);

          if (downPaymentAmount > 0.009) {
            if (
              (fiadoDownPaymentMethod === 'pago_movil' || fiadoDownPaymentMethod === 'punto_debito' || fiadoDownPaymentMethod === 'transferencia') &&
              !fiadoDownPaymentReference.trim()
            ) {
              const methodTitle =
                fiadoDownPaymentMethod === 'pago_movil'
                  ? 'Pago Móvil'
                  : fiadoDownPaymentMethod === 'punto_debito'
                  ? 'Punto de Venta / Débito'
                  : 'Transferencia Bancaria';
              setCheckoutError(`Debe ingresar el número de referencia del ${methodTitle} para el abono inicial.`);
              return;
            }

            const owedUSD = paymentCurrency === '$' ? owedAmount : (bcvRate > 0 ? owedAmount / bcvRate : 0);
            const owedBs = paymentCurrency === '$' ? owedAmount * bcvRate : owedAmount;
            const downUSD = paymentCurrency === '$' ? downPaymentAmount : (bcvRate > 0 ? downPaymentAmount / bcvRate : 0);
            const downBs = paymentCurrency === '$' ? downPaymentAmount * bcvRate : downPaymentAmount;

            fiadoSplits = [
              {
                method: 'fiado',
                currency: paymentCurrency,
                amount: owedAmount,
                amountBs: owedBs,
                amountUSD: owedUSD,
                notes: `Queda debiendo en Libreta (${paymentCurrency} ${owedAmount.toFixed(2)})`,
              },
              {
                method: fiadoDownPaymentMethod as Exclude<PaymentMethod, 'mixto'>,
                currency: paymentCurrency,
                amount: downPaymentAmount,
                amountBs: downBs,
                amountUSD: downUSD,
                reference: fiadoDownPaymentReference.trim() || undefined,
                notes: `Abono inicial al momento de la venta (${paymentCurrency} ${downPaymentAmount.toFixed(2)})`,
              },
            ];
          }
        }

        const finalCustName = customerName.trim();
        const res = completeSale({
          paymentMethod: 'fiado',
          paymentCurrency,
          amountPaid: downPaymentAmount,
          paymentReference: fiadoDownPaymentReference.trim() || undefined,
          paymentSplits: fiadoSplits,
          customerName: finalCustName,
          customerIdDoc: docNumber ? `${docType}-${docNumber}` : undefined,
          customerPhone: customerPhone.trim() || undefined,
          customerAddress: customerAddress.trim() || undefined,
          discountUSD,
          notes: fiadoScope === 'specific' && downPaymentAmount > 0.009
            ? `Crédito parcial: Queda debiendo ${paymentCurrency} ${owedAmount.toFixed(2)} - Abonó ${paymentCurrency} ${downPaymentAmount.toFixed(2)}`
            : undefined,
        });

        if (res.success) {
          try {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.85 },
            });
          } catch (err) {
            // ignore
          }
          resetCustomer();
          setMobilePosTab('catalog');
          setIsCheckoutOpen(false);
        } else {
          setCheckoutError(res.error || 'Error al procesar el crédito');
        }
        return;
      }

      // Validate payment reference for Punto de Venta and Pago Móvil
      if (
        (paymentMethod === 'pago_movil' || paymentMethod === 'punto_debito' || paymentMethod === 'transferencia') &&
        !paymentReference.trim()
      ) {
        const methodTitle =
          paymentMethod === 'pago_movil'
            ? 'Pago Móvil'
            : paymentMethod === 'punto_debito'
            ? 'Punto de Venta / Débito'
            : 'Transferencia Bancaria';
        setCheckoutError(
          `Debe ingresar el número de referencia del ${methodTitle} para poder confirmar la venta.`
        );
        return;
      }

      if (paymentMethod !== 'fiado' && amountPaidNum < targetTotal - 0.01) {
        setCheckoutError(
          `El monto entregado (${paymentCurrency} ${amountPaidNum.toFixed(2)}) es menor al total a cobrar (${paymentCurrency} ${targetTotal.toFixed(2)}).`
        );
        return;
      }

      const finalCustName = customerName.trim() || (docNumber ? `Cliente ${docType}-${docNumber}` : 'Cliente Ocasional');
      const res = completeSale({
        paymentMethod,
        paymentCurrency,
        amountPaid: paymentMethod === 'fiado' ? 0 : amountPaidNum,
        paymentReference: paymentReference.trim() || undefined,
        customerName: finalCustName,
        customerIdDoc: docNumber ? `${docType}-${docNumber}` : undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        discountUSD,
        igtfAmountUSD: currentIgtfUSD,
        igtfAmountBs: currentIgtfBs,
      });

      if (res.success) {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.85 },
          });
        } catch (err) {
          // ignore
        }
        resetCustomer();
        setIsCheckoutOpen(false);
      } else {
        setCheckoutError(res.error || 'Error al procesar la venta');
      }
    } else {
      // Mixed Payment Mode Validation
      if (splits.length === 0) {
        setCheckoutError('Debe agregar al menos un método de pago.');
        return;
      }

      const hasFiadoSplit = splits.some(sp => sp.method === 'fiado');
      if (hasFiadoSplit) {
        const isOccasional = !customerName.trim() || customerName.trim().toLowerCase() === 'cliente ocasional';
        if (isOccasional) {
          setCheckoutError('Al incluir un pago a crédito en la Libreta es obligatorio ingresar el Nombre y Apellido real del cliente.');
          return;
        }
        if (!docNumber.trim()) {
          setCheckoutError('Al incluir un pago a crédito en la Libreta es obligatorio ingresar el número de Cédula o RIF del cliente.');
          return;
        }
      }

      for (let i = 0; i < splits.length; i++) {
        const sp = splits[i];
        const val = parseFloat(sp.amount.replace(',', '.')) || 0;
        if (val <= 0) {
          setCheckoutError(`El pago #${i + 1} tiene un monto inválido o en cero.`);
          return;
        }
        if (
          (sp.method === 'pago_movil' || sp.method === 'punto_debito' || sp.method === 'transferencia') &&
          !sp.reference.trim()
        ) {
          const name =
            sp.method === 'pago_movil'
              ? 'Pago Móvil'
              : sp.method === 'punto_debito'
              ? 'Punto / Débito'
              : 'Transferencia';
          setCheckoutError(
            `Debe ingresar el número de referencia para el pago #${i + 1} (${name}${sp.note ? ` - ${sp.note}` : ''}).`
          );
          return;
        }
      }

      if (totalSplitsBs < finalTotalBs - 0.01) {
        const missingBs = finalTotalBs - totalSplitsBs;
        const missingUSD = bcvRate > 0 ? missingBs / bcvRate : 0;
        setCheckoutError(
          `Aún falta por cubrir Bs. ${missingBs.toFixed(2)} ($ ${missingUSD.toFixed(2)}) para completar el total de la compra.`
        );
        return;
      }

      const paymentSplits: PaymentSplit[] = splits.map(s => {
        const amt = parseFloat(s.amount.replace(',', '.')) || 0;
        const isUSD = s.currency === '$';
        return {
          method: s.method,
          currency: s.currency,
          amount: amt,
          amountBs: isUSD ? amt * bcvRate : amt,
          amountUSD: isUSD ? amt : (bcvRate > 0 ? amt / bcvRate : 0),
          reference: s.reference.trim() || undefined,
          notes: s.note.trim() || undefined,
        };
      });

      const refList = paymentSplits
        .filter(s => s.reference)
        .map(s => `${s.notes ? s.notes + ': ' : ''}Ref ${s.reference}`)
        .join(', ');

      let splitIgtfUSD = 0;
      if (applyIgtf) {
        const usdCashSplits = paymentSplits.filter(sp => sp.method === 'efectivo_usd');
        splitIgtfUSD = usdCashSplits.reduce((acc, sp) => acc + (sp.amountUSD * (settings.igtfRate || 3)) / 100, 0);
      }
      const splitIgtfBs = splitIgtfUSD * bcvRate;

      const finalCustName = customerName.trim() || (docNumber ? `Cliente ${docType}-${docNumber}` : 'Cliente Ocasional');
      const res = completeSale({
        paymentMethod: 'mixto',
        paymentCurrency: 'Mixto',
        amountPaid: totalSplitsBs,
        paymentReference: refList || undefined,
        paymentSplits,
        customerName: finalCustName,
        customerIdDoc: docNumber ? `${docType}-${docNumber}` : undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        discountUSD,
        igtfAmountUSD: splitIgtfUSD,
        igtfAmountBs: splitIgtfBs,
      });

      if (res.success) {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.85 },
          });
        } catch (err) {
          // ignore
        }
        resetCustomer();
        setMobilePosTab('catalog');
        setIsCheckoutOpen(false);
      } else {
        setCheckoutError(res.error || 'Error al procesar la venta');
      }
    }
  };

  if (!currentShift) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Top Header Card */}
          <div className="bg-slate-900 text-white p-6 sm:p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white mx-auto flex items-center justify-center shadow-lg mb-3.5">
              <Vault className="w-7 h-7" />
            </div>
            <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider rounded-full mb-2">
              Punto de Venta Inhabilitado
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Apertura de Caja Requerida
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md mx-auto">
              Para comenzar a facturar y despachar productos en la bodega, registre el fondo inicial de efectivo con el que abre la jornada.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleInlineOpenShift} className="p-6 sm:p-8 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Cash Bs */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                <label className="block text-xs font-black text-emerald-950 uppercase tracking-wider mb-1.5">
                  Fondo Inicial en Bs.
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-black text-emerald-700">
                    Bs.
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    id="inline-shift-bs"
                    value={inlineOpenBs}
                    onChange={(e) => setInlineOpenBs(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-emerald-800 mt-1 font-medium">Efectivo para dar cambio en Bs.</p>
              </div>

              {/* Cash USD */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                <label className="block text-xs font-black text-emerald-950 uppercase tracking-wider mb-1.5">
                  Fondo Inicial en $ USD
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-black text-emerald-700">
                    $
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    id="inline-shift-usd"
                    value={inlineOpenUSD}
                    onChange={(e) => setInlineOpenUSD(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-emerald-800 mt-1 font-medium">Billetes para dar cambio en $</p>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Observación (Opcional):
              </label>
              <input
                type="text"
                value={inlineOpenNotes}
                onChange={(e) => setInlineOpenNotes(e.target.value)}
                placeholder="Ej: Inicio de jornada bodega"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {inlineOpenError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{inlineOpenError}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              id="submit-open-shift-pos"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-black transition-all shadow-sm hover:shadow-md flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Vault className="w-5 h-5" />
              <span>Abrir Caja y Habilitar Punto de Venta</span>
            </button>

            {/* Footer info */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Al abrir, podrá cobrar y agregar productos.</span>
              <button
                type="button"
                onClick={() => setIsShiftModalOpen(true)}
                className="text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
              >
                Historial de cierres
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5">
      {/* Confirmed Sale Notice (Impresión opcional o venta registrada) */}
      {confirmedSaleNotice && (
        <ConfirmedSaleNoticeBanner
          notice={confirmedSaleNotice}
          onPrint={() => {
            if (confirmedSaleNotice.sale) {
              setSelectedReceiptSale(confirmedSaleNotice.sale);
              dismissConfirmedSaleNotice();
            }
          }}
          onDismiss={dismissConfirmedSaleNotice}
        />
      )}

      {/* Top Active Shift Bar */}
      <div className="mb-3 bg-emerald-50/90 border border-emerald-200 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center space-x-2.5 text-xs text-emerald-950 font-bold">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>Caja Abierta (Turno #{currentShift.shiftNumber})</span>
          <span className="hidden sm:inline text-emerald-700 font-medium">
            • Fondo Inicial: Bs. {currentShift.initialCashBs.toFixed(2)} / $ {currentShift.initialCashUSD.toFixed(2)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsShiftModalOpen(true)}
          id="pos-open-shift-modal-btn"
          className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center space-x-1.5 px-2.5 py-1 rounded-lg hover:bg-emerald-100/60 transition-colors cursor-pointer"
          title="Realizar arqueo, registrar retiro/ingreso de efectivo o cerrar turno"
        >
          <Vault className="w-3.5 h-3.5 text-emerald-700" />
          <span>Control de Caja / Arqueo</span>
        </button>
      </div>
      {/* Mobile POS Tab Switcher: Catálogo vs Carrito */}
      <div className="lg:hidden mb-3 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => setMobilePosTab('catalog')}
          className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
            mobilePosTab === 'catalog'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Catálogo ({filteredProducts.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobilePosTab('cart')}
          className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all relative ${
            mobilePosTab === 'cart'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-700 bg-emerald-50/70 hover:bg-emerald-100/70'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Carrito</span>
          {cartItemCount > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              mobilePosTab === 'cart' ? 'bg-white text-emerald-800' : 'bg-emerald-600 text-white'
            }`}>
              {cartItemCount}
            </span>
          )}
          {cartItemCount > 0 && (
            <span className="text-[11px] font-extrabold ml-0.5">
              {formatUSD(cartTotalUSD)}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: Catalog & Products List (7 Cols) */}
        <div className={`${mobilePosTab === 'catalog' ? 'block' : 'hidden lg:block'} lg:col-span-7 space-y-3`}>
          
          {/* Search & Barcode Bar (Clean full-width without redundant BCV pill) */}
          <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                id="search-pos-products"
                placeholder="Buscar por nombre o código de barras (Enter para añadir)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-slate-400">
                  <Barcode className="w-4 h-4" />
                </div>
              )}
            </div>
          </div>

          {/* Categories Filter & View Mode Toggle */}
          <div className="flex items-center justify-between gap-2.5 min-w-0">
            {/* Horizontal Categories Slider with visible scrollbar & scroll arrows */}
            <div className="flex-1 min-w-0 flex items-center gap-1">
              <button
                type="button"
                onClick={() => scrollCategories('left')}
                title="Desplazar categorías a la izquierda"
                className="hidden sm:flex w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 items-center justify-center shrink-0 cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div 
                ref={categoriesRef}
                id="pos-categories-slider"
                className="flex space-x-1.5 overflow-x-auto pb-2 pt-0.5 category-scrollbar min-w-0 flex-1 scroll-smooth"
              >
                {allCategories.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => scrollCategories('right')}
                title="Desplazar categorías a la derecha"
                className="hidden sm:flex w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 items-center justify-center shrink-0 cursor-pointer shadow-2xs"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* View Mode Toggle (List vs Grid) */}
            <div className="flex items-center bg-white border border-slate-200 p-0.5 rounded-xl shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="Vista en Lista compacta"
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Lista</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Vista en Cuadrícula"
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Tarjetas</span>
              </button>
            </div>
          </div>

          {/* Compact Scrollable Products Container with internal scrollbar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col h-[calc(100vh-14.5rem)] min-h-[480px] max-h-[640px]">
            
            {viewMode === 'list' ? (
              /* COMPACT TABLE LIST (Like Inventory View) */
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/90 backdrop-blur-xs sticky top-0 z-10 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3.5">Producto</th>
                      <th className="py-2.5 px-2.5 hidden sm:table-cell">Categoría</th>
                      <th className="py-2.5 px-2.5 text-center">Stock</th>
                      <th className="py-2.5 px-3 text-right">Precio</th>
                      <th className="py-2.5 px-3 text-center w-14">Añadir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-slate-400">
                          <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p className="font-bold text-slate-600 text-sm">No se encontraron productos</p>
                          <p className="text-xs text-slate-400 mt-1">Intenta con otro término o categoría</p>
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => {
                        const isOutOfStock = product.stock <= 0;
                        const isLowStock = product.stock > 0 && product.stock <= product.minStock;
                        const priceBs = usdToBs(product.salePriceUSD);

                        return (
                          <tr
                            key={product.id}
                            id={`pos-prod-row-${product.id}`}
                            onClick={() => {
                              if (!isOutOfStock) handleProductAction(product);
                            }}
                            className={`group transition-colors select-none ${
                              isOutOfStock
                                ? 'bg-slate-50/60 opacity-60 cursor-not-allowed'
                                : 'hover:bg-emerald-50/60 cursor-pointer active:bg-emerald-100/50'
                            }`}
                          >
                            {/* Product Name & Barcode */}
                            <td className="py-2.5 px-3.5">
                              <div className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1 group-hover:text-emerald-900 flex items-center space-x-1.5">
                                <span>{product.name}</span>
                                {product.unit === 'kg' && (
                                  <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black shrink-0">
                                    <Scale className="w-2.5 h-2.5" />
                                    <span>Balanza</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-1 mt-0.5">
                                <Barcode className="w-3 h-3 text-slate-300 shrink-0" />
                                <span>{product.barcode}</span>
                              </div>
                            </td>

                            {/* Category */}
                            <td className="py-2.5 px-2.5 hidden sm:table-cell whitespace-nowrap">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                                {product.category}
                              </span>
                            </td>

                            {/* Stock Status */}
                            <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  isOutOfStock
                                    ? 'bg-red-100 text-red-700'
                                    : isLowStock
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {isOutOfStock ? 'Agotado' : `${product.stock} ${product.unit}`}
                              </span>
                            </td>

                            {/* Price: Big Bs. + Ref USD */}
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <span className="font-black text-emerald-800 text-xs sm:text-sm block leading-tight">
                                {formatBs(priceBs)}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 block">
                                Ref: {formatUSD(product.salePriceUSD)}{product.unit === 'kg' ? ' /kg' : ''}
                              </span>
                            </td>

                            {/* Quick Add / Weight Button */}
                            <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isOutOfStock) handleProductAction(product);
                                }}
                                disabled={isOutOfStock}
                                title={
                                  isOutOfStock 
                                    ? 'Producto agotado' 
                                    : product.unit === 'kg' 
                                    ? 'Pesar en balanza y calcular precio' 
                                    : 'Añadir al carrito'
                                }
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all mx-auto cursor-pointer ${
                                  isOutOfStock
                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                    : product.unit === 'kg'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-500 hover:text-white active:scale-90 shadow-2xs'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white active:scale-90 shadow-2xs'
                                }`}
                              >
                                {product.unit === 'kg' ? (
                                  <Scale className="w-3.5 h-3.5" />
                                ) : (
                                  <Plus className="w-4 h-4" />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* COMPACT GRID VIEW (inside scrollable container) */
              <div className="flex-1 overflow-y-auto p-3">
                {filteredProducts.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">No se encontraron productos</p>
                    <p className="text-xs text-slate-400 mt-1">Intenta con otro término o categoría</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {filteredProducts.map((product) => {
                      const isOutOfStock = product.stock <= 0;
                      const isLowStock = product.stock > 0 && product.stock <= product.minStock;
                      const priceBs = usdToBs(product.salePriceUSD);

                      return (
                        <div
                          key={product.id}
                          id={`pos-prod-${product.id}`}
                          onClick={() => {
                            if (!isOutOfStock) handleProductAction(product);
                          }}
                          className={`group bg-white rounded-xl border p-2.5 flex flex-col justify-between text-left transition-all duration-150 relative select-none ${
                            isOutOfStock
                              ? 'border-slate-200 opacity-60 cursor-not-allowed bg-slate-50/70'
                              : 'border-slate-200 hover:border-emerald-500 hover:shadow-xs cursor-pointer active:scale-[0.98]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-[9px] font-bold text-slate-500 uppercase truncate">
                              {product.category}
                            </span>
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 ${
                                isOutOfStock
                                  ? 'bg-red-100 text-red-700'
                                  : isLowStock
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isOutOfStock ? '0' : `${product.stock} ${product.unit}`}
                            </span>
                          </div>

                          <h3 className="text-xs font-black text-slate-900 line-clamp-2 leading-tight mb-2">
                            {product.name}
                          </h3>

                          {product.unit === 'kg' && (
                            <div className="mb-2">
                              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black">
                                <Scale className="w-3 h-3 text-emerald-600" />
                                <span>Por Kilo (Balanza)</span>
                              </span>
                            </div>
                          )}

                          <div className="pt-1.5 border-t border-slate-100 flex items-end justify-between mt-auto">
                            <div>
                              <span className="text-xs sm:text-sm font-black text-emerald-800 block leading-tight">
                                {formatBs(priceBs)}
                              </span>
                              <span className="text-[10px] font-extrabold text-slate-400 block">
                                Ref: {formatUSD(product.salePriceUSD)}{product.unit === 'kg' ? ' /kg' : ''}
                              </span>
                            </div>

                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                                isOutOfStock
                                  ? 'bg-slate-100 text-slate-300'
                                  : product.unit === 'kg'
                                  ? 'bg-amber-100 text-amber-800 group-hover:bg-amber-600 group-hover:text-white'
                                  : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
                              }`}
                            >
                              {product.unit === 'kg' ? (
                                <Scale className="w-3.5 h-3.5" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* List Footer / Status Bar */}
            <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-semibold shrink-0">
              <span>{filteredProducts.length} productos listados</span>
              <span className="text-slate-400 hidden sm:inline">Clic en cualquier producto para añadir</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Cart & Totals (Expanded to 5 Cols for more room) */}
        <div className={`${mobilePosTab === 'cart' ? 'block' : 'hidden lg:block'} lg:col-span-5 sticky top-16 sm:top-20`}>
          {/* Mobile Back to Catalog Button */}
          <div className="lg:hidden mb-2">
            <button
              type="button"
              onClick={() => setMobilePosTab('catalog')}
              className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-500" />
              <span>← Volver al catálogo para seguir agregando</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-13rem)] lg:h-[calc(100vh-10.5rem)] min-h-[480px] lg:min-h-[520px] max-h-[690px]">
            
            {/* Cart Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/90 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Carrito de Venta</h2>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    {cartItemCount} {cartItemCount === 1 ? 'artículo' : 'artículos'} agregados
                  </p>
                </div>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearCart();
                    resetCustomer();
                  }}
                  title="Vaciar carrito"
                  className="text-slate-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Vaciar</span>
                </button>
              )}
            </div>

            {/* Customer Identification Header Bar (Ask Cédula before / during sale) */}
            <div className="px-3.5 py-2.5 bg-slate-50/90 border-b border-slate-100 shrink-0">
              {isCustomerIdentified && customerName ? (
                <div className="flex items-start justify-between bg-white px-3 py-2 rounded-xl border border-emerald-200 shadow-2xs">
                  <div className="flex items-start space-x-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                      <UserCheck className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 truncate">
                        {customerName}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 truncate">
                        {docNumber ? `${docType}-${docNumber}` : 'Cliente Ocasional / Sin Cédula'}
                        {customerPhone ? ` • ${customerPhone}` : ''}
                      </div>
                      {customerAddress && (
                        <div className="text-[10px] text-slate-500 truncate flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          <span className="truncate">{customerAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearCustomer}
                    className="text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 text-[11px] font-bold border border-slate-200 transition-colors cursor-pointer shrink-0 ml-1"
                    title="Cambiar o quitar cliente"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-800 flex items-center space-x-1.5 text-xs">
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Cédula / RIF:</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleSetOccasionalCustomer}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-black shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
                      title="Vender a cliente ocasional sin pedir datos"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>Ocasional (Omitir)</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <select
                      value={docType}
                      onChange={(e) => handleDocTypeChange(e.target.value as any)}
                      className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 shrink-0"
                    >
                      <option value="V">V-</option>
                      <option value="E">E-</option>
                      <option value="J">J-</option>
                      <option value="G">G-</option>
                    </select>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Escriba Cédula (ej: 18745290)..."
                      value={docNumber}
                      onChange={(e) => handleDocNumberChange(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* If new customer not found, prompt to enter name to register */}
                  {isNewCustomer && (
                    <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl space-y-1.5 animate-in fade-in duration-100">
                      <p className="text-[10px] font-bold text-amber-900 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>No registrado. Ingrese los datos para guardarlo:</span>
                      </p>
                      <input
                        type="text"
                        placeholder="Nombre y Apellido del cliente *"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1">
                          <Phone className="w-3 h-3 text-slate-400 mr-1.5 shrink-0" />
                          <input
                            type="text"
                            placeholder="Teléfono (opcional)"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="w-full text-xs font-medium focus:outline-none bg-transparent"
                          />
                        </div>
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1">
                          <MapPin className="w-3 h-3 text-slate-400 mr-1.5 shrink-0" />
                          <input
                            type="text"
                            placeholder="Dirección (opcional)"
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                            className="w-full text-xs font-medium focus:outline-none bg-transparent"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end pt-0.5">
                        <button
                          type="button"
                          onClick={handleSaveNewCustomer}
                          disabled={!customerName.trim()}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-[11px] font-black shrink-0 cursor-pointer flex items-center space-x-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Guardar y Asignar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cart Items List with generous comfortable spacing */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-2.5 divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center mb-3 text-slate-300">
                    <ShoppingCart className="w-7 h-7" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">El carrito está vacío</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                    Selecciona o busca productos de la lista para registrarlos al cobro
                  </p>
                </div>
              ) : (
                cart.map((item) => {
                  const itemSubtotalBs = usdToBs(item.subtotalUSD);
                  const itemUnitBs = usdToBs(item.unitPriceUSD);
                  const isKg = item.product.unit === 'kg';

                  return (
                    <div key={item.product.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-2.5">
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center space-x-1.5">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={item.product.name}>
                            {item.product.name}
                          </h4>
                          {isKg && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase shrink-0">
                              Kg
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 mt-0.5">
                          {isKg ? (
                            <>
                              <span className="font-extrabold text-emerald-700">
                                {item.quantity} kg
                              </span>
                              <span className="text-slate-400">
                                a {formatUSD(item.unitPriceUSD)}/kg ({formatBs(itemUnitBs)})
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="font-black text-emerald-700">{formatBs(itemUnitBs)}</span>
                              <span className="text-slate-400">• Ref: {formatUSD(item.unitPriceUSD)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Quantity & Weight Controls */}
                      <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl shrink-0">
                        {isKg ? (
                          <>
                            {/* Direct Scale Weighing Modal button */}
                            <button
                              type="button"
                              onClick={() => handleOpenWeightModal(item.product, item.quantity)}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-1 text-xs font-black transition-colors cursor-pointer shadow-2xs"
                              title="Pesar o cambiar peso en balanza"
                            >
                              <Scale className="w-3.5 h-3.5" />
                              <span>{item.quantity} kg</span>
                            </button>
                            {/* Quick -0.1 kg and +0.1 kg adjustment */}
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.product.id, Math.max(0.05, Math.round((item.quantity - 0.1) * 1000) / 1000))}
                              className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                              title="Reducir 100 gramos (-0.1 kg)"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.product.id, Math.min(item.product.stock, Math.round((item.quantity + 0.1) * 1000) / 1000))}
                              disabled={item.quantity >= item.product.stock}
                              className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                              title="Aumentar 100 gramos (+0.1 kg)"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                              className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-black text-slate-900 w-6 text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                              disabled={item.quantity >= item.product.stock}
                              className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Line Subtotal */}
                      <div className="text-right shrink-0 min-w-[75px]">
                        <span className="text-xs sm:text-sm font-black text-slate-900 block leading-tight">
                          {formatBs(itemSubtotalBs)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 block">
                          {formatUSD(item.subtotalUSD)}
                        </span>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors cursor-pointer shrink-0"
                        title="Eliminar artículo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Cart Summary & Checkout Action */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50/90 space-y-3 shrink-0">
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                  <span>Subtotal Ref. Dólares:</span>
                  <span className="font-bold text-slate-800">{formatUSD(cartTotalUSD)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                  <span>Tasa BCV aplicada:</span>
                  <span className="font-bold text-emerald-700">Bs. {bcvRate.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Total a Cobrar:
                  </span>
                  <div className="text-right">
                    <span className="text-lg sm:text-xl font-black text-emerald-800 block leading-tight">
                      {formatBs(cartTotalBs)}
                    </span>
                    <span className="text-xs font-extrabold text-slate-500">
                      Ref: {formatUSD(cartTotalUSD)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cobrar Button */}
              <button
                id="btn-open-checkout"
                type="button"
                onClick={openCheckout}
                disabled={cart.length === 0}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-sm font-extrabold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Banknote className="w-5 h-5" />
                <span>Cobrar {cartTotalBs > 0 ? formatBs(cartTotalBs) : ''}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Floating Cart Summary Button (Shown when in Catalog and cart has items) */}
      {mobilePosTab === 'catalog' && cart.length > 0 && (
        <div className="lg:hidden fixed bottom-18 left-0 right-0 z-30 px-3 pointer-events-none animate-in slide-in-from-bottom-3 duration-200">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              type="button"
              onClick={() => setMobilePosTab('cart')}
              className="w-full bg-slate-900 text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between border border-emerald-500/40 active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div className="text-left leading-tight">
                  <div className="text-[10px] text-slate-400 font-bold">
                    {cartItemCount} {cartItemCount === 1 ? 'artículo' : 'artículos'} en carrito
                  </div>
                  <div className="text-xs sm:text-sm font-black text-white">
                    {formatBs(cartTotalBs)} <span className="text-emerald-400 text-xs font-extrabold">({formatUSD(cartTotalUSD)})</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1 bg-emerald-600 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-xs">
                <span>Cobrar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ================= CHECKOUT MODAL (VENEZUELA POS) ================= */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Cobro de Venta
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Tasa BCV Oficial: <strong className="text-emerald-700">Bs. {bcvRate.toFixed(2)}</strong> / $1 USD
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleProcessSale} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              
              {checkoutError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Total Display Box */}
              <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider text-emerald-800 block">
                    Monto Total de la Compra
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-950 block">
                    {formatBs(finalTotalBs)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                    Referencia en Divisas
                  </span>
                  <span className="text-base sm:text-lg font-extrabold text-slate-900">
                    {formatUSD(finalTotalUSD)}
                  </span>
                </div>
              </div>

              {/* Modalidad de Pago: Pago Único vs Pago Mixto / Combinado */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Modalidad de Cobro
                </label>
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('single')}
                    className={`py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                      paymentMode === 'single'
                        ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pago Único</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('mixed')}
                    className={`py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                      paymentMode === 'mixed'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Pago Mixto / Combinado</span>
                  </button>
                </div>
              </div>

              {/* ================= MODALIDAD: PAGO ÚNICO ================= */}
              {paymentMode === 'single' ? (
                <>
                  {/* Currency Selector: Pagar en Bs vs Pagar en USD */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      ¿En qué moneda paga el cliente?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleCurrencySwitch('Bs.')}
                        className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center space-x-2 border transition-all cursor-pointer ${
                          paymentCurrency === 'Bs.'
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>🇻🇪 Bolívares (Bs.)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCurrencySwitch('$')}
                        className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center space-x-2 border transition-all cursor-pointer ${
                          paymentCurrency === '$'
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>💵 Dólares ($ USD)</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      Método de Pago
                    </label>

                    {paymentCurrency === 'Bs.' ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {/* 1. Efectivo */}
                        <button
                          type="button"
                          onClick={() => handleSelectPaymentMethod('efectivo_bs')}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                            paymentMethod === 'efectivo_bs'
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-extrabold shadow-2xs ring-1 ring-emerald-600'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <Banknote className="w-4 h-4 mb-1 text-emerald-600" />
                          <span className="text-xs font-bold leading-tight">Efectivo Bs.</span>
                        </button>

                        {/* 2. Punto de Venta / Débito */}
                        <button
                          type="button"
                          onClick={() => handleSelectPaymentMethod('punto_debito')}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                            paymentMethod === 'punto_debito'
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-extrabold shadow-2xs ring-1 ring-emerald-600'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <CreditCard className="w-4 h-4 mb-1 text-blue-600" />
                          <span className="text-xs font-bold leading-tight">Punto / Débito</span>
                        </button>

                        {/* 3. Pago Móvil */}
                        <button
                          type="button"
                          onClick={() => handleSelectPaymentMethod('pago_movil')}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                            paymentMethod === 'pago_movil'
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-extrabold shadow-2xs ring-1 ring-emerald-600'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <Smartphone className="w-4 h-4 mb-1 text-emerald-600" />
                          <span className="text-xs font-bold leading-tight">Pago Móvil</span>
                        </button>

                        {/* 4. Crédito */}
                        <button
                          type="button"
                          onClick={() => handleSelectPaymentMethod('fiado')}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                            paymentMethod === 'fiado'
                              ? 'border-purple-600 bg-purple-50 text-purple-900 font-extrabold shadow-2xs ring-1 ring-purple-600'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <User className="w-4 h-4 mb-1 text-purple-600" />
                          <span className="text-xs font-bold leading-tight">Crédito</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {/* 1. Efectivo Divisas */}
                        <button
                          type="button"
                          onClick={() => handleSelectPaymentMethod('efectivo_usd')}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                            paymentMethod === 'efectivo_usd'
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-extrabold shadow-2xs ring-1 ring-emerald-600'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <DollarSign className="w-4 h-4 mb-1 text-emerald-600" />
                          <span className="text-xs font-bold leading-tight">Efectivo Divisas ($)</span>
                        </button>

                        {/* 4. Crédito en Divisas */}
                        <button
                          type="button"
                          onClick={() => handleSelectPaymentMethod('fiado')}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                            paymentMethod === 'fiado'
                              ? 'border-purple-600 bg-purple-50 text-purple-900 font-extrabold shadow-2xs ring-1 ring-purple-600'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <User className="w-4 h-4 mb-1 text-purple-600" />
                          <span className="text-xs font-bold leading-tight">Crédito en Divisas</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* IGTF 3% Divisas en Efectivo (Sujeto Pasivo Especial) */}
                  {paymentCurrency === '$' && paymentMethod === 'efectivo_usd' && (
                    <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-7 h-7 rounded-xl bg-purple-200 text-purple-900 flex items-center justify-center font-black text-xs">
                            %
                          </span>
                          <div>
                            <span className="text-xs font-black text-purple-950 block">
                              Cobro IGTF ({settings.igtfRate || 3}%)
                            </span>
                            <span className="text-[10px] text-purple-700 font-semibold block">
                              Impuesto a Grandes Transacciones (Divisas en Efectivo)
                            </span>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={applyIgtf}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setApplyIgtf(checked);
                              const igtf = checked ? (finalTotalUSD * (settings.igtfRate || 3)) / 100 : 0;
                              setAmountPaidInput((finalTotalUSD + igtf).toFixed(2));
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>

                      {applyIgtf && (
                        <div className="pt-2 border-t border-purple-200/80 space-y-1 text-[11px]">
                          <div className="flex justify-between text-purple-900 font-bold">
                            <span>Base Divisa: {formatUSD(finalTotalUSD)}</span>
                            <span>+ IGTF ({settings.igtfRate || 3}%): +{formatUSD(currentIgtfUSD)}</span>
                          </div>
                          <div className="flex justify-between text-purple-950 font-black text-xs pt-1 border-t border-purple-200/50">
                            <span>Total a Cobrar con IGTF:</span>
                            <span>{formatUSD(finalTotalUSD + currentIgtfUSD)} ({formatBs((finalTotalUSD + currentIgtfUSD) * bcvRate)})</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Reference Input (Required for Punto de Venta or Pago Móvil) */}
                  {(paymentMethod === 'pago_movil' || paymentMethod === 'punto_debito') && (
                    <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-blue-950 flex items-center space-x-1.5">
                          <Hash className="w-3.5 h-3.5 text-blue-600" />
                          <span>
                            {paymentMethod === 'pago_movil'
                              ? 'Nº de Referencia Pago Móvil'
                              : 'Nº de Referencia / Comprobante Punto'}
                          </span>
                          <span className="text-red-600 font-black">*</span>
                        </label>
                        <span className="text-[10px] font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                          Requerido
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder={
                          paymentMethod === 'pago_movil'
                            ? 'Ej: Últimos 4 o 6 dígitos (ej: 489210)'
                            : 'Ej: Nº de Aprobación o Lote (ej: 8294)'
                        }
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-blue-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                      <p className="text-[10px] text-blue-700 font-medium">
                        Obligatorio para conciliar con el banco y emitir el comprobante.
                      </p>
                    </div>
                  )}

                  {/* Fiado Debt Configuration (Todo el monto vs Monto en específico que queda debiendo) */}
                  {paymentMethod === 'fiado' && (
                    <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-purple-950 flex items-center space-x-1.5">
                          <BookOpen className="w-4 h-4 text-purple-700" />
                          <span>Modalidad de Crédito en Libreta</span>
                        </label>
                        <span className="text-[11px] font-black text-purple-900 bg-purple-200/80 px-2 py-0.5 rounded-md">
                          Total Venta: {paymentCurrency} {targetTotal.toFixed(2)}
                        </span>
                      </div>

                      {/* Modalidad Selector */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleSetFiadoScope('full')}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            fiadoScope === 'full'
                              ? 'bg-purple-700 text-white border-purple-800 shadow-xs ring-2 ring-purple-300'
                              : 'bg-white border-purple-200 text-purple-950 hover:bg-purple-100/60'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-black">Todo el Monto</span>
                            {fiadoScope === 'full' && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <span className={`text-[10px] mt-1 leading-tight font-medium ${fiadoScope === 'full' ? 'text-purple-100' : 'text-slate-500'}`}>
                            Debe el 100% de la venta ({paymentCurrency} {targetTotal.toFixed(2)})
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetFiadoScope('specific')}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            fiadoScope === 'specific'
                              ? 'bg-purple-700 text-white border-purple-800 shadow-xs ring-2 ring-purple-300'
                              : 'bg-white border-purple-200 text-purple-950 hover:bg-purple-100/60'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-black">Monto Específico</span>
                            {fiadoScope === 'specific' && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <span className={`text-[10px] mt-1 leading-tight font-medium ${fiadoScope === 'specific' ? 'text-purple-100' : 'text-slate-500'}`}>
                            Queda debiendo un monto fijado
                          </span>
                        </button>
                      </div>

                      {/* Specific Amount Mode Controls */}
                      {fiadoScope === 'specific' ? (
                        <div className="space-y-3 pt-2 border-t border-purple-200/80">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Queda Debiendo Input */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-black text-purple-950 flex items-center space-x-1">
                                  <FileText className="w-3.5 h-3.5 text-purple-700" />
                                  <span>Queda Debiendo ({paymentCurrency})</span>
                                </label>
                                <span className="text-[10px] font-black text-purple-800 bg-purple-200/70 px-1.5 py-0.5 rounded">
                                  Libreta
                                </span>
                              </div>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={targetTotal}
                                required
                                value={fiadoOwedInput}
                                onChange={(e) => handleFiadoOwedChange(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-3 py-2 bg-white border-2 border-purple-400 rounded-xl text-sm font-black text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-600 shadow-2xs"
                              />
                              <div className="flex items-center justify-between text-[10px] text-slate-500">
                                <span>Ref: {paymentCurrency === '$' ? formatBs(fiadoOwedNum * bcvRate) : formatUSD(bcvRate > 0 ? fiadoOwedNum / bcvRate : 0)}</span>
                                <div className="space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => handleFiadoOwedChange((targetTotal * 0.5).toFixed(2))}
                                    className="px-1.5 py-0.5 bg-purple-200 hover:bg-purple-300 text-purple-900 rounded font-bold cursor-pointer"
                                  >
                                    50%
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleFiadoOwedChange((targetTotal * 0.75).toFixed(2))}
                                    className="px-1.5 py-0.5 bg-purple-200 hover:bg-purple-300 text-purple-900 rounded font-bold cursor-pointer"
                                  >
                                    75%
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Abona Hoy Input */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-black text-emerald-950 flex items-center space-x-1">
                                  <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>Abona Hoy ({paymentCurrency})</span>
                                </label>
                                <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  Al Momento
                                </span>
                              </div>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max={targetTotal}
                                value={fiadoDownPaymentInput}
                                onChange={(e) => handleFiadoDownPaymentChange(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-3 py-2 bg-white border-2 border-emerald-400 rounded-xl text-sm font-black text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                              />
                              <div className="flex items-center justify-between text-[10px] text-slate-500">
                                <span>Ref: {paymentCurrency === '$' ? formatBs(fiadoDownPaymentNum * bcvRate) : formatUSD(bcvRate > 0 ? fiadoDownPaymentNum / bcvRate : 0)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleFiadoDownPaymentChange((targetTotal * 0.5).toFixed(2))}
                                  className="px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded font-bold cursor-pointer"
                                >
                                  50%
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* If customer is paying an initial downpayment today */}
                          {fiadoDownPaymentNum > 0.009 && (
                            <div className="p-3 bg-white border border-emerald-200 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black text-emerald-950 flex items-center space-x-1">
                                  <span>Método de pago del Abono Inicial:</span>
                                </span>
                                <span className="text-xs font-black text-emerald-800">
                                  {paymentCurrency} {fiadoDownPaymentNum.toFixed(2)}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setFiadoDownPaymentMethod('efectivo_bs')}
                                  className={`p-1.5 rounded-lg border text-center text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                                    fiadoDownPaymentMethod === 'efectivo_bs'
                                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-black shadow-2xs ring-1 ring-emerald-500'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Efectivo Bs.</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setFiadoDownPaymentMethod('punto_debito')}
                                  className={`p-1.5 rounded-lg border text-center text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                                    fiadoDownPaymentMethod === 'punto_debito'
                                      ? 'bg-blue-50 border-blue-500 text-blue-900 font-black shadow-2xs ring-1 ring-blue-500'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Punto / Débito</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setFiadoDownPaymentMethod('pago_movil')}
                                  className={`p-1.5 rounded-lg border text-center text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                                    fiadoDownPaymentMethod === 'pago_movil'
                                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-black shadow-2xs ring-1 ring-emerald-500'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Pago Móvil</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setFiadoDownPaymentMethod('efectivo_usd')}
                                  className={`p-1.5 rounded-lg border text-center text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                                    fiadoDownPaymentMethod === 'efectivo_usd'
                                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-black shadow-2xs ring-1 ring-emerald-500'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Dólares ($)</span>
                                </button>
                              </div>

                              {(fiadoDownPaymentMethod === 'punto_debito' || fiadoDownPaymentMethod === 'pago_movil' || fiadoDownPaymentMethod === 'transferencia') && (
                                <div className="pt-1">
                                  <input
                                    type="text"
                                    required
                                    placeholder={
                                      fiadoDownPaymentMethod === 'pago_movil'
                                        ? 'Nº Referencia Pago Móvil (ej: 489210) *'
                                        : 'Nº Comprobante / Aprobación Punto (ej: 8294) *'
                                    }
                                    value={fiadoDownPaymentReference}
                                    onChange={(e) => setFiadoDownPaymentReference(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Summary pill */}
                          <div className="p-2.5 bg-purple-100/70 border border-purple-200 rounded-xl flex items-center justify-between text-xs">
                            <span className="text-purple-950 font-bold">
                              Saldo a registrar en la Libreta:
                            </span>
                            <div className="text-right">
                              <span className="text-sm font-black text-purple-950 block">
                                {paymentCurrency} {fiadoOwedNum.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-purple-800 font-bold">
                                {paymentCurrency === '$' ? formatBs(fiadoOwedNum * bcvRate) : formatUSD(bcvRate > 0 ? fiadoOwedNum / bcvRate : 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Full debt note */
                        <div className="p-2.5 bg-purple-100/70 border border-purple-200 rounded-xl flex items-center justify-between text-xs">
                          <span className="text-purple-950 font-bold">
                            Total a registrar en la Libreta:
                          </span>
                          <div className="text-right">
                            <span className="text-sm font-black text-purple-950 block">
                              {paymentCurrency} {targetTotal.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-purple-800 font-bold">
                              {paymentCurrency === '$' ? formatBs(targetTotal * bcvRate) : formatUSD(bcvRate > 0 ? targetTotal / bcvRate : 0)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Amount Delivered / Paga Con (Only if not fiado) */}
                  {paymentMethod !== 'fiado' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-slate-700">
                          Monto Recibido ({paymentCurrency})
                        </label>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          Exacto: {paymentCurrency} {targetTotal.toFixed(2)}
                        </span>
                      </div>

                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={amountPaidInput}
                        onChange={(e) => setAmountPaidInput(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />

                      {/* Quick bill shortcut pills */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setAmountPaidInput(targetTotal.toFixed(2))}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-extrabold cursor-pointer"
                        >
                          Exacto
                        </button>

                        {paymentCurrency === '$' ? (
                          [5, 10, 20, 50, 100].map((bill) => (
                            <button
                              key={bill}
                              type="button"
                              onClick={() => setAmountPaidInput(bill.toString())}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 rounded-lg text-[11px] font-extrabold cursor-pointer transition-colors"
                            >
                              ${bill}
                            </button>
                          ))
                        ) : (
                          [50, 100, 200, 500, 1000].map((bill) => (
                            <button
                              key={bill}
                              type="button"
                              onClick={() => setAmountPaidInput(bill.toString())}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 rounded-lg text-[11px] font-extrabold cursor-pointer transition-colors"
                            >
                              Bs.{bill}
                            </button>
                          ))
                        )}
                      </div>

                      {/* Change / Vuelto Box */}
                      <div className="bg-slate-100 p-3.5 rounded-2xl flex items-center justify-between">
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                          Vuelto / Cambio:
                        </span>
                        <div className="text-right">
                          {paymentCurrency === '$' ? (
                            <div>
                              <span className="text-base font-black text-emerald-800 block leading-tight">
                                {formatUSD(changeUSD)}
                              </span>
                              <span className="text-[11px] font-extrabold text-slate-500">
                                Equivalente: {formatBs(changeBs)}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-base font-black text-emerald-800 block leading-tight">
                                {formatBs(changeBs)}
                              </span>
                              {changeUSD > 0 && (
                                <span className="text-[11px] font-extrabold text-slate-500">
                                  Ref: {formatUSD(changeUSD)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* ================= MODALIDAD: PAGO MIXTO / COMBINADO ================= */
                <div className="space-y-4">
                  {/* Guidance Notice */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                    <p className="font-extrabold flex items-center space-x-1.5">
                      <Split className="w-3.5 h-3.5 text-amber-700" />
                      <span>Cobro Dividido / Múltiples Formas de Pago</span>
                    </p>
                    <p className="text-[11px] text-amber-800 leading-snug">
                      Permite pagar con <strong>débito y efectivo</strong>, con <strong>dos tarjetas diferentes</strong> en punto de venta, o combinar <strong>dólares en efectivo y pago móvil</strong>.
                    </p>
                  </div>

                  {/* List of Split Payment Rows */}
                  <div className="space-y-3">
                    {splits.map((split, idx) => {
                      const splitAmountNum = parseFloat(split.amount.replace(',', '.')) || 0;
                      const equivUSD = split.currency === '$' ? splitAmountNum : (bcvRate > 0 ? splitAmountNum / bcvRate : 0);
                      const equivBs = split.currency === '$' ? splitAmountNum * bcvRate : splitAmountNum;
                      const isDigital = split.method === 'punto_debito' || split.method === 'pago_movil' || split.method === 'transferencia';

                      return (
                        <div
                          key={split.id}
                          className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 shadow-2xs"
                        >
                          {/* Split Card Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <input
                                type="text"
                                value={split.note}
                                onChange={(e) => handleUpdateSplit(split.id, { note: e.target.value })}
                                placeholder={`Ej: Tarjeta #${idx + 1}, Efectivo`}
                                className="text-xs font-black text-slate-800 bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-600 focus:outline-none px-1 py-0.5"
                              />
                            </div>
                            {splits.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSplit(split.id)}
                                className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors cursor-pointer"
                                title="Eliminar este método de pago"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Method Selector Pills */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateSplit(split.id, { method: 'efectivo_bs', currency: 'Bs.' })}
                              className={`p-1.5 rounded-lg border text-center text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                                split.method === 'efectivo_bs'
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-extrabold shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <Banknote className="w-3 h-3 text-emerald-600" />
                              <span>Efectivo Bs.</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateSplit(split.id, { method: 'punto_debito', currency: 'Bs.' })}
                              className={`p-1.5 rounded-lg border text-center text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                                split.method === 'punto_debito'
                                  ? 'bg-blue-50 border-blue-500 text-blue-900 font-extrabold shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <CreditCard className="w-3 h-3 text-blue-600" />
                              <span>Punto / Débito</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateSplit(split.id, { method: 'pago_movil', currency: 'Bs.' })}
                              className={`p-1.5 rounded-lg border text-center text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                                split.method === 'pago_movil'
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-extrabold shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <Smartphone className="w-3 h-3 text-emerald-600" />
                              <span>Pago Móvil</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateSplit(split.id, { method: 'efectivo_usd', currency: '$' })}
                              className={`p-1.5 rounded-lg border text-center text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                                split.method === 'efectivo_usd'
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-extrabold shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <DollarSign className="w-3 h-3 text-emerald-600" />
                              <span>Efectivo ($)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateSplit(split.id, { method: 'fiado' })}
                              className={`p-1.5 rounded-lg border text-center text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                                split.method === 'fiado'
                                  ? 'bg-purple-50 border-purple-500 text-purple-900 font-extrabold shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <BookOpen className="w-3 h-3 text-purple-600" />
                              <span>Crédito</span>
                            </button>
                          </div>

                          {/* Amount Input & Currency */}
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              {/* Currency Selector */}
                              <div className="flex bg-white rounded-lg border border-slate-300 p-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSplit(split.id, { currency: 'Bs.' })}
                                  className={`px-2 py-1 rounded text-[10px] font-black transition-colors ${
                                    split.currency === 'Bs.' ? 'bg-slate-900 text-white' : 'text-slate-600'
                                  }`}
                                >
                                  Bs.
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSplit(split.id, { currency: '$' })}
                                  className={`px-2 py-1 rounded text-[10px] font-black transition-colors ${
                                    split.currency === '$' ? 'bg-emerald-700 text-white' : 'text-slate-600'
                                  }`}
                                >
                                  $ USD
                                </button>
                              </div>

                              {/* Amount input */}
                              <div className="relative flex-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  required
                                  placeholder="0.00"
                                  value={split.amount}
                                  onChange={(e) => handleUpdateSplit(split.id, { amount: e.target.value })}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                              </div>

                              {/* Fill Remaining Button */}
                              <button
                                type="button"
                                onClick={() => handleFillRemaining(split.id)}
                                className="px-2.5 py-1.5 bg-slate-200 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 rounded-xl text-[11px] font-extrabold cursor-pointer transition-colors shrink-0"
                                title="Calcular monto faltante para este método"
                              >
                                Llenar Restante
                              </button>
                            </div>

                            {/* Equivalent in other currency */}
                            <div className="flex justify-between items-center text-[10.5px] text-slate-500 px-1 font-semibold">
                              <span>
                                Equivale a:{' '}
                                <strong className="text-slate-700">
                                  {split.currency === '$' ? formatBs(equivBs) : formatUSD(equivUSD)}
                                </strong>
                              </span>
                            </div>
                          </div>

                          {/* Reference Input (Required if Punto, Pago Móvil or Transferencia) */}
                          {isDigital && (
                            <div className="pt-1">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-extrabold text-blue-950 flex items-center space-x-1">
                                  <Hash className="w-3 h-3 text-blue-600" />
                                  <span>Nº de Referencia / Aprobación</span>
                                  <span className="text-red-500 font-bold">*</span>
                                </label>
                                <span className="text-[10px] text-blue-600 font-bold">Obligatorio</span>
                              </div>
                              <input
                                type="text"
                                required
                                placeholder="Ej: 489210 o lote 012"
                                value={split.reference}
                                onChange={(e) => handleUpdateSplit(split.id, { reference: e.target.value })}
                                className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Another Payment Split Button */}
                  <button
                    type="button"
                    onClick={handleAddSplit}
                    className="w-full py-2.5 px-3 border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-900 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-600" />
                    <span>Agregar otra tarjeta o forma de pago</span>
                  </button>

                  {/* Live Split Balance Summary */}
                  <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>Total abonado con métodos combinados:</span>
                      <span className="font-black text-slate-900">
                        {formatBs(totalSplitsBs)} ({formatUSD(totalSplitsUSD)})
                      </span>
                    </div>

                    {!isSplitCovered ? (
                      <div className="p-2.5 bg-amber-100/90 border border-amber-300 rounded-xl flex items-center justify-between text-amber-950">
                        <span className="text-xs font-black flex items-center space-x-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>Falta por cubrir:</span>
                        </span>
                        <span className="text-sm font-black text-amber-900">
                          {formatBs(remainingSplitBs)} ({formatUSD(remainingSplitUSD)})
                        </span>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-emerald-950">
                          <span className="text-xs font-black flex items-center space-x-1.5">
                            <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span>Total de la venta cubierto</span>
                          </span>
                          {splitChangeBs > 0.05 && (
                            <span className="text-xs font-black text-emerald-900">
                              Vuelto: {formatBs(splitChangeBs)} ({formatUSD(splitChangeUSD)})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customer section in Checkout Modal */}
              {(() => {
                const isFiado = paymentMethod === 'fiado' && paymentMode === 'single';
                const isRealCustomerIdentified = isCustomerIdentified && customerName && customerName.trim() !== '' && customerName.trim().toLowerCase() !== 'cliente ocasional';

                return (
                  <div className={`rounded-2xl p-3.5 space-y-2.5 transition-all ${
                    isFiado 
                      ? 'bg-purple-50/80 border-2 border-purple-400/80 shadow-xs' 
                      : 'bg-slate-50 border border-slate-200'
                  }`}>
                    {/* Notice for Fiado */}
                    {isFiado && (
                      <div className="p-2.5 bg-purple-100 border border-purple-300 rounded-xl text-xs font-bold text-purple-950 flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-black block">Registro Obligatorio para Libreta de Créditos:</span>
                          <span className="text-[11px] font-medium text-purple-900">
                            Debe identificar al cliente con su <strong>Cédula / RIF</strong> y <strong>Nombre completo</strong> para vincular la cuenta por cobrar.
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
                        <UserCheck className={`w-3.5 h-3.5 ${isFiado ? 'text-purple-700' : 'text-emerald-600'}`} />
                        <span>Datos del Cliente</span>
                        {isFiado ? (
                          <span className="text-[10px] font-black bg-purple-200 text-purple-900 px-2 py-0.5 rounded-md">
                            * Obligatorio
                          </span>
                        ) : (
                          <span className="text-[10px] font-normal text-slate-400">
                            (Opcional)
                          </span>
                        )}
                      </label>

                      {/* Occasional button ONLY allowed if not fiado */}
                      {!isFiado && !isCustomerIdentified && (
                        <button
                          type="button"
                          onClick={handleSetOccasionalCustomer}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-black shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
                          title="Cobrar a cliente ocasional sin datos"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>Ocasional (Omitir)</span>
                        </button>
                      )}
                    </div>

                    {isRealCustomerIdentified && docNumber ? (
                      <div className="flex items-start justify-between bg-white px-3 py-2.5 rounded-xl border border-emerald-300 shadow-2xs">
                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-900 truncate flex items-center space-x-1.5">
                            <span>{customerName}</span>
                            <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                              Registrado
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-slate-500 truncate">
                            {docType}-{docNumber}
                            {customerPhone ? ` • ${customerPhone}` : ''}
                          </div>
                          {customerAddress && (
                            <div className="text-[10px] text-slate-500 truncate flex items-center space-x-1 mt-0.5">
                              <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              <span className="truncate">{customerAddress}</span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleClearCustomer}
                          className="text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 text-[11px] font-bold border border-slate-200 transition-colors cursor-pointer shrink-0 ml-1"
                        >
                          Cambiar
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* ID Doc Type & Number */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-extrabold text-slate-700">
                              Cédula de Identidad o RIF
                              {isFiado && <span className="text-red-600 font-black ml-1">*</span>}
                            </span>
                            {isFiado && (
                              <span className="text-[10px] text-purple-700 font-bold">
                                Requerido para Libreta
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={docType}
                              onChange={(e) => handleDocTypeChange(e.target.value as any)}
                              className="px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0"
                            >
                              <option value="V">V-</option>
                              <option value="E">E-</option>
                              <option value="J">J-</option>
                              <option value="G">G-</option>
                            </select>
                            <input
                              type="text"
                              inputMode="numeric"
                              required={isFiado}
                              placeholder={isFiado ? "Nº de Cédula (Ej: 18745290) *" : "Nº Cédula o RIF (ej: 18745290)..."}
                              value={docNumber}
                              onChange={(e) => handleDocNumberChange(e.target.value)}
                              className={`flex-1 px-3 py-2 bg-white border rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 ${
                                isFiado ? 'border-purple-300 focus:ring-purple-500' : 'border-slate-300 focus:ring-emerald-500'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Customer Name */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-extrabold text-slate-700">
                              Nombre y Apellido
                              {isFiado && <span className="text-red-600 font-black ml-1">*</span>}
                            </span>
                            {isFiado && (
                              <span className="text-[10px] text-purple-700 font-bold">
                                Requerido para Libreta
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            required={isFiado}
                            placeholder={isFiado ? "Nombre y Apellido del cliente a quien se le otorga el crédito *" : (isNewCustomer ? "Nombre del nuevo cliente *" : "Nombre del cliente (Opcional)")}
                            value={customerName === 'Cliente Ocasional' ? '' : customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className={`w-full px-3 py-2 bg-white border rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 ${
                              isFiado 
                                ? 'border-purple-300 focus:ring-purple-500' 
                                : isNewCustomer 
                                ? 'border-amber-400 ring-1 ring-amber-300' 
                                : 'border-slate-300 focus:ring-emerald-500'
                            }`}
                          />
                        </div>

                        {/* Phone & Address */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10.5px] font-bold text-slate-600 mb-1 block">
                              Teléfono / WhatsApp {isFiado && <span className="text-purple-700 font-normal">(Recomendado)</span>}
                            </span>
                            <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500">
                              <Phone className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                              <input
                                type="text"
                                placeholder="Ej: 0414-1234567"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                className="w-full text-xs sm:text-sm text-slate-900 bg-transparent focus:outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <span className="text-[10.5px] font-bold text-slate-600 mb-1 block">
                              Dirección de Habitación
                            </span>
                            <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                              <input
                                type="text"
                                placeholder="Ej: Calle 3, Casa #12"
                                value={customerAddress}
                                onChange={(e) => setCustomerAddress(e.target.value)}
                                className="w-full text-xs sm:text-sm text-slate-900 bg-transparent focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Optional receipt print hint */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                <span className="flex items-center gap-1.5 font-medium">
                  <Printer className="w-3.5 h-3.5 text-slate-400" />
                  <span>Comprobante:</span>
                  <strong className="text-slate-700">
                    {settings.receiptPrintMode === 'never'
                      ? 'Solo registrar (sin ticket)'
                      : settings.receiptPrintMode === 'always'
                      ? 'Impresión directa'
                      : 'Opcional (se consultará al confirmar)'}
                  </strong>
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  {settings.receiptPrintMode === 'never' ? 'Aviso en pantalla' : settings.receiptPrintMode === 'always' ? 'Ticket instantáneo' : '1 clic para imprimir o continuar'}
                </span>
              </div>

              {/* Action Buttons (Sticky at bottom for mobile convenience) */}
              <div className="pt-2 pb-1 flex items-center space-x-3 sticky bottom-0 bg-white/95 backdrop-blur-xs border-t border-slate-100 z-10">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="flex-1 py-3 px-3 sm:px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-2 py-3 px-3 sm:px-4 text-white rounded-xl text-xs sm:text-sm font-black shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    paymentMethod === 'fiado' && paymentMode === 'single'
                      ? 'bg-purple-700 hover:bg-purple-800 focus:ring-4 focus:ring-purple-200'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span className="truncate">
                    {paymentMethod === 'fiado' && paymentMode === 'single'
                      ? fiadoScope === 'specific' && fiadoDownPaymentNum > 0.009
                        ? `Confirmar Abono y Libreta`
                        : 'Confirmar en Libreta'
                      : 'Confirmar Cobro'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Weight & Scale Modal for Products Sold by Kilogram */}
      <WeightModal
        product={weighingProduct}
        initialWeight={weighingInitialWeight}
        isOpen={isWeightModalOpen}
        onClose={() => {
          setIsWeightModalOpen(false);
          setWeighingProduct(null);
        }}
        onConfirm={handleConfirmWeight}
      />
    </div>
  );
};
