import React, { useState, useEffect } from 'react';
import { Scale, X, Check, Calculator, RefreshCw } from 'lucide-react';
import { Product } from '../../types';
import { useStore } from '../../context/StoreContext';

interface WeightModalProps {
  product: Product | null;
  initialWeight?: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (weightKg: number) => void;
}

export const WeightModal: React.FC<WeightModalProps> = ({
  product,
  initialWeight = 1,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { bcvRate, formatBs, formatUSD, usdToBs } = useStore();

  const [weightStr, setWeightStr] = useState<string>('1');
  const [unitMode, setUnitMode] = useState<'kg' | 'g'>('kg');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && product) {
      const w = initialWeight > 0 ? initialWeight : 1;
      setWeightStr(w.toString());
      setUnitMode('kg');
      setError('');
    }
  }, [isOpen, product, initialWeight]);

  if (!isOpen || !product) return null;

  // Numerical value in KG
  const numericInput = parseFloat(weightStr) || 0;
  const currentWeightKg = unitMode === 'g' ? numericInput / 1000 : numericInput;

  // Price calculations
  const subtotalUSD = Math.round(currentWeightKg * product.salePriceUSD * 100) / 100;
  const subtotalBs = usdToBs(subtotalUSD);
  const pricePerKgBs = usdToBs(product.salePriceUSD);

  const handleKeypadPress = (val: string) => {
    setError('');
    if (val === 'C') {
      setWeightStr('');
      return;
    }
    if (val === 'BACK') {
      setWeightStr(prev => prev.slice(0, -1));
      return;
    }
    if (val === '.') {
      if (!weightStr.includes('.')) {
        setWeightStr(prev => (prev === '' ? '0.' : prev + '.'));
      }
      return;
    }
    // Append number
    if (weightStr === '0') {
      setWeightStr(val);
    } else {
      // Limit to 3 decimal places
      const parts = (weightStr + val).split('.');
      if (parts[1] && parts[1].length > 3) return;
      setWeightStr(prev => prev + val);
    }
  };

  const handlePreset = (kg: number) => {
    setError('');
    if (unitMode === 'g') {
      setWeightStr((kg * 1000).toString());
    } else {
      setWeightStr(kg.toString());
    }
  };

  const handleConfirm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (currentWeightKg <= 0) {
      setError('Ingrese un peso válido mayor a 0');
      return;
    }
    if (currentWeightKg > product.stock) {
      setError(`El peso (${currentWeightKg} kg) supera el stock disponible (${product.stock} kg)`);
      return;
    }
    onConfirm(Math.round(currentWeightKg * 1000) / 1000);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="weight-modal"
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Balanza / Peso
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Stock: {product.stock} kg
                </span>
              </div>
              <h3 className="text-base font-black text-white leading-tight mt-0.5">
                {product.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Price Reference Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Precio por Kilo ($ USD)</span>
              <span className="font-extrabold text-slate-800 text-sm">{formatUSD(product.salePriceUSD)} / kg</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Precio por Kilo (Bs.)</span>
              <span className="font-black text-emerald-700 text-sm">{formatBs(pricePerKgBs)} / kg</span>
            </div>
          </div>

          {/* Weight Input Display & Mode Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Peso Registrado en la Balanza:
              </label>
              <div className="inline-flex bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    if (unitMode === 'g') {
                      setUnitMode('kg');
                      setWeightStr((numericInput / 1000).toString());
                    }
                  }}
                  className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                    unitMode === 'kg' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Kilos (kg)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (unitMode === 'kg') {
                      setUnitMode('g');
                      setWeightStr(Math.round(numericInput * 1000).toString());
                    }
                  }}
                  className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                    unitMode === 'g' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Gramos (g)
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.001"
                autoFocus
                value={weightStr}
                onChange={(e) => {
                  setError('');
                  setWeightStr(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirm();
                  }
                }}
                placeholder="0.00"
                className="w-full text-center text-3xl font-black py-3 px-12 bg-emerald-50/50 border-2 border-emerald-400 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all tracking-wide"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-800">
                {unitMode}
              </span>
              {weightStr && (
                <button
                  type="button"
                  onClick={() => setWeightStr('')}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  title="Limpiar peso"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
            {unitMode === 'g' && (
              <p className="text-[11px] text-slate-500 text-center mt-1">
                Equivale a <strong className="text-slate-800">{currentWeightKg.toFixed(3)} kg</strong>
              </p>
            )}
          </div>

          {/* Quick Presets for common bodega weights */}
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Pesos Frecuentes / Rápidos:
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '¼ kg (0.25)', val: 0.25 },
                { label: '½ kg (0.50)', val: 0.5 },
                { label: '¾ kg (0.75)', val: 0.75 },
                { label: '1.0 kg', val: 1.0 },
                { label: '1.5 kg', val: 1.5 },
                { label: '2.0 kg', val: 2.0 },
                { label: '2.3 kg', val: 2.3 },
                { label: '3.0 kg', val: 3.0 },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => handlePreset(p.val)}
                  className="py-1.5 px-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer text-center"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Calculation Display Box */}
          <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50/70 border border-emerald-200 rounded-2xl space-y-1 text-center shadow-xs">
            <div className="text-[11px] text-emerald-800 font-semibold">
              Cálculo: <span className="font-bold">{currentWeightKg.toFixed(3)} kg</span> × {formatUSD(product.salePriceUSD)}/kg
            </div>
            <div className="flex items-center justify-center space-x-3 pt-0.5">
              <span className="text-2xl font-black text-emerald-900 leading-tight">
                {formatBs(subtotalBs)}
              </span>
              <span className="text-sm font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                Ref: {formatUSD(subtotalUSD)}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl text-center">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              id="confirm-weight-btn"
              onClick={() => handleConfirm()}
              disabled={currentWeightKg <= 0}
              className="py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Agregar {currentWeightKg > 0 ? `${currentWeightKg} kg` : ''}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
