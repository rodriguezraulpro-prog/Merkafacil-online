import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  AlertOctagon, 
  TrendingUp, 
  DollarSign, 
  Edit, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download, 
  X, 
  Check, 
  Barcode,
  Tags,
  AlertCircle
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Category, Product, UnitType, TaxType } from '../../types';

const UNITS: UnitType[] = ['unidad', 'kg', 'litro', 'paquete', 'lata', 'bolsa'];

export const InventoryView: React.FC = () => {
  const { 
    products, 
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    addProduct, 
    updateProduct, 
    deleteProduct, 
    restockProduct, 
    adjustStock, 
    bcvRate,
    formatBs,
    formatUSD,
    usdToBs,
    requestSupervisorAuth,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out' | 'ok'>('all');

  // Modals state
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  // Category Manager Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryFeedback, setCategoryFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryNameInput, setEditCategoryNameInput] = useState('');
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<string | null>(null);

  // Quick inline category add in product modal
  const [isAddingCategoryInline, setIsAddingCategoryInline] = useState(false);
  const [inlineCategoryInput, setInlineCategoryInput] = useState('');

  // Form states for New / Edit Product
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category: (categories[0] || 'Abarrotes') as Category,
    costPriceUSD: 0.90,
    salePriceUSD: 1.30,
    stock: 12,
    minStock: 5,
    unit: 'unidad' as UnitType,
    taxType: 'exento' as TaxType,
    description: '',
  });

  // Restock modal state
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restockReason, setRestockReason] = useState<string>('Reabastecimiento de proveedor');

  // Adjust stock modal state
  const [adjustNewStock, setAdjustNewStock] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Ajuste de inventario físico / merma');

  // Calculated Stats
  const totalProducts = products.length;
  const totalStockUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const totalCostUSD = products.reduce((sum, p) => sum + p.costPriceUSD * p.stock, 0);
  const totalCostBs = totalCostUSD * bcvRate;
  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= p.minStock);
  const outOfStockProducts = products.filter(p => p.stock <= 0);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q);
      const matchesCat = categoryFilter === 'Todas' || p.category === categoryFilter;

      let matchesStock = true;
      if (stockStatusFilter === 'low') matchesStock = p.stock > 0 && p.stock <= p.minStock;
      if (stockStatusFilter === 'out') matchesStock = p.stock <= 0;
      if (stockStatusFilter === 'ok') matchesStock = p.stock > p.minStock;

      return matchesSearch && matchesCat && matchesStock;
    });
  }, [products, searchQuery, categoryFilter, stockStatusFilter]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      name: '',
      barcode: `759${Math.floor(100000000 + Math.random() * 900000000)}`,
      category: 'Abarrotes',
      costPriceUSD: 1.00,
      salePriceUSD: 1.40,
      stock: 10,
      minStock: 5,
      unit: 'unidad',
      taxType: 'exento',
      description: '',
    });
    setIsNewProductOpen(true);
  };

  // Open Edit Modal with supervisor authorization
  const handleOpenEdit = (product: Product) => {
    requestSupervisorAuth({
      title: `Editar Producto: ${product.name}`,
      description: 'Se requiere clave de Administrador para modificar precios, costos, nombres o códigos en inventario.',
      actionType: 'editar_producto',
      onAuthorized: () => {
        setEditingProduct(product);
        setFormData({
          name: product.name,
          barcode: product.barcode,
          category: product.category,
          costPriceUSD: product.costPriceUSD,
          salePriceUSD: product.salePriceUSD,
          stock: product.stock,
          minStock: product.minStock,
          unit: product.unit,
          taxType: product.taxType || 'exento',
          description: product.description || '',
        });
      },
    });
  };

  // Delete product with supervisor authorization
  const handleDeleteProduct = (product: Product) => {
    requestSupervisorAuth({
      title: `Eliminar Producto: ${product.name}`,
      description: 'Esta acción eliminará de forma irreversible este producto del inventario.',
      actionType: 'eliminar_producto',
      onAuthorized: () => {
        deleteProduct(product.id);
      },
    });
  };

  // Adjust stock with supervisor authorization
  const handleOpenAdjust = (product: Product) => {
    requestSupervisorAuth({
      title: `Ajuste de Stock / Merma: ${product.name}`,
      description: 'Se requiere autorización de Administrador para registrar mermas o diferencias de conteo físico.',
      actionType: 'ajustar_stock',
      onAuthorized: () => {
        setAdjustingProduct(product);
        setAdjustNewStock(product.stock);
        setAdjustReason('Merma / Vencimiento / Conteo físico');
      },
    });
  };

  // Save Product (Create or Edit)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        name: formData.name.trim(),
        barcode: formData.barcode.trim(),
        category: formData.category,
        costPriceUSD: Number(formData.costPriceUSD),
        salePriceUSD: Number(formData.salePriceUSD),
        stock: Number(formData.stock),
        minStock: Number(formData.minStock),
        unit: formData.unit,
        taxType: formData.taxType || 'exento',
        description: formData.description.trim(),
      });
      setEditingProduct(null);
    } else {
      addProduct({
        name: formData.name.trim(),
        barcode: formData.barcode.trim() || `759${Date.now().toString().slice(-9)}`,
        category: formData.category,
        costPriceUSD: Number(formData.costPriceUSD),
        salePriceUSD: Number(formData.salePriceUSD),
        stock: Number(formData.stock),
        minStock: Number(formData.minStock),
        unit: formData.unit,
        taxType: formData.taxType || 'exento',
        description: formData.description.trim(),
      });
      setIsNewProductOpen(false);
    }
  };

  // Restock Submit
  const handleConfirmRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockingProduct || restockQty <= 0) return;
    restockProduct(restockingProduct.id, restockQty, restockReason);
    setRestockingProduct(null);
  };

  // Adjust Stock Submit
  const handleConfirmAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    adjustStock(adjustingProduct.id, adjustNewStock, adjustReason);
    setAdjustingProduct(null);
  };

  // Category Management Handlers
  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const res = addCategory(trimmed);
    if (!res.success) {
      setCategoryFeedback({ type: 'error', message: res.error || 'Error al agregar categoría.' });
    } else {
      setCategoryFeedback({ type: 'success', message: `¡Rubro "${trimmed}" agregado con éxito!` });
      setNewCategoryName('');
      setTimeout(() => setCategoryFeedback(null), 3500);
    }
  };

  const handleStartEditCategory = (cat: string) => {
    setEditingCategory(cat);
    setEditCategoryNameInput(cat);
    setConfirmDeleteCategory(null);
    setCategoryFeedback(null);
  };

  const handleSaveEditCategory = (oldName: string) => {
    const trimmed = editCategoryNameInput.trim();
    if (!trimmed) return;
    const res = updateCategory(oldName, trimmed);
    if (!res.success) {
      setCategoryFeedback({ type: 'error', message: res.error || 'Error al actualizar.' });
    } else {
      setCategoryFeedback({ type: 'success', message: `Rubro actualizado a "${trimmed}".` });
      setEditingCategory(null);
      setEditCategoryNameInput('');
      if (categoryFilter === oldName) {
        setCategoryFilter(trimmed);
      }
      setTimeout(() => setCategoryFeedback(null), 3500);
    }
  };

  const handleConfirmDelete = (cat: string) => {
    const res = deleteCategory(cat);
    if (res.success) {
      if (res.affectedProducts > 0) {
        setCategoryFeedback({
          type: 'success',
          message: `Rubro "${cat}" eliminado. ${res.affectedProducts} productos fueron reasignados a "Otros".`
        });
      } else {
        setCategoryFeedback({
          type: 'success',
          message: `Rubro "${cat}" eliminado correctamente.`
        });
      }
      setConfirmDeleteCategory(null);
      if (categoryFilter === cat) {
        setCategoryFilter('Todas');
      }
      setTimeout(() => setCategoryFeedback(null), 4000);
    }
  };

  const handleCreateInlineCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inlineCategoryInput.trim();
    if (!trimmed) return;
    const res = addCategory(trimmed);
    if (res.success || categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setFormData(prev => ({ ...prev, category: trimmed }));
      setInlineCategoryInput('');
      setIsAddingCategoryInline(false);
    } else {
      alert(res.error || 'Error al agregar rubro');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Código de Barras',
      'Producto',
      'Categoría',
      'Unidad',
      'Costo USD',
      'Precio Venta USD',
      'Precio Venta Bs (Tasa ' + bcvRate.toFixed(2) + ')',
      'Stock Actual',
      'Stock Mínimo',
      'Estado',
    ];

    const rows = products.map((p) => {
      const status = p.stock <= 0 ? 'Agotado' : p.stock <= p.minStock ? 'Bajo Stock' : 'Disponible';
      const saleBs = (p.salePriceUSD * bcvRate).toFixed(2);
      return [
        `"${p.id}"`,
        `"${p.barcode}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category}"`,
        `"${p.unit}"`,
        p.costPriceUSD.toFixed(2),
        p.salePriceUSD.toFixed(2),
        saleBs,
        p.stock,
        p.minStock,
        `"${status}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inventario_bodega_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Profit margin calculation helper
  const calculateMargin = (cost: number, sale: number) => {
    if (!sale || sale <= 0) return 0;
    return (((sale - cost) / sale) * 100).toFixed(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Package className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-black text-slate-900">Control de Inventario</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-manage-categories"
            onClick={() => {
              setIsCategoryModalOpen(true);
              setCategoryFeedback(null);
              setEditingCategory(null);
              setConfirmDeleteCategory(null);
            }}
            className="px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
            title="Administrar o agregar categorías y rubros"
          >
            <Tags className="w-3.5 h-3.5 text-emerald-600" />
            <span>Rubros ({categories.length})</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Exportar CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>

          <button
            id="btn-add-product"
            onClick={handleOpenCreate}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Artículos</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-2">{totalProducts}</p>
          <span className="text-[11px] text-slate-400 font-medium">{totalStockUnits} unidades físicas</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Inversión (Costo)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-slate-900 mt-2">{formatUSD(totalCostUSD)}</p>
          <span className="text-[11px] text-slate-500 font-bold">{formatBs(totalCostBs)}</span>
        </div>

        <div 
          onClick={() => setStockStatusFilter(stockStatusFilter === 'low' ? 'all' : 'low')}
          className={`bg-white p-4 rounded-2xl border shadow-2xs cursor-pointer transition-all ${
            stockStatusFilter === 'low' ? 'border-amber-500 ring-2 ring-amber-200' : 'border-slate-200 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Bajo Stock</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-800 mt-2">{lowStockProducts.length}</p>
          <span className="text-[11px] text-amber-700 font-semibold">Requieren reabastecer</span>
        </div>

        <div 
          onClick={() => setStockStatusFilter(stockStatusFilter === 'out' ? 'all' : 'out')}
          className={`bg-white p-4 rounded-2xl border shadow-2xs cursor-pointer transition-all ${
            stockStatusFilter === 'out' ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 hover:border-red-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Agotados</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-red-700 mt-2">{outOfStockProducts.length}</p>
          <span className="text-[11px] text-red-600 font-semibold">0 existencias</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o código de barras..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Categories and Status Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="Todas">Todas las Categorías ({products.length})</option>
            {categories.map((c) => {
              const count = products.filter(p => p.category === c).length;
              return (
                <option key={c} value={c}>{c} ({count})</option>
              );
            })}
          </select>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setStockStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                stockStatusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => setStockStatusFilter('low')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                stockStatusFilter === 'low' ? 'bg-white text-amber-800 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Bajo Stock ({lowStockProducts.length})
            </button>
            <button
              onClick={() => setStockStatusFilter('out')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                stockStatusFilter === 'out' ? 'bg-white text-red-700 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Agotados ({outOfStockProducts.length})
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Table Container (Responsive: Mobile Cards < md, Full Table >= md) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Mobile Cards List (< md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 p-4">
              <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-600">No se encontraron productos en el inventario</p>
            </div>
          ) : (
            filteredProducts.map((p) => {
              const isOutOfStock = p.stock <= 0;
              const isLowStock = p.stock > 0 && p.stock <= p.minStock;
              const saleBs = usdToBs(p.salePriceUSD);
              const margin = calculateMargin(p.costPriceUSD, p.salePriceUSD);

              return (
                <div key={`mob-${p.id}`} className="p-3.5 bg-white space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 text-sm leading-snug">{p.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Barcode className="w-3 h-3 text-slate-300" />
                          {p.barcode}
                        </span>
                        <span className="px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                          {p.category}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-black border ${
                          (p.taxType || 'exento') === 'gravado'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}>
                          {(p.taxType || 'exento') === 'gravado' ? '(G) 16% IVA' : '(E) Exento'}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ${
                        isOutOfStock
                          ? 'bg-red-100 text-red-700'
                          : isLowStock
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {isOutOfStock ? 'Agotado (0)' : `${p.stock} ${p.unit}s`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Precio Venta</span>
                      <span className="font-black text-emerald-800 text-sm">{formatBs(saleBs)}</span>
                      <span className="text-[10px] font-bold text-slate-500 ml-1">({formatUSD(p.salePriceUSD)})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Costo / Margen</span>
                      <span className="text-slate-700 font-bold">{formatUSD(p.costPriceUSD)}</span>
                      <span className="ml-1 text-[10px] font-extrabold text-emerald-600">+{margin}%</span>
                    </div>
                  </div>

                  {/* Quick Action Touch Targets (Optimized for Mobile Fingers) */}
                  <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                    <button
                      onClick={() => {
                        setRestockingProduct(p);
                        setRestockQty(10);
                        setRestockReason('Despacho de proveedor');
                      }}
                      className="py-2 px-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 border border-emerald-200 cursor-pointer active:scale-95 transition-all"
                      title="Registrar entrada de mercancía"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Entrada</span>
                    </button>
                    <button
                      onClick={() => handleOpenAdjust(p)}
                      className="py-2 px-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 border border-amber-200 cursor-pointer active:scale-95 transition-all"
                      title="Registrar merma o ajuste físico"
                    >
                      <ArrowDownRight className="w-3.5 h-3.5 text-amber-600" />
                      <span>Merma</span>
                    </button>
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="py-2 px-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 border border-slate-200 cursor-pointer active:scale-95 transition-all"
                      title="Editar producto"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p)}
                      className="py-2 px-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 border border-slate-200 cursor-pointer active:scale-95 transition-all"
                      title="Eliminar producto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Borrar</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Full Desktop Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4 text-right">Costo ($ / Bs)</th>
                <th className="py-3 px-4 text-right">Precio Venta (Bs / $)</th>
                <th className="py-3 px-4 text-center">Margen</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600">No se encontraron productos en el inventario</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOutOfStock = p.stock <= 0;
                  const isLowStock = p.stock > 0 && p.stock <= p.minStock;
                  const margin = calculateMargin(p.costPriceUSD, p.salePriceUSD);
                  const saleBs = usdToBs(p.salePriceUSD);
                  const costBs = usdToBs(p.costPriceUSD);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Product Name & Barcode */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">{p.name}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-black border ${
                            (p.taxType || 'exento') === 'gravado'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}>
                            {(p.taxType || 'exento') === 'gravado' ? '(G) 16%' : '(E)'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center space-x-1">
                          <Barcode className="w-3 h-3 text-slate-300" />
                          <span>{p.barcode}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          {p.category}
                        </span>
                      </td>

                      {/* Cost USD & Bs */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-medium">
                        <span className="font-bold text-slate-800">{formatUSD(p.costPriceUSD)}</span>
                        <span className="block text-[10px] text-slate-400">{formatBs(costBs)}</span>
                      </td>

                      {/* Sale Price Bs & USD */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="font-extrabold text-emerald-800 text-xs sm:text-sm block">
                          {formatBs(saleBs)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          Ref: {formatUSD(p.salePriceUSD)}
                        </span>
                      </td>

                      {/* Margin % */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-extrabold text-[11px]">
                          +{margin}%
                        </span>
                      </td>

                      {/* Stock with Badge */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-black ${
                            isOutOfStock
                              ? 'bg-red-100 text-red-700'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {isOutOfStock ? (
                            <span>Agotado (0)</span>
                          ) : (
                            <span>{p.stock} {p.unit}</span>
                          )}
                        </span>
                        {isLowStock && (
                          <span className="block text-[10px] text-amber-700 font-bold mt-0.5">
                            Mínimo: {p.minStock}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          {/* Reabastecer */}
                          <button
                            onClick={() => {
                              setRestockingProduct(p);
                              setRestockQty(10);
                              setRestockReason('Despacho de proveedor');
                            }}
                            title="Reabastecer stock (+ Entrada)"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>

                          {/* Ajuste / Merma */}
                          <button
                            onClick={() => handleOpenAdjust(p)}
                            title="Ajustar stock / Registrar merma"
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Editar datos del producto"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Eliminar */}
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            title="Eliminar producto"
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: NUEVO / EDITAR PRODUCTO ================= */}
      {(isNewProductOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {editingProduct ? 'Editar Producto' : 'Registrar Nuevo Producto'}
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Tasa BCV del día: <strong className="text-emerald-700">Bs. {bcvRate.toFixed(2)}</strong> / $1 USD
                </p>
              </div>
              <button
                onClick={() => {
                  setIsNewProductOpen(false);
                  setEditingProduct(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4">
              
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Harina P.A.N. Blanca 1 kg"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Barcode & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código de Barras
                  </label>
                  <input
                    type="text"
                    placeholder="Escanear o autogenerado"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Categoría / Rubro *
                    </label>
                    {!isAddingCategoryInline ? (
                      <button
                        type="button"
                        onClick={() => setIsAddingCategoryInline(true)}
                        className="text-[11px] font-extrabold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Nuevo rubro</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingCategoryInline(false)}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>

                  {!isAddingCategoryInline ? (
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Nombre de la categoría"
                        value={inlineCategoryInput}
                        onChange={(e) => setInlineCategoryInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white border border-emerald-400 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateInlineCategory(e);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleCreateInlineCategory}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
                      >
                        Crear
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Cost and Sale Price in USD & Equivalent in Bs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Costo Compra ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.costPriceUSD}
                    onChange={(e) => setFormData({ ...formData, costPriceUSD: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                    Equivalente: {formatBs(formData.costPriceUSD * bcvRate)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-emerald-800 mb-1">
                    Precio Venta ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.salePriceUSD}
                    onChange={(e) => setFormData({ ...formData, salePriceUSD: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-xl text-xs sm:text-sm font-black text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <span className="text-[10px] text-emerald-700 font-extrabold block mt-1">
                    En mostrador: {formatBs(formData.salePriceUSD * bcvRate)}
                  </span>
                </div>

                <div className="col-span-full pt-1 flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Margen de Ganancia:</span>
                  <span className="text-emerald-700 font-extrabold bg-emerald-100 px-2 py-0.5 rounded-md text-[11px]">
                    +{calculateMargin(formData.costPriceUSD, formData.salePriceUSD)}%
                  </span>
                </div>
              </div>

              {/* Stock, Min Stock, Unit */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Stock Actual
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mínimo Alerta
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unidad
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as UnitType })}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tratamiento Fiscal IVA (SENIAT): Exento vs Gravado */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-slate-800">
                    Tratamiento Fiscal (IVA) *
                  </label>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                    Normativa SENIAT
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, taxType: 'exento' })}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer ${
                      (formData.taxType || 'exento') === 'exento'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="font-black text-sm">(E)</span>
                      <span className="font-bold">Exento de IVA</span>
                    </div>
                    <span className={`text-[10px] ${
                      (formData.taxType || 'exento') === 'exento' ? 'text-emerald-100' : 'text-slate-400'
                    }`}>
                      Alimentos básicos, medicina
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, taxType: 'gravado' })}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer ${
                      formData.taxType === 'gravado'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="font-black text-sm">(G)</span>
                      <span className="font-bold">Gravado 16% IVA</span>
                    </div>
                    <span className={`text-[10px] ${
                      formData.taxType === 'gravado' ? 'text-amber-100' : 'text-slate-400'
                    }`}>
                      Alícuota general con IVA
                    </span>
                  </button>
                </div>

                <p className="text-[10.5px] text-slate-500 leading-tight">
                  {formData.taxType === 'gravado'
                    ? 'Este producto saldrá en el ticket con la marca (G). Su precio incluye el 16% de IVA y se desglosará su Base Imponible.'
                    : 'Este producto saldrá en el ticket con la marca (E). No genera débito fiscal ni retención de IVA.'}
                </p>
              </div>

              {/* Buttons */}
              <div className="pt-3 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewProductOpen(false);
                    setEditingProduct(null);
                  }}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-sm transition-colors cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingProduct ? 'Guardar Cambios' : 'Crear Producto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: REABASTECER (+ ENTRADA) ================= */}
      {restockingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center space-x-1.5">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  <span>Reabastecer Mercadería</span>
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">{restockingProduct.name}</p>
              </div>
              <button
                onClick={() => setRestockingProduct(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRestock} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cantidad a Ingresar ({restockingProduct.unit}) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                  Stock actual: {restockingProduct.stock} ➔ Nuevo stock: <strong>{restockingProduct.stock + restockQty}</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo / Proveedor
                </label>
                <input
                  type="text"
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  placeholder="Ej: Despacho Empresas Polar, Compra Mayorista"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setRestockingProduct(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-extrabold"
                >
                  Confirmar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: AJUSTE / MERMA ================= */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center space-x-1.5">
                  <ArrowDownRight className="w-4 h-4 text-amber-600" />
                  <span>Ajuste de Stock o Merma</span>
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">{adjustingProduct.name}</p>
              </div>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAdjust} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nuevo Stock Físico ({adjustingProduct.unit}) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustNewStock}
                  onChange={(e) => setAdjustNewStock(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                  Diferencia:{' '}
                  <strong className={adjustNewStock - adjustingProduct.stock < 0 ? 'text-red-600' : 'text-emerald-700'}>
                    {adjustNewStock - adjustingProduct.stock > 0 ? `+${adjustNewStock - adjustingProduct.stock}` : adjustNewStock - adjustingProduct.stock} unidades
                  </strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo de la corrección o merma *
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ej: Producto vencido, rotura de empaque, conteo físico"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold"
                >
                  Guardar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: GESTIÓN DE RUBROS / CATEGORÍAS ================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                  <Tags className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Rubros y Categorías
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Crea, renombra o elimina categorías según los rubros de tu bodega
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCategory(null);
                  setConfirmDeleteCategory(null);
                  setCategoryFeedback(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification alert */}
            {categoryFeedback && (
              <div className={`px-5 py-2.5 text-xs font-bold flex items-center space-x-2 shrink-0 ${
                categoryFeedback.type === 'error' 
                  ? 'bg-red-50 text-red-700 border-b border-red-200' 
                  : 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
              }`}>
                {categoryFeedback.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <Check className="w-4 h-4 shrink-0" />
                )}
                <span>{categoryFeedback.message}</span>
              </div>
            )}

            {/* Form Add New Category */}
            <form onSubmit={handleAddCategorySubmit} className="p-4 bg-emerald-50/50 border-b border-emerald-100 flex gap-2 shrink-0">
              <input
                type="text"
                placeholder="Nombre del nuevo rubro (ej: Charcutería, Carnicería, Licores...)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar</span>
              </button>
            </form>

            {/* List of Categories */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1">
                <span>Rubros activos ({categories.length})</span>
                <span>Artículos en inventario</span>
              </div>

              {categories.map((cat) => {
                const productCount = products.filter(p => p.category === cat).length;
                const isEditing = editingCategory === cat;
                const isConfirmingDelete = confirmDeleteCategory === cat;

                return (
                  <div 
                    key={cat}
                    className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:border-slate-300 transition-all space-y-2"
                  >
                    {!isEditing ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="text-xs font-black text-slate-900 truncate">
                            {cat}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                            {productCount} {productCount === 1 ? 'producto' : 'productos'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditCategory(cat)}
                            title="Editar nombre del rubro"
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteCategory(cat);
                              setEditingCategory(null);
                              setCategoryFeedback(null);
                            }}
                            title="Eliminar categoría"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Inline Edit Form */
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          autoFocus
                          value={editCategoryNameInput}
                          onChange={(e) => setEditCategoryNameInput(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-emerald-400 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEditCategory(cat);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditCategory(cat)}
                          title="Guardar cambio"
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategory(null)}
                          title="Cancelar"
                          className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Delete Confirmation Alert */}
                    {isConfirmingDelete && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs space-y-2 animate-in fade-in">
                        <div className="flex items-start space-x-2 text-red-950">
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-extrabold">¿Deseas eliminar el rubro "{cat}"?</p>
                            {productCount > 0 ? (
                              <p className="text-[11px] text-red-800 mt-0.5 leading-relaxed">
                                Hay <strong>{productCount} producto(s)</strong> registrados bajo este rubro. Si la bodega deja de venderlo o lo eliminas, los productos se moverán automáticamente a la categoría <strong>"Otros"</strong> para proteger el historial de ventas y stock.
                              </p>
                            ) : (
                              <p className="text-[11px] text-red-700 mt-0.5">
                                Este rubro no tiene productos asociados actualmente y se removerá de tu lista.
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-end space-x-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteCategory(null)}
                            className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmDelete(cat)}
                            className="px-3 py-1 text-xs font-black bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer shadow-xs"
                          >
                            Sí, Eliminar Rubro
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-medium shrink-0">
              <span className="text-[11px]">Los cambios actualizan el catálogo del Punto de Venta en tiempo real.</span>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer transition-colors"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
