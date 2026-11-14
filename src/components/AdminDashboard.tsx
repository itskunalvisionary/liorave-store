import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Coins,
  Database,
  ExternalLink,
  FileText,
  FolderOpen,
  Gift,
  Image as ImageIcon,
  LayoutDashboard,
  Lock,
  Navigation,
  Package,
  Pencil,
  Plus,
  Ruler,
  ShoppingBag,
  Sun,
  Tag,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  CategoryItem,
  CurrencyCode,
  HeaderNavOption,
  NavSubOption,
  OrderRecord,
  ProductItem,
  ShowcaseStageItem,
  SiteContent,
} from '../types/store';
import { SHOWCASE_STAGES } from '../lib/icons';

type AdminTab =
  | 'overview'
  | 'products'
  | 'categories'
  | 'orders'
  | 'customers'
  | 'coupons'
  | 'currency'
  | 'header-cms'
  | 'photos-cms'
  | 'policies-cms'
  | 'gift-wrap-cms'
  | 'size-guide-cms'
  | 'festival-cms';

interface AnalyticsData {
  totalRevenueCents: number;
  collectedRevenueCents: number;
  pendingCodCents: number;
  totalOrders: number;
  paidOrdersCount: number;
  ordersByStatus: {
    confirmed: number;
    packed: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  totalCustomers: number;
  totalAdmins: number;
  totalProducts: number;
  activeProductsCount: number;
  lowStockCount: number;
  lowStockVariants: {
    id: number;
    sku: string;
    finishName: string;
    sizeLabel: string;
    stockQty: number;
    product?: { name: string };
  }[];
  topProducts: {
    id: number;
    name: string;
    slug: string;
    categoryName: string;
    basePriceCents: number;
    isActive: boolean;
    totalStock: number;
    unitsSold: number;
    revenueCents: number;
  }[];
  recentOrders: OrderRecord[];
  newsletterCount: number;
  recentDispatches: {
    id: number;
    email: string;
    createdAt: string;
  }[];
  contactCount: number;
  recentContacts: {
    id: number;
    name: string;
    email: string;
    message: string;
    status: string;
    createdAt: string;
  }[];
}

interface CustomerRow {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: string;
  ordersCount: number;
  createdAt: string;
}

interface CouponRow {
  id: number;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderCents: number;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
}

const ROUTE_CHOICES = [
  { label: 'Home (/)', value: '/' },
  { label: 'Shop (/shop)', value: '/shop' },
  { label: 'Collections (/collections)', value: '/collections' },
  { label: 'Track Order (/track-order)', value: '/track-order' },
  { label: 'Contact (/contact)', value: '/contact' },
  { label: 'Privacy Policy (/privacy)', value: '/privacy' },
  { label: 'Terms & Warranty (/terms)', value: '/terms' },
];

function ChooseFileUploader({
  label,
  currentImage,
  onUploadFile,
  uploading,
  onClear,
}: {
  label: string;
  currentImage?: string | null;
  onUploadFile: (file: File) => Promise<void>;
  uploading?: boolean;
  onClear?: () => void;
}) {
  return (
    <div>
      <label className="mf-mono" style={{ display: 'block', marginBottom: '6px', color: '#9ca4a0' }}>
        {label}
      </label>
      <div className="sb-upload-box">
        {currentImage ? (
          <img
            src={currentImage}
            alt="Uploaded preview"
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '6px',
              objectFit: 'cover',
              border: '1px solid rgba(255,255,255,0.16)',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '6px',
              background: '#161918',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6d7672',
              flexShrink: 0,
            }}
          >
            <ImageIcon size={22} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: '170px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <label className="sb-btn sb-btn-outline" style={{ cursor: 'pointer' }}>
              <Upload size={14} />
              <span>{uploading ? 'Uploading...' : 'Choose File'}</span>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    await onUploadFile(file);
                    e.target.value = '';
                  }
                }}
              />
            </label>
            {currentImage && onClear && (
              <button type="button" className="sb-btn sb-btn-danger" onClick={onClear}>
                Remove
              </button>
            )}
          </div>
          <div className="mf-mono" style={{ marginTop: '6px', fontSize: '0.66rem', color: '#7d8682' }}>
            {currentImage ? 'Image file selected' : 'PNG, JPG or WEBP up to 8 MB'}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const {
    user,
    authLoading,
    apiFetch,
    loginAdmin,
    logout,
    navigate,
    currency,
    setCurrency,
    formatPrice,
    refreshCatalog,
    refreshSiteContent,
    siteContent,
    subscribeRealtime,
    showToast,
  } = useStore();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [adminProducts, setAdminProducts] = useState<ProductItem[]>([]);
  const [adminCategories, setAdminCategories] = useState<CategoryItem[]>([]);
  const [adminOrders, setAdminOrders] = useState<OrderRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Admin Sign-In Gate
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Product Form State (with USD / INR input mode & file upload)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pName, setPName] = useState('');
  const [pCat, setPCat] = useState('Insulated Flasks');
  const [pInputCurrency, setPInputCurrency] = useState<CurrencyCode>('INR');
  const [pPrice, setPPrice] = useState('4032');
  const [pMrp, setPMrp] = useState('');
  const [pStock, setPStock] = useState('15');
  const [pTag, setPTag] = useState('');
  const [pFinishes, setPFinishes] = useState('Alpine Sage, Basalt Black, Glacier Silver');
  const [pSizes, setPSizes] = useState('750 ml, 950 ml, 1.2 L');
  const [pDesc, setPDesc] = useState('');
  const [pImageUrl, setPImageUrl] = useState(SHOWCASE_STAGES[0].src);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  // Category Form State
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catImageUrl, setCatImageUrl] = useState('');

  // Coupon Form State
  const [cCode, setCCode] = useState('');
  const [cType, setCType] = useState<'percent' | 'fixed'>('percent');
  const [cInputCurrency, setCInputCurrency] = useState<CurrencyCode>('INR');
  const [cValue, setCValue] = useState('15');
  const [cMin, setCMin] = useState('3360');

  // CMS State (protected against background WS refreshes while editing)
  const [cms, setCms] = useState<SiteContent>(siteContent);
  const [gwInputCurrency, setGwInputCurrency] = useState<CurrencyCode>('INR');
  const cmsDirtyRef = useRef(false);
  const hasConnectedOnceRef = useRef(false);

  const setCmsDraft = useCallback(
    (updater: SiteContent | ((prev: SiteContent) => SiteContent)) => {
      cmsDirtyRef.current = true;
      setCms(updater);
    },
    []
  );

  useEffect(() => {
    if (!cmsDirtyRef.current) {
      setCms(siteContent);
    }
  }, [siteContent]);

  const loadAllAdmin = useCallback(
    async (silent = false) => {
      if (!user || user.role !== 'admin') return;
      if (!silent) setLoading(true);
      try {
        const [an, prods, cats, ords, custs, coups] = await Promise.all([
          apiFetch<AnalyticsData>('/api/admin/analytics'),
          apiFetch<ProductItem[]>('/api/admin/products'),
          apiFetch<CategoryItem[]>('/api/categories'),
          apiFetch<OrderRecord[]>('/api/admin/orders'),
          apiFetch<CustomerRow[]>('/api/admin/customers'),
          apiFetch<CouponRow[]>('/api/admin/coupons'),
        ]);
        setAnalytics(an);
        setAdminProducts(prods);
        setAdminCategories(cats);
        setAdminOrders(ords);
        setCustomers(custs);
        setCoupons(coups);
      } catch (err: any) {
        if (!silent) {
          showToast(err.message || 'Could not load admin workspace');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user, apiFetch, showToast]
  );

  useEffect(() => {
    loadAllAdmin();
  }, [loadAllAdmin]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    return subscribeRealtime((ev) => {
      if (ev.type === 'connected') {
        if (hasConnectedOnceRef.current) {
          void loadAllAdmin(true);
        } else {
          hasConnectedOnceRef.current = true;
        }
        return;
      }
      if (ev.type === 'orders:updated') {
        void loadAllAdmin(true);
        if (ev.action === 'created' && ev.orderNumber) {
          showToast(`New order ${ev.orderNumber} received`);
        }
        return;
      }
      if (
        ev.type === 'catalog:updated' ||
        ev.type === 'coupons:updated' ||
        ev.type === 'cms:updated' ||
        ev.type === 'leads:updated'
      ) {
        void loadAllAdmin(true);
      }
    });
  }, [user, subscribeRealtime, loadAllAdmin, showToast]);

  const uploadImageFile = async (
    key: string,
    file: File,
    onDone: (url: string) => void
  ) => {
    setUploadingKey(key);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiFetch<{ url: string }>('/api/admin/upload', {
        method: 'POST',
        body: fd,
      });
      onDone(res.url);
      showToast('Image file uploaded');
    } catch (err: any) {
      showToast(err.message || 'Image upload failed');
    } finally {
      setUploadingKey(null);
    }
  };

  if (authLoading) {
    return (
      <div className="sb-gate">
        <span className="mf-mono" style={{ color: '#3ecf8e' }}>
          Connecting to LIORAVÉ Admin Studio...
        </span>
      </div>
    );
  }

  // Strictly Admin-only access gate (.env email + password only, no Google)
  if (!user || user.role !== 'admin') {
    return (
      <div className="sb-gate">
        <div className="sb-card" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Lock size={18} /> Admin Login
          </h1>

          {loginError && (
            <div
              style={{
                marginBottom: '14px',
                padding: '10px 12px',
                borderRadius: '7px',
                border: '1px solid rgba(229,83,75,0.45)',
                color: '#ff938b',
                fontSize: '0.84rem',
              }}
            >
              {loginError}
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoginError('');
              try {
                const u = await loginAdmin(loginEmail, loginPass);
                if (u.role !== 'admin') {
                  setLoginError('Invalid credentials');
                }
              } catch (err: any) {
                setLoginError(err.message || 'Sign-in failed');
              }
            }}
          >
            <div className="mf-field">
              <label style={{ color: '#9ca4a0' }}>Email</label>
              <input
                type="email"
                className="sb-input"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div className="mf-field">
              <label style={{ color: '#9ca4a0' }}>Password</label>
              <input
                type="password"
                className="sb-input"
                required
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="sb-btn sb-btn-emerald"
              style={{ width: '100%', marginTop: '18px' }}
            >
              Sign In
            </button>
          </form>

          <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
            <button
              type="button"
              style={{ color: '#9aa4a0', textDecoration: 'underline' }}
              onClick={() => navigate('/')}
            >
              &larr; Return to Storefront
            </button>
            {user && (
              <button
                type="button"
                style={{ color: '#ff938b', textDecoration: 'underline' }}
                onClick={() => logout()}
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const inrRate = Number(cms.inrRate) || 84;

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: pName.trim(),
      categoryName: pCat,
      price: Number(pPrice),
      mrp: pMrp.trim() ? Number(pMrp) : null,
      currency: pInputCurrency,
      stock: Number(pStock),
      tag: pTag.trim() || null,
      materials: pFinishes.split(',').map((s) => s.trim()).filter(Boolean),
      sizes: pSizes.split(',').map((s) => s.trim()).filter(Boolean),
      description: pDesc.trim(),
      imageUrl: pImageUrl,
    };
    try {
      if (editingId) {
        await apiFetch(`/api/admin/products/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToast('Product updated in PostgreSQL');
      } else {
        await apiFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('Product created in PostgreSQL');
      }
      setEditingId(null);
      setPName('');
      setPPrice(pInputCurrency === 'INR' ? String(Math.round(48 * inrRate)) : '48');
      setPMrp('');
      setPDesc('');
      await Promise.all([loadAllAdmin(), refreshCatalog()]);
    } catch (err: any) {
      showToast(err.message || 'Failed to save product');
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCatId) {
        await apiFetch(`/api/admin/categories/${editingCatId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: catName.trim(),
            description: catDesc.trim(),
            imageUrl: catImageUrl,
          }),
        });
        showToast('Category updated');
      } else {
        await apiFetch('/api/admin/categories', {
          method: 'POST',
          body: JSON.stringify({
            name: catName.trim(),
            description: catDesc.trim(),
            imageUrl: catImageUrl,
          }),
        });
        showToast('Category added');
      }
      setEditingCatId(null);
      setCatName('');
      setCatDesc('');
      setCatImageUrl('');
      await Promise.all([loadAllAdmin(), refreshCatalog()]);
    } catch (err: any) {
      showToast(err.message || 'Category save failed');
    }
  };

  const saveCmsPayload = async (nextCms: SiteContent, successMsg: string) => {
    try {
      const saved = await apiFetch<SiteContent>('/api/admin/site-content', {
        method: 'PUT',
        body: JSON.stringify(nextCms),
      });
      cmsDirtyRef.current = false;
      setCms(saved);
      setCurrency(saved.currency);
      await refreshSiteContent();
      showToast(successMsg);
    } catch (err: any) {
      showToast(err.message || 'Could not save homepage settings');
    }
  };

  // Header nav helpers (Single & Dropdown Sub-Options)
  const addHeaderItem = () => {
    const newItem: HeaderNavOption = {
      id: `nav-${Date.now().toString(36)}`,
      label: 'New Link',
      type: 'single',
      route: '/shop',
      subOptions: [],
    };
    setCmsDraft((prev) => ({
      ...prev,
      headerNav: [...(prev.headerNav || []), newItem],
    }));
  };

  const moveHeaderItem = (idx: number, dir: -1 | 1) => {
    const next = [...(cms.headerNav || [])];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setCmsDraft((prev) => ({ ...prev, headerNav: next }));
  };

  const updateHeaderItem = (idx: number, patch: Partial<HeaderNavOption>) => {
    setCmsDraft((prev) => {
      const next = [...(prev.headerNav || [])];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, headerNav: next };
    });
  };

  const removeHeaderItem = (idx: number) => {
    setCmsDraft((prev) => ({
      ...prev,
      headerNav: (prev.headerNav || []).filter((_, i) => i !== idx),
    }));
  };

  const addSubOption = (navIdx: number) => {
    const sub: NavSubOption = {
      id: `sub-${Date.now().toString(36)}`,
      label: 'Sub Option',
      route: '/shop',
      categoryFilter: '',
    };
    setCmsDraft((prev) => {
      const next = [...(prev.headerNav || [])];
      next[navIdx] = {
        ...next[navIdx],
        type: 'dropdown',
        subOptions: [...(next[navIdx].subOptions || []), sub],
      };
      return { ...prev, headerNav: next };
    });
  };

  const updateSubOption = (
    navIdx: number,
    subIdx: number,
    patch: Partial<NavSubOption>
  ) => {
    setCmsDraft((prev) => {
      const next = [...(prev.headerNav || [])];
      const subs = [...(next[navIdx].subOptions || [])];
      subs[subIdx] = { ...subs[subIdx], ...patch };
      next[navIdx] = { ...next[navIdx], subOptions: subs };
      return { ...prev, headerNav: next };
    });
  };

  const removeSubOption = (navIdx: number, subIdx: number) => {
    setCmsDraft((prev) => {
      const next = [...(prev.headerNav || [])];
      next[navIdx] = {
        ...next[navIdx],
        subOptions: (next[navIdx].subOptions || []).filter((_, i) => i !== subIdx),
      };
      return { ...prev, headerNav: next };
    });
  };

  const updateStage = (idx: number, patch: Partial<ShowcaseStageItem>) => {
    setCmsDraft((prev) => {
      const stages = [...(prev.showcaseStages || SHOWCASE_STAGES)];
      stages[idx] = { ...stages[idx], ...patch };
      return { ...prev, showcaseStages: stages };
    });
  };

  return (
    <div className="sb-shell">
      {/* SUPABASE-STYLE SIDEBAR */}
      <aside className="sb-sidebar">
        <div className="sb-project-pill">
          <div className="sb-status-dot" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
              LIORAVÉ
            </div>
            <div className="mf-mono" style={{ fontSize: '0.64rem', color: '#7d8682' }}>
              studio · cloud-sql
            </div>
          </div>
        </div>

        <div>
          <div className="sb-nav-group-label">Monitor</div>
          <button
            type="button"
            className={`sb-nav-item ${tab === 'overview' ? 'active' : ''}`}
            onClick={() => setTab('overview')}
          >
            <LayoutDashboard size={16} /> Overview
          </button>
        </div>

        <div>
          <div className="sb-nav-group-label">Table Editor</div>
          <button
            type="button"
            className={`sb-nav-item ${tab === 'products' ? 'active' : ''}`}
            onClick={() => setTab('products')}
          >
            <Package size={16} /> Products &amp; Pricing
          </button>
          <button
            type="button"
            className={`sb-nav-item ${tab === 'categories' ? 'active' : ''}`}
            onClick={() => setTab('categories')}
          >
            <FolderOpen size={16} /> Categories
          </button>
          <button
            type="button"
            className={`sb-nav-item ${tab === 'orders' ? 'active' : ''}`}
            onClick={() => setTab('orders')}
          >
            <ShoppingBag size={16} /> Orders (COD)
          </button>
          <button
            type="button"
            className={`sb-nav-item ${tab === 'customers' ? 'active' : ''}`}
            onClick={() => setTab('customers')}
          >
            <Users size={16} /> Customers
          </button>
          <button
            type="button"
            className={`sb-nav-item ${tab === 'coupons' ? 'active' : ''}`}
            onClick={() => setTab('coupons')}
          >
            <Tag size={16} /> Coupons
          </button>
        </div>

        <div>
          <div className="sb-nav-group-label">Homepage Content CMS</div>
          <button
            type="button"
            className={`sb-nav-item ${tab === 'currency' ? 'active' : ''}`}
            onClick={() => setTab('currency')}
          >
            <Coins size={16} /> Currency ($, ₹)
          </button>
          <button
            type="button"
            className={`sb-nav-item ${tab === 'header-cms' ? 'active' : ''}`}
            onClick={() => setTab('header-cms')}
          >
            <Navigation size={16} /> Header Options
          </button>
          <button
            type="button"
            className={`sb-nav-item ${tab === 'photos-cms' ? 'active' : ''}`}
            onClick={() => setTab('photos-cms')}
          >
            <ImageIcon size={16} /> Hero &amp; Page Photos
          </button>
          <button
            type="button"
            className={`sb-nav-item ${tab === 'policies-cms' ? 'active' : ''}`}
            onClick={() => setTab('policies-cms')}
          >
            <FileText size={16} /> Policies
          </button>
          <button
            type="button"
            className={`sb-nav-item ${tab === 'gift-wrap-cms' ? 'active' : ''}`}
            onClick={() => setTab('gift-wrap-cms')}
          >
            <Gift size={16} /> Gift Wrap
          </button>
          <button
            type="button"
            className={`sb-nav-item ${tab === 'size-guide-cms' ? 'active' : ''}`}
            onClick={() => setTab('size-guide-cms')}
          >
            <Ruler size={16} /> Size Guide
          </button>
          <button
            type="button"
            className={`sb-nav-item ${tab === 'festival-cms' ? 'active' : ''}`}
            onClick={() => setTab('festival-cms')}
          >
            <Sun size={16} /> Festival Banner
          </button>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="mf-mono" style={{ fontSize: '0.65rem', color: '#7d8682', marginBottom: '8px' }}>
            {user.email}
          </div>
          <button
            type="button"
            className="sb-btn sb-btn-outline"
            style={{ width: '100%' }}
            onClick={() => logout()}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN STUDIO WORKBENCH */}
      <div className="sb-main">
        <header className="sb-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={16} style={{ color: '#3ecf8e' }} />
            <span style={{ fontWeight: 600, fontSize: '0.94rem' }}>
              Admin Control Studio
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="mf-currency-toggle" style={{ background: '#1c201e', borderColor: 'rgba(255,255,255,0.16)' }}>
              <button
                type="button"
                className={`mf-currency-opt ${currency === 'USD' ? 'active' : ''}`}
                style={currency === 'USD' ? { background: '#3ecf8e', color: '#09130e' } : { color: '#a6aeaa' }}
                onClick={() => setCurrency('USD')}
              >
                $ USD
              </button>
              <button
                type="button"
                className={`mf-currency-opt ${currency === 'INR' ? 'active' : ''}`}
                style={currency === 'INR' ? { background: '#3ecf8e', color: '#09130e' } : { color: '#a6aeaa' }}
                onClick={() => setCurrency('INR')}
              >
                ₹ INR
              </button>
            </div>
            <button
              type="button"
              className="sb-btn sb-btn-outline"
              onClick={() => navigate('/')}
            >
              <ExternalLink size={14} /> Storefront
            </button>
          </div>
        </header>

        <div className="sb-content">
          {loading && !analytics && (
            <p className="mf-mono" style={{ color: '#3ecf8e' }}>
              Syncing PostgreSQL tables...
            </p>
          )}

          {/* OVERVIEW */}
          {tab === 'overview' && analytics && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <span className="mf-mono" style={{ color: '#3ecf8e' }}>
                    Live Store Overview
                  </span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '4px' }}>
                    Orders, Inventory &amp; Customer Activity
                  </h2>
                </div>
                <button
                  type="button"
                  className="sb-btn sb-btn-outline"
                  onClick={() => void loadAllAdmin()}
                >
                  Refresh Data
                </button>
              </div>

              <div className="mf-grid-4">
                <div className="sb-card">
                  <span className="mf-mono">Order Volume ({currency})</span>
                  <div className="mf-tabular" style={{ fontSize: '1.65rem', fontWeight: 700, marginTop: '6px' }}>
                    {formatPrice(analytics.totalRevenueCents)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#8f9894', marginTop: '4px' }}>
                    {formatPrice(analytics.collectedRevenueCents)} collected on delivery
                  </div>
                </div>
                <div className="sb-card">
                  <span className="mf-mono">Pending COD</span>
                  <div className="mf-tabular" style={{ fontSize: '1.65rem', fontWeight: 700, marginTop: '6px' }}>
                    {formatPrice(analytics.pendingCodCents)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#8f9894', marginTop: '4px' }}>
                    {Math.max(0, analytics.totalOrders - analytics.ordersByStatus.cancelled - analytics.paidOrdersCount)} unpaid active orders
                  </div>
                </div>
                <div className="sb-card">
                  <span className="mf-mono">Orders</span>
                  <div className="mf-tabular" style={{ fontSize: '1.65rem', fontWeight: 700, marginTop: '6px' }}>
                    {analytics.totalOrders}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#8f9894', marginTop: '4px' }}>
                    {analytics.paidOrdersCount} paid · {analytics.ordersByStatus.delivered} delivered
                  </div>
                </div>
                <div className="sb-card">
                  <span className="mf-mono">Customers &amp; Catalog</span>
                  <div className="mf-tabular" style={{ fontSize: '1.65rem', fontWeight: 700, marginTop: '6px' }}>
                    {analytics.totalCustomers} / {analytics.totalProducts}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#8f9894', marginTop: '4px' }}>
                    {analytics.newsletterCount} dispatches · {analytics.contactCount} inquiries
                  </div>
                </div>
              </div>

              {/* ORDER FULFILLMENT BREAKDOWN */}
              <div className="sb-card">
                <span className="mf-mono" style={{ color: '#9ca4a0' }}>
                  Fulfillment Breakdown
                </span>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                  {[
                    { label: 'Confirmed', value: analytics.ordersByStatus.confirmed, cls: 'amber' },
                    { label: 'Packed', value: analytics.ordersByStatus.packed, cls: 'amber' },
                    { label: 'Shipped', value: analytics.ordersByStatus.shipped, cls: 'green' },
                    { label: 'Delivered', value: analytics.ordersByStatus.delivered, cls: 'green' },
                    { label: 'Cancelled', value: analytics.ordersByStatus.cancelled, cls: '' },
                  ].map((item) => (
                    <span
                      key={item.label}
                      className={`mf-pill ${item.cls}`}
                      style={{ background: '#0e100f', borderColor: 'rgba(255,255,255,0.12)' }}
                    >
                      {item.label}: <strong style={{ marginLeft: '4px' }}>{item.value}</strong>
                    </span>
                  ))}
                </div>
              </div>

              {/* RECENT ORDERS TABLE */}
              <div className="sb-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="mf-mono" style={{ color: '#3ecf8e' }}>
                    Recent Orders ({analytics.recentOrders.length})
                  </span>
                  <button
                    type="button"
                    className="sb-btn sb-btn-outline"
                    onClick={() => setTab('orders')}
                  >
                    Manage All Orders
                  </button>
                </div>

                {analytics.recentOrders.length === 0 ? (
                  <p style={{ color: '#8f9894', fontSize: '0.88rem' }}>
                    No customer orders placed yet.
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="sb-table">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Customer</th>
                          <th>Items</th>
                          <th>Payment</th>
                          <th>Fulfillment</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.recentOrders.map((o) => (
                          <tr
                            key={o.id}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setTab('orders')}
                          >
                            <td className="mf-tabular" style={{ fontWeight: 600 }}>
                              {o.orderNumber}
                            </td>
                            <td style={{ color: '#c4cbc8', fontSize: '0.84rem' }}>
                              {o.shippingAddress?.fullName || o.shippingAddress?.email || 'Guest'}
                              <div style={{ fontSize: '0.75rem', color: '#7d8682' }}>
                                {o.shippingAddress?.email}
                              </div>
                            </td>
                            <td className="mf-tabular" style={{ fontSize: '0.84rem' }}>
                              {(o.items || []).reduce((sum, it) => sum + it.quantity, 0)} pcs
                            </td>
                            <td>
                              <span
                                className={`mf-pill ${
                                  o.paymentStatus === 'paid_on_delivery' ? 'green' : 'amber'
                                }`}
                              >
                                {o.paymentStatus === 'paid_on_delivery' ? 'Paid' : 'Pending COD'}
                              </span>
                            </td>
                            <td>
                              <span className="mf-pill">{o.status}</span>
                            </td>
                            <td className="mf-tabular" style={{ fontWeight: 600 }}>
                              {formatPrice(o.totalCents)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* TOP PRODUCTS & FIELD DISPATCH / CONTACT INQUIRIES */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                <div className="sb-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span className="mf-mono" style={{ color: '#3ecf8e' }}>
                      Product Sales &amp; Stock
                    </span>
                    <button
                      type="button"
                      className="sb-btn sb-btn-outline"
                      onClick={() => setTab('products')}
                    >
                      View Catalog
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {analytics.topProducts.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: '#0e100f',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{p.name}</div>
                          <div style={{ fontSize: '0.76rem', color: '#7d8682' }}>
                            {p.categoryName} · {p.totalStock} in stock
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div className="mf-tabular" style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                            {p.unitsSold} sold
                          </div>
                          <div className="mf-tabular" style={{ fontSize: '0.76rem', color: '#3ecf8e' }}>
                            {formatPrice(p.revenueCents || p.basePriceCents)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sb-card">
                  <span className="mf-mono" style={{ color: '#3ecf8e', display: 'block', marginBottom: '12px' }}>
                    Field Dispatch ({analytics.newsletterCount}) &amp; Contact Messages ({analytics.contactCount})
                  </span>

                  <div style={{ marginBottom: '16px' }}>
                    <div className="mf-mono" style={{ fontSize: '0.68rem', color: '#8f9894', marginBottom: '8px' }}>
                      Latest Field Dispatch Signups
                    </div>
                    {analytics.recentDispatches.length === 0 ? (
                      <p style={{ fontSize: '0.84rem', color: '#7d8682' }}>
                        No dispatch subscribers yet.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {analytics.recentDispatches.slice(0, 5).map((sub) => (
                          <div
                            key={sub.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '7px 10px',
                              borderRadius: '6px',
                              background: '#0e100f',
                              border: '1px solid rgba(255,255,255,0.08)',
                              fontSize: '0.82rem',
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {sub.email}
                            </span>
                            <span style={{ color: '#7d8682', fontSize: '0.74rem', flexShrink: 0, marginLeft: '8px' }}>
                              {new Date(sub.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mf-mono" style={{ fontSize: '0.68rem', color: '#8f9894', marginBottom: '8px' }}>
                      Latest Contact Section Inquiries
                    </div>
                    {analytics.recentContacts.length === 0 ? (
                      <p style={{ fontSize: '0.84rem', color: '#7d8682' }}>
                        No contact messages received yet.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {analytics.recentContacts.slice(0, 4).map((msg) => (
                          <div
                            key={msg.id}
                            style={{
                              padding: '9px 11px',
                              borderRadius: '6px',
                              background: '#0e100f',
                              border: '1px solid rgba(255,255,255,0.08)',
                              fontSize: '0.82rem',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                              <strong>{msg.name}</strong>
                              <span style={{ color: '#7d8682', fontSize: '0.74rem' }}>
                                {msg.email}
                              </span>
                            </div>
                            <p style={{ color: '#b4bcb8', marginTop: '4px', lineHeight: 1.4 }}>
                              {msg.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {analytics.lowStockVariants.length > 0 && (
                <div className="sb-card">
                  <span className="mf-mono" style={{ color: '#e3b341' }}>
                    Low Stock Variants (&le; 8 units)
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                    {analytics.lowStockVariants.map((v) => (
                      <span
                        key={v.id}
                        className="mf-pill amber"
                        style={{ background: '#0e100f', color: '#e3b341' }}
                      >
                        {v.product?.name} · {v.finishName} {v.sizeLabel} ({v.stockQty})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PRODUCTS & CURRENCY PRICING */}
          {tab === 'products' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '24px', alignItems: 'start' }}>
              <form onSubmit={handleSaveProduct} className="sb-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="mf-mono" style={{ color: '#3ecf8e' }}>
                    {editingId ? `Edit Product #${editingId}` : 'Insert Row · products'}
                  </span>
                  <div className="mf-currency-toggle" style={{ background: '#0e100f', borderColor: 'rgba(255,255,255,0.16)' }}>
                    <button
                      type="button"
                      className={`mf-currency-opt ${pInputCurrency === 'USD' ? 'active' : ''}`}
                      style={pInputCurrency === 'USD' ? { background: '#3ecf8e', color: '#09130e' } : { color: '#a6aeaa' }}
                      onClick={() => {
                        if (pInputCurrency === 'INR') {
                          const usdVal = Math.round(Number(pPrice || 0) / inrRate);
                          setPPrice(String(usdVal || 48));
                          if (pMrp) setPMrp(String(Math.round(Number(pMrp) / inrRate)));
                        }
                        setPInputCurrency('USD');
                      }}
                    >
                      $ USD
                    </button>
                    <button
                      type="button"
                      className={`mf-currency-opt ${pInputCurrency === 'INR' ? 'active' : ''}`}
                      style={pInputCurrency === 'INR' ? { background: '#3ecf8e', color: '#09130e' } : { color: '#a6aeaa' }}
                      onClick={() => {
                        if (pInputCurrency === 'USD') {
                          const inrVal = Math.round(Number(pPrice || 0) * inrRate);
                          setPPrice(String(inrVal || 4032));
                          if (pMrp) setPMrp(String(Math.round(Number(pMrp) * inrRate)));
                        }
                        setPInputCurrency('INR');
                      }}
                    >
                      ₹ INR
                    </button>
                  </div>
                </div>

                <div className="mf-field">
                  <label style={{ color: '#9ca4a0' }}>Product Name</label>
                  <input className="sb-input" required value={pName} onChange={(e) => setPName(e.target.value)} />
                </div>

                <div className="mf-grid-2">
                  <div className="mf-field">
                    <label style={{ color: '#9ca4a0' }}>Category</label>
                    <select className="sb-select" value={pCat} onChange={(e) => setPCat(e.target.value)}>
                      {adminCategories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mf-field">
                    <label style={{ color: '#9ca4a0' }}>Badge</label>
                    <input className="sb-input" placeholder="Bestseller / New" value={pTag} onChange={(e) => setPTag(e.target.value)} />
                  </div>
                </div>

                <div className="mf-grid-3">
                  <div className="mf-field">
                    <label style={{ color: '#9ca4a0' }}>
                      Price ({pInputCurrency === 'INR' ? '₹' : '$'})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="sb-input"
                      required
                      value={pPrice}
                      onChange={(e) => setPPrice(e.target.value)}
                    />
                    <span className="mf-mono" style={{ fontSize: '0.64rem', color: '#7d8682', marginTop: '4px', display: 'block' }}>
                      {pInputCurrency === 'USD'
                        ? `≈ ₹${Math.round(Number(pPrice || 0) * inrRate).toLocaleString('en-IN')}`
                        : `≈ $${(Number(pPrice || 0) / inrRate).toFixed(2)} USD`}
                    </span>
                  </div>
                  <div className="mf-field">
                    <label style={{ color: '#9ca4a0' }}>
                      Compare At ({pInputCurrency === 'INR' ? '₹' : '$'})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="sb-input"
                      value={pMrp}
                      onChange={(e) => setPMrp(e.target.value)}
                    />
                  </div>
                  <div className="mf-field">
                    <label style={{ color: '#9ca4a0' }}>Stock</label>
                    <input
                      type="number"
                      className="sb-input"
                      required
                      value={pStock}
                      onChange={(e) => setPStock(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mf-field">
                  <label style={{ color: '#9ca4a0' }}>Finishes (comma separated)</label>
                  <input className="sb-input" value={pFinishes} onChange={(e) => setPFinishes(e.target.value)} />
                </div>

                <div className="mf-field">
                  <label style={{ color: '#9ca4a0' }}>Capacities / Sizes</label>
                  <input className="sb-input" value={pSizes} onChange={(e) => setPSizes(e.target.value)} />
                </div>

                <div style={{ marginTop: '16px' }}>
                  <ChooseFileUploader
                    label="Product Photo (Choose File)"
                    currentImage={pImageUrl}
                    uploading={uploadingKey === 'product'}
                    onUploadFile={(file) =>
                      uploadImageFile('product', file, (url) => setPImageUrl(url))
                    }
                    onClear={() => setPImageUrl('')}
                  />
                </div>

                <div className="mf-field">
                  <label style={{ color: '#9ca4a0' }}>Description</label>
                  <textarea className="sb-textarea" rows={3} value={pDesc} onChange={(e) => setPDesc(e.target.value)} />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                  <button type="submit" className="sb-btn sb-btn-emerald">
                    <Plus size={15} /> {editingId ? 'Save Row' : 'Insert Product'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      className="sb-btn sb-btn-outline"
                      onClick={() => {
                        setEditingId(null);
                        setPName('');
                        setPDesc('');
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              <div className="sb-table-wrap">
                <table className="sb-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Product</th>
                      <th>Price ({currency})</th>
                      <th>Stock</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminProducts.map((p) => {
                      const totalStock = p.variants.reduce((s, v) => s + v.stockQty, 0);
                      return (
                        <tr key={p.id}>
                          <td>
                            <img
                              src={p.images[0]?.url || SHOWCASE_STAGES[0].src}
                              alt={p.name}
                              style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }}
                            />
                          </td>
                          <td>
                            <strong>{p.name}</strong>
                            <div className="mf-mono" style={{ fontSize: '0.68rem' }}>
                              {p.category?.name}
                            </div>
                          </td>
                          <td>
                            <strong>{formatPrice(p.basePriceCents)}</strong>
                            <div className="mf-mono" style={{ fontSize: '0.65rem', color: '#7d8682' }}>
                              ${Math.round(p.basePriceCents / 100)} / ₹{Math.round((p.basePriceCents / 100) * inrRate).toLocaleString('en-IN')}
                            </div>
                          </td>
                          <td>{totalStock}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                className="sb-btn sb-btn-outline"
                                style={{ padding: '6px 9px' }}
                                onClick={() => {
                                  setEditingId(p.id);
                                  setPName(p.name);
                                  setPCat(p.category?.name || 'Insulated Flasks');
                                  const usd = p.basePriceCents / 100;
                                  setPPrice(
                                    pInputCurrency === 'INR'
                                      ? String(Math.round(usd * inrRate))
                                      : String(usd)
                                  );
                                  setPMrp(
                                    p.mrpCents
                                      ? pInputCurrency === 'INR'
                                        ? String(Math.round((p.mrpCents / 100) * inrRate))
                                        : String(p.mrpCents / 100)
                                      : ''
                                  );
                                  setPStock(String(p.variants[0]?.stockQty ?? 12));
                                  setPTag(p.tag || '');
                                  setPFinishes(
                                    Array.from(new Set(p.variants.map((v) => v.finishName))).join(', ')
                                  );
                                  setPSizes(
                                    Array.from(new Set(p.variants.map((v) => v.sizeLabel))).join(', ')
                                  );
                                  setPDesc(p.description);
                                  setPImageUrl(p.images[0]?.url || '');
                                }}
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                className="sb-btn sb-btn-danger"
                                style={{ padding: '6px 9px' }}
                                onClick={async () => {
                                  await apiFetch(`/api/admin/products/${p.id}`, { method: 'DELETE' });
                                  showToast('Product deleted');
                                  await Promise.all([loadAllAdmin(), refreshCatalog()]);
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CATEGORIES WITH CHOOSE FILE UPLOAD */}
          {tab === 'categories' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '24px', alignItems: 'start' }}>
              <form onSubmit={handleSaveCategory} className="sb-card">
                <span className="mf-mono" style={{ color: '#3ecf8e' }}>
                  {editingCatId ? `Edit Category #${editingCatId}` : 'Insert Row · categories'}
                </span>
                <div className="mf-field">
                  <label style={{ color: '#9ca4a0' }}>Category Name</label>
                  <input className="sb-input" required value={catName} onChange={(e) => setCatName(e.target.value)} />
                </div>
                <div className="mf-field">
                  <label style={{ color: '#9ca4a0' }}>Description</label>
                  <textarea className="sb-textarea" rows={3} value={catDesc} onChange={(e) => setCatDesc(e.target.value)} />
                </div>
                <div style={{ marginTop: '16px' }}>
                  <ChooseFileUploader
                    label="Category Cover Image (Choose File)"
                    currentImage={catImageUrl}
                    uploading={uploadingKey === 'category'}
                    onUploadFile={(file) =>
                      uploadImageFile('category', file, (url) => setCatImageUrl(url))
                    }
                    onClear={() => setCatImageUrl('')}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                  <button type="submit" className="sb-btn sb-btn-emerald">
                    {editingCatId ? 'Update Category' : 'Add Category'}
                  </button>
                  {editingCatId && (
                    <button
                      type="button"
                      className="sb-btn sb-btn-outline"
                      onClick={() => {
                        setEditingCatId(null);
                        setCatName('');
                        setCatDesc('');
                        setCatImageUrl('');
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              <div className="sb-table-wrap">
                <table className="sb-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Category</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminCategories.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <img
                            src={c.imageUrl || SHOWCASE_STAGES[0].src}
                            alt={c.name}
                            style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover' }}
                          />
                        </td>
                        <td>
                          <strong>{c.name}</strong>
                          <div style={{ color: '#9aa4a0', fontSize: '0.8rem' }}>{c.description}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="sb-btn sb-btn-outline"
                              style={{ padding: '6px 9px' }}
                              onClick={() => {
                                setEditingCatId(c.id);
                                setCatName(c.name);
                                setCatDesc(c.description);
                                setCatImageUrl(c.imageUrl);
                              }}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              className="sb-btn sb-btn-danger"
                              style={{ padding: '6px 9px' }}
                              onClick={async () => {
                                await apiFetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
                                showToast('Category deleted');
                                await Promise.all([loadAllAdmin(), refreshCatalog()]);
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ORDERS */}
          {tab === 'orders' && (
            <div className="sb-table-wrap">
              <table className="sb-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>COD Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {adminOrders.map((o) => (
                    <tr key={o.id}>
                      <td><strong>{o.orderNumber}</strong></td>
                      <td>{o.shippingAddress.fullName}</td>
                      <td>{formatPrice(o.totalCents)}</td>
                      <td>
                        <select
                          className="sb-select"
                          value={o.status}
                          onChange={async (e) => {
                            await apiFetch(`/api/admin/orders/${o.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ status: e.target.value, paymentStatus: o.paymentStatus }),
                            });
                            showToast('Order status saved');
                            await loadAllAdmin();
                          }}
                        >
                          <option value="confirmed">confirmed</option>
                          <option value="processing">processing</option>
                          <option value="shipped">shipped</option>
                          <option value="delivered">delivered</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </td>
                      <td>
                        <select
                          className="sb-select"
                          value={o.paymentStatus}
                          onChange={async (e) => {
                            await apiFetch(`/api/admin/orders/${o.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ status: o.status, paymentStatus: e.target.value }),
                            });
                            showToast('Payment status saved');
                            await loadAllAdmin();
                          }}
                        >
                          <option value="pending">pending</option>
                          <option value="paid_on_delivery">paid_on_delivery</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* CUSTOMERS */}
          {tab === 'customers' && (
            <div className="sb-table-wrap">
              <table className="sb-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Orders</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong></td>
                      <td>{c.email}</td>
                      <td>{c.ordersCount}</td>
                      <td>
                        <select
                          className="sb-select"
                          value={c.role}
                          onChange={async (e) => {
                            await apiFetch(`/api/admin/customers/${c.id}/role`, {
                              method: 'PATCH',
                              body: JSON.stringify({ role: e.target.value }),
                            });
                            showToast('Role updated');
                            await loadAllAdmin();
                          }}
                        >
                          <option value="customer">customer</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* COUPONS */}
          {tab === 'coupons' && (
            <div className="mf-grid-2" style={{ alignItems: 'start' }}>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await apiFetch('/api/admin/coupons', {
                      method: 'POST',
                      body: JSON.stringify({
                        code: cCode.trim().toUpperCase(),
                        discountType: cType,
                        discountValue: Number(cValue),
                        currency: cInputCurrency,
                        minOrderAmount: Number(cMin || 0),
                      }),
                    });
                    setCCode('');
                    showToast('Coupon saved');
                    await loadAllAdmin(true);
                  } catch (err: any) {
                    showToast(err.message || 'Could not create coupon');
                  }
                }}
                className="sb-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="mf-mono" style={{ color: '#3ecf8e' }}>Insert Row · coupons</span>
                  <div className="mf-currency-toggle" style={{ background: '#0e100f', borderColor: 'rgba(255,255,255,0.16)' }}>
                    <button
                      type="button"
                      className={`mf-currency-opt ${cInputCurrency === 'USD' ? 'active' : ''}`}
                      style={cInputCurrency === 'USD' ? { background: '#3ecf8e', color: '#09130e' } : { color: '#a6aeaa' }}
                      onClick={() => {
                        if (cInputCurrency === 'INR') {
                          if (cType === 'fixed' && cValue) {
                            setCValue(String(Math.max(1, Math.round(Number(cValue) / inrRate))));
                          }
                          if (cMin) {
                            setCMin(String(Math.round(Number(cMin) / inrRate)));
                          }
                        }
                        setCInputCurrency('USD');
                      }}
                    >
                      $ USD
                    </button>
                    <button
                      type="button"
                      className={`mf-currency-opt ${cInputCurrency === 'INR' ? 'active' : ''}`}
                      style={cInputCurrency === 'INR' ? { background: '#3ecf8e', color: '#09130e' } : { color: '#a6aeaa' }}
                      onClick={() => {
                        if (cInputCurrency === 'USD') {
                          if (cType === 'fixed' && cValue) {
                            setCValue(String(Math.round(Number(cValue) * inrRate)));
                          }
                          if (cMin) {
                            setCMin(String(Math.round(Number(cMin) * inrRate)));
                          }
                        }
                        setCInputCurrency('INR');
                      }}
                    >
                      ₹ INR
                    </button>
                  </div>
                </div>
                <div className="mf-field">
                  <label style={{ color: '#9ca4a0' }}>Coupon Code</label>
                  <input className="sb-input" required placeholder="LIORAVE15" value={cCode} onChange={(e) => setCCode(e.target.value)} />
                </div>
                <div className="mf-grid-2">
                  <div className="mf-field">
                    <label style={{ color: '#9ca4a0' }}>Type</label>
                    <select className="sb-select" value={cType} onChange={(e) => setCType(e.target.value as 'percent' | 'fixed')}>
                      <option value="percent">Percent (%)</option>
                      <option value="fixed">
                        Fixed ({cInputCurrency === 'INR' ? '₹ INR' : '$ USD'})
                      </option>
                    </select>
                  </div>
                  <div className="mf-field">
                    <label style={{ color: '#9ca4a0' }}>
                      Discount Value ({cType === 'percent' ? '%' : cInputCurrency === 'INR' ? '₹' : '$'})
                    </label>
                    <input
                      type="number"
                      step={cType === 'percent' ? '1' : '0.01'}
                      min="0.01"
                      className="sb-input mf-tabular"
                      required
                      value={cValue}
                      onChange={(e) => setCValue(e.target.value)}
                    />
                    {cType === 'fixed' && (
                      <span className="mf-mono mf-tabular" style={{ fontSize: '0.64rem', color: '#7d8682', marginTop: '4px', display: 'block' }}>
                        {cInputCurrency === 'USD'
                          ? `≈ ₹${Math.round(Number(cValue || 0) * inrRate).toLocaleString('en-IN')}`
                          : `≈ $${(Number(cValue || 0) / inrRate).toFixed(2)} USD`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mf-field">
                  <label style={{ color: '#9ca4a0' }}>
                    Min Order ({cInputCurrency === 'INR' ? '₹ INR' : '$ USD'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="sb-input mf-tabular"
                    value={cMin}
                    onChange={(e) => setCMin(e.target.value)}
                  />
                  <span className="mf-mono mf-tabular" style={{ fontSize: '0.64rem', color: '#7d8682', marginTop: '4px', display: 'block' }}>
                    {cInputCurrency === 'USD'
                      ? `≈ ₹${Math.round(Number(cMin || 0) * inrRate).toLocaleString('en-IN')}`
                      : `≈ $${(Number(cMin || 0) / inrRate).toFixed(2)} USD`}
                  </span>
                </div>
                <button type="submit" className="sb-btn sb-btn-emerald" style={{ marginTop: '18px' }}>
                  Create Coupon
                </button>
              </form>

              <div className="sb-table-wrap">
                <table className="sb-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Discount</th>
                      <th>Min Order</th>
                      <th>Status</th>
                      <th>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((cp) => (
                      <tr key={cp.id}>
                        <td><strong>{cp.code}</strong></td>
                        <td className="mf-tabular">
                          {cp.discountType === 'percent' ? (
                            <strong>{cp.discountValue}%</strong>
                          ) : (
                            <>
                              <strong>{formatPrice(cp.discountValue)}</strong>
                              <div className="mf-mono" style={{ fontSize: '0.64rem', color: '#7d8682' }}>
                                ${(cp.discountValue / 100).toFixed(cp.discountValue % 100 === 0 ? 0 : 2)} / ₹{Math.round((cp.discountValue / 100) * inrRate).toLocaleString('en-IN')}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="mf-tabular">
                          {cp.minOrderCents > 0 ? (
                            <>
                              <span>{formatPrice(cp.minOrderCents)}</span>
                              <div className="mf-mono" style={{ fontSize: '0.64rem', color: '#7d8682' }}>
                                ${(cp.minOrderCents / 100).toFixed(cp.minOrderCents % 100 === 0 ? 0 : 2)} / ₹{Math.round((cp.minOrderCents / 100) * inrRate).toLocaleString('en-IN')}
                              </div>
                            </>
                          ) : (
                            <span style={{ color: '#7d8682' }}>None</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`mf-pill ${cp.isActive ? 'green' : 'red'}`}
                            style={{ background: '#0e100f' }}
                            onClick={async () => {
                              await apiFetch(`/api/admin/coupons/${cp.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ isActive: !cp.isActive }),
                              });
                              await loadAllAdmin(true);
                            }}
                          >
                            {cp.isActive ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="sb-btn sb-btn-danger"
                            style={{ padding: '6px 9px' }}
                            onClick={async () => {
                              await apiFetch(`/api/admin/coupons/${cp.id}`, { method: 'DELETE' });
                              await loadAllAdmin(true);
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CURRENCY SETTINGS ($, ₹) */}
          {tab === 'currency' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCmsPayload(cms, 'Default currency & INR exchange rate saved');
              }}
              className="sb-card"
              style={{ maxWidth: '620px' }}
            >
              <span className="mf-mono" style={{ color: '#3ecf8e' }}>
                Store Currency &amp; Exchange Control
              </span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '6px' }}>
                Display Prices in $ (USD) or ₹ (INR)
              </h2>
              <p style={{ color: '#9aa4a0', fontSize: '0.88rem', marginTop: '6px' }}>
                Set the storefront default currency and conversion rate. Both USD and INR remain toggleable in Products and the storefront header.
              </p>

              <div className="mf-field">
                <label style={{ color: '#9ca4a0' }}>Default Storefront Currency</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className={`sb-btn ${cms.currency === 'USD' ? 'sb-btn-emerald' : 'sb-btn-outline'}`}
                    onClick={() => setCmsDraft((p) => ({ ...p, currency: 'USD' }))}
                  >
                    $ US Dollar (USD)
                  </button>
                  <button
                    type="button"
                    className={`sb-btn ${cms.currency === 'INR' ? 'sb-btn-emerald' : 'sb-btn-outline'}`}
                    onClick={() => setCmsDraft((p) => ({ ...p, currency: 'INR' }))}
                  >
                    ₹ Indian Rupee (INR)
                  </button>
                </div>
              </div>

              <div className="mf-field">
                <label style={{ color: '#9ca4a0' }}>Conversion Rate (1 USD = ₹ INR)</label>
                <input
                  type="number"
                  step="0.5"
                  className="sb-input"
                  value={cms.inrRate || 84}
                  onChange={(e) => setCmsDraft((p) => ({ ...p, inrRate: Number(e.target.value) || 84 }))}
                />
              </div>

              <button type="submit" className="sb-btn sb-btn-emerald" style={{ marginTop: '20px' }}>
                Save Currency Settings
              </button>
            </form>
          )}

          {/* HEADER NAVIGATION EDITOR (SINGLE & SUB-OPTIONS) */}
          {tab === 'header-cms' && (
            <div style={{ maxWidth: '880px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <span className="mf-mono" style={{ color: '#3ecf8e' }}>
                    Header Navigation Builder
                  </span>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: '4px' }}>
                    Configure Single Links &amp; Dropdown Sub-Options
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="sb-btn sb-btn-outline" onClick={addHeaderItem}>
                    <Plus size={14} /> Add Header Item
                  </button>
                  <button
                    type="button"
                    className="sb-btn sb-btn-emerald"
                    onClick={() => saveCmsPayload(cms, 'Header navigation saved to live storefront')}
                  >
                    Publish Header
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {(cms.headerNav || []).map((navItem, idx) => (
                  <div key={navItem.id} className="sb-card">
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                      <div>
                        <label className="mf-mono" style={{ fontSize: '0.66rem', color: '#9ca4a0' }}>
                          Option Label
                        </label>
                        <input
                          className="sb-input"
                          value={navItem.label}
                          onChange={(e) => updateHeaderItem(idx, { label: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="mf-mono" style={{ fontSize: '0.66rem', color: '#9ca4a0' }}>
                          Menu Type
                        </label>
                        <select
                          className="sb-select"
                          value={navItem.type}
                          onChange={(e) =>
                            updateHeaderItem(idx, {
                              type: e.target.value as 'single' | 'dropdown',
                            })
                          }
                        >
                          <option value="single">Single Option</option>
                          <option value="dropdown">Sub-Options (Dropdown)</option>
                        </select>
                      </div>

                      <div>
                        <label className="mf-mono" style={{ fontSize: '0.66rem', color: '#9ca4a0' }}>
                          Target Page
                        </label>
                        <select
                          className="sb-select"
                          value={navItem.route}
                          onChange={(e) => updateHeaderItem(idx, { route: e.target.value })}
                        >
                          {ROUTE_CHOICES.map((rc) => (
                            <option key={rc.value} value={rc.value}>{rc.label}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="sb-btn sb-btn-outline" style={{ padding: '8px' }} onClick={() => moveHeaderItem(idx, -1)}>
                          <ArrowUp size={13} />
                        </button>
                        <button type="button" className="sb-btn sb-btn-outline" style={{ padding: '8px' }} onClick={() => moveHeaderItem(idx, 1)}>
                          <ArrowDown size={13} />
                        </button>
                        <button type="button" className="sb-btn sb-btn-danger" style={{ padding: '8px' }} onClick={() => removeHeaderItem(idx)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {navItem.type === 'dropdown' && (
                      <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span className="mf-mono" style={{ fontSize: '0.7rem', color: '#3ecf8e' }}>
                            Dropdown Sub-Options ({navItem.subOptions?.length || 0})
                          </span>
                          <button type="button" className="sb-btn sb-btn-outline" style={{ padding: '5px 10px', fontSize: '0.76rem' }} onClick={() => addSubOption(idx)}>
                            <Plus size={12} /> Add Sub-Option
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {(navItem.subOptions || []).map((sub, sIdx) => (
                            <div
                              key={sub.id}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr auto',
                                gap: '8px',
                                alignItems: 'center',
                              }}
                            >
                              <input
                                className="sb-input"
                                placeholder="Sub-option label"
                                value={sub.label}
                                onChange={(e) => updateSubOption(idx, sIdx, { label: e.target.value })}
                              />
                              <select
                                className="sb-select"
                                value={sub.route}
                                onChange={(e) => updateSubOption(idx, sIdx, { route: e.target.value })}
                              >
                                {ROUTE_CHOICES.map((rc) => (
                                  <option key={rc.value} value={rc.value}>{rc.label}</option>
                                ))}
                              </select>
                              <select
                                className="sb-select"
                                value={sub.categoryFilter || ''}
                                onChange={(e) => updateSubOption(idx, sIdx, { categoryFilter: e.target.value || undefined })}
                              >
                                <option value="">No category filter</option>
                                {adminCategories.map((c) => (
                                  <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="sb-btn sb-btn-danger"
                                style={{ padding: '7px' }}
                                onClick={() => removeSubOption(idx, sIdx)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HERO SCREEN & OTHER PAGE PHOTOS CMS (CHOOSE FILE ONLY) */}
          {tab === 'photos-cms' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCmsPayload(cms, 'Hero screen copy and page photos updated');
              }}
              style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              <div className="sb-card">
                <span className="mf-mono" style={{ color: '#3ecf8e' }}>
                  Hero Screen Copy &amp; Primary Photo
                </span>
                <div className="mf-grid-2" style={{ marginTop: '14px' }}>
                  <div>
                    <div className="mf-field" style={{ marginTop: 0 }}>
                      <label style={{ color: '#9ca4a0' }}>Hero Eyebrow</label>
                      <input className="sb-input" value={cms.heroEyebrow} onChange={(e) => setCmsDraft({ ...cms, heroEyebrow: e.target.value })} />
                    </div>
                    <div className="mf-field">
                      <label style={{ color: '#9ca4a0' }}>Hero Headline</label>
                      <input className="sb-input" value={cms.heroHeadline} onChange={(e) => setCmsDraft({ ...cms, heroHeadline: e.target.value })} />
                    </div>
                    <div className="mf-field">
                      <label style={{ color: '#9ca4a0' }}>Hero Subline</label>
                      <textarea className="sb-textarea" rows={3} value={cms.heroSubline} onChange={(e) => setCmsDraft({ ...cms, heroSubline: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <ChooseFileUploader
                      label="Hero Screen Photo (Choose File)"
                      currentImage={cms.heroImage}
                      uploading={uploadingKey === 'hero'}
                      onUploadFile={(file) =>
                        uploadImageFile('hero', file, (url) =>
                          setCmsDraft((prev) => ({ ...prev, heroImage: url }))
                        )
                      }
                      onClear={() => setCmsDraft((prev) => ({ ...prev, heroImage: '' }))}
                    />
                    <div style={{ marginTop: '16px' }}>
                      <ChooseFileUploader
                        label="About Page Photo (Choose File)"
                        currentImage={cms.aboutImage}
                        uploading={uploadingKey === 'about'}
                        onUploadFile={(file) =>
                          uploadImageFile('about', file, (url) =>
                            setCmsDraft((prev) => ({ ...prev, aboutImage: url }))
                          )
                        }
                        onClear={() => setCmsDraft((prev) => ({ ...prev, aboutImage: '' }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="sb-card">
                <span className="mf-mono" style={{ color: '#3ecf8e' }}>
                  Homepage 4-Stage Showcase Photos (Choose File)
                </span>
                <div className="mf-grid-2" style={{ marginTop: '14px' }}>
                  {(cms.showcaseStages || SHOWCASE_STAGES).map((stage, idx) => (
                    <div
                      key={stage.id || idx}
                      style={{
                        padding: '14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.09)',
                        background: '#111413',
                      }}
                    >
                      <span className="mf-mono" style={{ fontSize: '0.68rem', color: '#9ca4a0' }}>
                        Showcase Photo 0{idx + 1}
                      </span>
                      <div style={{ marginTop: '8px' }}>
                        <ChooseFileUploader
                          label="Stage Image (Choose File)"
                          currentImage={stage.src}
                          uploading={uploadingKey === `stage-${idx}`}
                          onUploadFile={(file) =>
                            uploadImageFile(`stage-${idx}`, file, (url) =>
                              updateStage(idx, { src: url })
                            )
                          }
                        />
                      </div>
                      <div className="mf-field">
                        <label style={{ color: '#9ca4a0' }}>Stage Title</label>
                        <input
                          className="sb-input"
                          value={stage.title}
                          onChange={(e) => updateStage(idx, { title: e.target.value })}
                        />
                      </div>
                      <div className="mf-field">
                        <label style={{ color: '#9ca4a0' }}>Stage Subtitle</label>
                        <input
                          className="sb-input"
                          value={stage.sub}
                          onChange={(e) => updateStage(idx, { sub: e.target.value })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <button type="submit" className="sb-btn sb-btn-emerald">
                  Save Hero &amp; Page Photos
                </button>
              </div>
            </form>
          )}

          {/* PRIVACY POLICY & TERMS & WARRANTY CMS */}
          {tab === 'policies-cms' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCmsPayload(cms, 'Privacy Policy and Terms & Warranty updated');
              }}
              className="sb-card"
              style={{ maxWidth: '820px', display: 'flex', flexDirection: 'column', gap: '18px' }}
            >
              <div>
                <span className="mf-mono" style={{ color: '#3ecf8e' }}>
                  Legal &amp; Storefront Policies
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: '4px' }}>
                  Privacy Policy &amp; Terms &amp; Warranty
                </h2>
                <p style={{ color: '#9aa4a0', fontSize: '0.88rem', marginTop: '6px' }}>
                  Edit the copy displayed on the storefront Privacy Policy and Terms &amp; Lifetime Warranty pages. Changes sync immediately.
                </p>
              </div>

              <div className="mf-field" style={{ marginTop: 0 }}>
                <label style={{ color: '#9ca4a0' }}>Privacy Policy</label>
                <textarea
                  className="sb-textarea"
                  rows={6}
                  required
                  value={cms.privacyPolicyText || ''}
                  onChange={(e) =>
                    setCmsDraft((prev) => ({ ...prev, privacyPolicyText: e.target.value }))
                  }
                />
              </div>

              <div className="mf-field" style={{ marginTop: 0 }}>
                <label style={{ color: '#9ca4a0' }}>Terms &amp; Lifetime Warranty</label>
                <textarea
                  className="sb-textarea"
                  rows={6}
                  required
                  value={cms.termsPolicyText || ''}
                  onChange={(e) =>
                    setCmsDraft((prev) => ({ ...prev, termsPolicyText: e.target.value }))
                  }
                />
              </div>

              <div>
                <button type="submit" className="sb-btn sb-btn-emerald">
                  Save Policies
                </button>
              </div>
            </form>
          )}

          {/* GIFT WRAP ADMIN CONTROL */}
          {tab === 'gift-wrap-cms' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCmsPayload(cms, 'Gift Wrap option updated on storefront');
              }}
              className="sb-card"
              style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '18px' }}
            >
              <div>
                <span className="mf-mono" style={{ color: '#3ecf8e' }}>
                  Storefront Gift Wrap Control
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: '4px' }}>
                  Premium Gift Wrapping Option
                </h2>
                <p style={{ color: '#9aa4a0', fontSize: '0.88rem', marginTop: '6px' }}>
                  Control whether customers see the &ldquo;Gift Wrap&rdquo; checkbox on Product Detail pages and inside the Cart Drawer, and set the gift-wrapping charge added to the order total.
                </p>
              </div>

              <div className="mf-field" style={{ marginTop: 0 }}>
                <label style={{ color: '#9ca4a0' }}>Storefront Availability</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`sb-btn ${cms.giftWrapEnabled !== false ? 'sb-btn-emerald' : 'sb-btn-outline'}`}
                    onClick={() => setCmsDraft((p) => ({ ...p, giftWrapEnabled: true }))}
                  >
                    Enabled (Show Option)
                  </button>
                  <button
                    type="button"
                    className={`sb-btn ${cms.giftWrapEnabled === false ? 'sb-btn-danger' : 'sb-btn-outline'}`}
                    onClick={() => setCmsDraft((p) => ({ ...p, giftWrapEnabled: false }))}
                  >
                    Disabled (Hide Option)
                  </button>
                </div>
              </div>

              <div className="mf-field" style={{ marginTop: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ color: '#9ca4a0', margin: 0 }}>
                    Gift Wrap Charge ({gwInputCurrency === 'INR' ? '₹ INR' : '$ USD'})
                  </label>
                  <div className="mf-currency-toggle" style={{ background: '#0e100f', borderColor: 'rgba(255,255,255,0.16)' }}>
                    <button
                      type="button"
                      className={`mf-currency-opt ${gwInputCurrency === 'USD' ? 'active' : ''}`}
                      style={gwInputCurrency === 'USD' ? { background: '#3ecf8e', color: '#09130e' } : { color: '#a6aeaa' }}
                      onClick={() => setGwInputCurrency('USD')}
                    >
                      $ USD
                    </button>
                    <button
                      type="button"
                      className={`mf-currency-opt ${gwInputCurrency === 'INR' ? 'active' : ''}`}
                      style={gwInputCurrency === 'INR' ? { background: '#3ecf8e', color: '#09130e' } : { color: '#a6aeaa' }}
                      onClick={() => setGwInputCurrency('INR')}
                    >
                      ₹ INR
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  min={0}
                  step={gwInputCurrency === 'INR' ? '10' : '1'}
                  className="sb-input"
                  value={
                    gwInputCurrency === 'INR'
                      ? Math.round(((cms.giftWrapPriceCents ?? 500) / 100) * inrRate)
                      : Math.round((cms.giftWrapPriceCents ?? 500) / 100)
                  }
                  onChange={(e) => {
                    const raw = Math.max(0, Number(e.target.value) || 0);
                    const usdCents =
                      gwInputCurrency === 'INR'
                        ? Math.round((raw / inrRate) * 100)
                        : Math.round(raw * 100);
                    setCmsDraft((p) => ({ ...p, giftWrapPriceCents: usdCents }));
                  }}
                />
                <div className="mf-mono" style={{ fontSize: '0.72rem', color: '#8b9490', marginTop: '6px' }}>
                  Storefront charge: ${((cms.giftWrapPriceCents ?? 500) / 100).toFixed(2)} USD / ₹
                  {Math.round(((cms.giftWrapPriceCents ?? 500) / 100) * inrRate).toLocaleString('en-IN')} INR
                </div>
              </div>

              <div>
                <button type="submit" className="sb-btn sb-btn-emerald">
                  Save Gift Wrap Settings
                </button>
              </div>
            </form>
          )}

          {/* SIZE GUIDE ADMIN CONTROL */}
          {tab === 'size-guide-cms' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCmsPayload(cms, 'Size Guide settings updated on storefront');
              }}
              className="sb-card"
              style={{ maxWidth: '860px', display: 'flex', flexDirection: 'column', gap: '18px' }}
            >
              <div>
                <span className="mf-mono" style={{ color: '#3ecf8e' }}>
                  Storefront Size Guide Control
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: '4px' }}>
                  Ring Size Guide &amp; Measurement Tips
                </h2>
                <p style={{ color: '#9aa4a0', fontSize: '0.88rem', marginTop: '6px' }}>
                  Control whether customers see the &ldquo;Size Guide&rdquo; modal link on Product Detail pages, and customize the ring size chart and fit tips.
                </p>
              </div>

              <div className="mf-field" style={{ marginTop: 0 }}>
                <label style={{ color: '#9ca4a0' }}>Storefront Availability</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`sb-btn ${cms.sizeGuideEnabled !== false ? 'sb-btn-emerald' : 'sb-btn-outline'}`}
                    onClick={() => setCmsDraft((p) => ({ ...p, sizeGuideEnabled: true }))}
                  >
                    Enabled (Show Size Guide)
                  </button>
                  <button
                    type="button"
                    className={`sb-btn ${cms.sizeGuideEnabled === false ? 'sb-btn-danger' : 'sb-btn-outline'}`}
                    onClick={() => setCmsDraft((p) => ({ ...p, sizeGuideEnabled: false }))}
                  >
                    Disabled (Hide Size Guide)
                  </button>
                </div>
              </div>

              <div className="mf-grid-2">
                <div className="mf-field" style={{ marginTop: 0 }}>
                  <label style={{ color: '#9ca4a0' }}>Modal Title</label>
                  <input
                    className="sb-input"
                    required
                    value={cms.sizeGuideTitle || ''}
                    onChange={(e) =>
                      setCmsDraft((p) => ({ ...p, sizeGuideTitle: e.target.value }))
                    }
                  />
                </div>
                <div className="mf-field" style={{ marginTop: 0 }}>
                  <label style={{ color: '#9ca4a0' }}>Guide Introduction</label>
                  <input
                    className="sb-input"
                    value={cms.sizeGuideIntro || ''}
                    onChange={(e) =>
                      setCmsDraft((p) => ({ ...p, sizeGuideIntro: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span className="mf-mono" style={{ color: '#3ecf8e' }}>
                    Ring Size Chart Rows ({(cms.sizeGuideRows || []).length})
                  </span>
                  <button
                    type="button"
                    className="sb-btn sb-btn-outline"
                    style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                    onClick={() =>
                      setCmsDraft((p) => ({
                        ...p,
                        sizeGuideRows: [
                          ...(p.sizeGuideRows || []),
                          { usSize: 'US 11 / IN 25', ukSize: 'V½', diameterMm: '20.6 mm', circumferenceMm: '64.6 mm' },
                        ],
                      }))
                    }
                  >
                    <Plus size={12} /> Add Size Row
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(cms.sizeGuideRows || []).map((row, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 0.8fr 1fr 1fr auto',
                        gap: '8px',
                        alignItems: 'center',
                      }}
                    >
                      <input
                        className="sb-input"
                        placeholder="US / IN Size"
                        value={row.usSize}
                        onChange={(e) =>
                          setCmsDraft((p) => {
                            const next = [...(p.sizeGuideRows || [])];
                            next[idx] = { ...next[idx], usSize: e.target.value };
                            return { ...p, sizeGuideRows: next };
                          })
                        }
                      />
                      <input
                        className="sb-input"
                        placeholder="UK / AU"
                        value={row.ukSize}
                        onChange={(e) =>
                          setCmsDraft((p) => {
                            const next = [...(p.sizeGuideRows || [])];
                            next[idx] = { ...next[idx], ukSize: e.target.value };
                            return { ...p, sizeGuideRows: next };
                          })
                        }
                      />
                      <input
                        className="sb-input"
                        placeholder="Diameter (mm)"
                        value={row.diameterMm}
                        onChange={(e) =>
                          setCmsDraft((p) => {
                            const next = [...(p.sizeGuideRows || [])];
                            next[idx] = { ...next[idx], diameterMm: e.target.value };
                            return { ...p, sizeGuideRows: next };
                          })
                        }
                      />
                      <input
                        className="sb-input"
                        placeholder="Circumference (mm)"
                        value={row.circumferenceMm}
                        onChange={(e) =>
                          setCmsDraft((p) => {
                            const next = [...(p.sizeGuideRows || [])];
                            next[idx] = { ...next[idx], circumferenceMm: e.target.value };
                            return { ...p, sizeGuideRows: next };
                          })
                        }
                      />
                      <button
                        type="button"
                        className="sb-btn sb-btn-danger"
                        style={{ padding: '7px' }}
                        onClick={() =>
                          setCmsDraft((p) => ({
                            ...p,
                            sizeGuideRows: (p.sizeGuideRows || []).filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span className="mf-mono" style={{ color: '#3ecf8e' }}>
                    Measurement Tips ({(cms.sizeGuideTips || []).length})
                  </span>
                  <button
                    type="button"
                    className="sb-btn sb-btn-outline"
                    style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                    onClick={() =>
                      setCmsDraft((p) => ({
                        ...p,
                        sizeGuideTips: [
                          ...(p.sizeGuideTips || []),
                          'If you fall between two sizes, choose the larger size for daily comfort.',
                        ],
                      }))
                    }
                  >
                    <Plus size={12} /> Add Tip
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(cms.sizeGuideTips || []).map((tip, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: '8px',
                        alignItems: 'center',
                      }}
                    >
                      <input
                        className="sb-input"
                        value={tip}
                        onChange={(e) =>
                          setCmsDraft((p) => {
                            const next = [...(p.sizeGuideTips || [])];
                            next[idx] = e.target.value;
                            return { ...p, sizeGuideTips: next };
                          })
                        }
                      />
                      <button
                        type="button"
                        className="sb-btn sb-btn-danger"
                        style={{ padding: '7px' }}
                        onClick={() =>
                          setCmsDraft((p) => ({
                            ...p,
                            sizeGuideTips: (p.sizeGuideTips || []).filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <button type="submit" className="sb-btn sb-btn-emerald">
                  Save Size Guide Settings
                </button>
              </div>
            </form>
          )}

          {/* FESTIVAL BANNER ADMIN CONTROL */}
          {tab === 'festival-cms' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCmsPayload(cms, 'Festival Banner updated on storefront');
              }}
              className="sb-card"
              style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '18px' }}
            >
              <div>
                <span className="mf-mono" style={{ color: '#3ecf8e' }}>
                  Seasonal Greeting &amp; Golden Ribbon
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: '4px' }}>
                  Festival of Jewellery Banner
                </h2>
                <p style={{ color: '#9aa4a0', fontSize: '0.88rem', marginTop: '6px' }}>
                  Customize the top golden-gradient festival banner copy (for example, Chhath Puja, Diwali, Bridal Season, or Festive Collections) or toggle its visibility.
                </p>
              </div>

              <div className="mf-field" style={{ marginTop: 0 }}>
                <label style={{ color: '#9ca4a0' }}>Banner Visibility</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`sb-btn ${cms.festivalBannerEnabled !== false ? 'sb-btn-emerald' : 'sb-btn-outline'}`}
                    onClick={() => setCmsDraft((p) => ({ ...p, festivalBannerEnabled: true }))}
                  >
                    Enabled (Show Banner)
                  </button>
                  <button
                    type="button"
                    className={`sb-btn ${cms.festivalBannerEnabled === false ? 'sb-btn-danger' : 'sb-btn-outline'}`}
                    onClick={() => setCmsDraft((p) => ({ ...p, festivalBannerEnabled: false }))}
                  >
                    Disabled (Hide Banner)
                  </button>
                </div>
              </div>

              <div className="mf-grid-2">
                <div className="mf-field" style={{ marginTop: 0 }}>
                  <label style={{ color: '#9ca4a0' }}>Banner Title (optional)</label>
                  <input
                    className="sb-input"
                    placeholder="Optional short label (leave blank to hide)"
                    value={cms.festivalTitle || ''}
                    onChange={(e) =>
                      setCmsDraft((p) => ({ ...p, festivalTitle: e.target.value }))
                    }
                  />
                </div>
                <div className="mf-field" style={{ marginTop: 0 }}>
                  <label style={{ color: '#9ca4a0' }}>Action Link Text</label>
                  <input
                    className="sb-input"
                    required
                    value={cms.festivalCtaLabel || ''}
                    onChange={(e) =>
                      setCmsDraft((p) => ({ ...p, festivalCtaLabel: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="mf-field" style={{ marginTop: 0 }}>
                <label style={{ color: '#9ca4a0' }}>Festival Message / Subtitle</label>
                <input
                  className="sb-input"
                  required
                  value={cms.festivalSubtitle || ''}
                  onChange={(e) =>
                    setCmsDraft((p) => ({ ...p, festivalSubtitle: e.target.value }))
                  }
                />
              </div>

              <div>
                <button type="submit" className="sb-btn sb-btn-emerald">
                  Save Festival Banner
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
