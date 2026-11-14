import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  CartState,
  CategoryItem,
  CurrencyCode,
  ProductItem,
  RealtimeEvent,
  SiteContent,
  UserProfile,
  WishlistRow,
} from '../types/store';
import { formatMoney, SHOWCASE_STAGES } from '../lib/icons';

export const DEFAULT_SITE_CONTENT: SiteContent = {
  currency: 'INR',
  inrRate: 84,
  headerNav: [
    {
      id: 'nav-home',
      label: 'Home',
      type: 'single',
      route: '/',
      subOptions: [],
    },
    {
      id: 'nav-shop',
      label: 'Shop',
      type: 'single',
      route: '/shop',
      subOptions: [],
    },
    {
      id: 'nav-collections',
      label: 'Collections',
      type: 'single',
      route: '/collections',
      subOptions: [],
    },
    {
      id: 'nav-track',
      label: 'Track Order',
      type: 'single',
      route: '/track-order',
      subOptions: [],
    },
    {
      id: 'nav-contact',
      label: 'Contact',
      type: 'single',
      route: '/contact',
      subOptions: [],
    },
  ],
  heroEyebrow: '22K Gold Vermeil & 925 Sterling Silver',
  heroHeadline: 'Architectural Jewellery for Light & Form.',
  heroSubline:
    'Precision-cast rings, pavé bands, and sculptural silhouettes finished in 2.5 µm 22K gold vermeil over recycled 925 sterling silver — hypoallergenic and tarnish-guarded.',
  heroPrimaryCta: 'Trending Piece',
  heroSecondaryCta: 'Shop Catalog',
  heroImage: SHOWCASE_STAGES[0].src,
  aboutImage: SHOWCASE_STAGES[2].src,
  showcaseStages: SHOWCASE_STAGES,
  metricCold: '12k+',
  metricColdLabel: 'Women Adorned',
  metricHot: '4.9',
  metricHotLabel: 'Average Rating',
  metricSteel: 'Lifetime',
  metricSteelLabel: 'Warranty',
  storyEyebrow: 'Crafted Without Compromise',
  storyHeadline: 'Faceted for studio light, forged for enduring daily wear.',
  storyText:
    'Every LIORAVÉ piece begins with recycled 925 sterling silver and architectural 316L cores, finished in a dense 2.5-micron 22K gold vermeil or rhodium bath for lasting lustre.',
  storyText2:
    'Micro-beveled inner bands and precision bezel tolerances keep every silhouette balanced from morning ateliers to evening gatherings.',
  newsletterOffer: 'Get 10% Off Your First Piece',
  newsletterSubtext:
    'Join atelier dispatches for small-batch vermeil drops, alloy craft notes, and early access.',
  privacyPolicyText:
    'LIORAVÉ collects only the contact, shipping, and order details necessary to fulfill Cash on Delivery and Online Pay on Delivery shipments, manage warranty claims, and synchronize your wishlist when signed in. We never sell customer data to third parties.',
  termsPolicyText:
    'Every LIORAVÉ architectural piece carries a lifetime structural warranty against plating detachment and manufacturing defects under normal studio and daily wear. All orders settle exclusively via Cash on Delivery or Online Pay at Delivery.',
  giftWrapEnabled: true,
  giftWrapPriceCents: 500,
  sizeGuideEnabled: true,
  sizeGuideTitle: 'Ring Size Guide',
  sizeGuideIntro:
    'Find your most comfortable fit by measuring the inner diameter of a well-fitting ring or wrapping a strip of paper around the base of your finger.',
  sizeGuideRows: [
    { usSize: 'US 5 / IN 9', ukSize: 'J½', diameterMm: '15.7 mm', circumferenceMm: '49.3 mm' },
    { usSize: 'US 6 / IN 12', ukSize: 'L½', diameterMm: '16.5 mm', circumferenceMm: '51.9 mm' },
    { usSize: 'US 7 / IN 14', ukSize: 'N½', diameterMm: '17.3 mm', circumferenceMm: '54.4 mm' },
    { usSize: 'US 8 / IN 17', ukSize: 'P½', diameterMm: '18.1 mm', circumferenceMm: '57.0 mm' },
    { usSize: 'US 9 / IN 20', ukSize: 'R½', diameterMm: '18.9 mm', circumferenceMm: '59.5 mm' },
    { usSize: 'US 10 / IN 22', ukSize: 'T½', diameterMm: '19.8 mm', circumferenceMm: '62.1 mm' },
  ],
  sizeGuideTips: [
    'Wrap a snug, non-stretchy strip of paper around the base of your finger, mark where it overlaps, and measure the length in millimetres against the Circumference column.',
    'Or lay an existing ring that fits that finger flat over a ruler and measure the inside edge-to-edge diameter (excluding the band wall).',
    'Measure at the end of the day when fingers are warm; cold temperatures can temporarily shrink finger size by up to half a size.',
    'For wider sculptural or statement bands (6 mm+), consider sizing up one half-size so the ring glides comfortably over the knuckle.',
  ],
  festivalBannerEnabled: true,
  festivalTitle: '',
  festivalSubtitle: 'Let celebrate Chhath Puja with LIORAVÉ',
  festivalCtaLabel: 'Shop Festival Edit',
};

const EMPTY_CART: CartState = {
  id: 0,
  items: [],
  couponCode: null,
  giftWrap: false,
  giftWrapCents: 0,
  subtotalCents: 0,
  discountCents: 0,
  shippingCents: 0,
  totalCents: 0,
};

function getSessionId(): string {
  const key = 'mf_bag_session';
  let existing = window.sessionStorage.getItem(key);
  if (!existing) {
    existing = `sess_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
    window.sessionStorage.setItem(key, existing);
  }
  return existing;
}

function normalizePath(raw: string): string {
  if (!raw || raw === '#') return '/';
  if (raw.startsWith('#')) {
    const cleanHash = raw.slice(1);
    return cleanHash.startsWith('/') ? cleanHash : `/${cleanHash}`;
  }
  return raw.startsWith('/') ? raw : `/${raw}`;
}

interface StoreContextValue {
  route: string;
  navigate: (path: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatPrice: (usdCents: number) => string;
  user: UserProfile | null;
  authLoading: boolean;
  authToken: string | null;
  googleLoginEnabled: boolean;
  googleClientId: string;
  googleAuthMode: 'google_gis' | 'firebase_google' | 'demo';
  refreshAuthConfig: () => Promise<void>;
  apiFetch: <T = unknown>(url: string, options?: RequestInit) => Promise<T>;
  loginWithGoogle: () => Promise<UserProfile>;
  loginWithGoogleCredential: (credential: string) => Promise<UserProfile>;
  loginWithEmail: (email: string, password: string) => Promise<UserProfile>;
  loginAdmin: (email: string, password: string) => Promise<UserProfile>;
  registerWithEmail: (
    name: string,
    email: string,
    password: string,
    phone?: string
  ) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  products: ProductItem[];
  categories: CategoryItem[];
  refreshCatalog: () => Promise<void>;
  activeShopCategory: string | null;
  setActiveShopCategory: (cat: string | null) => void;
  shopByCategory: (cat: string | null) => void;
  openProduct: (slug: string) => void;
  cart: CartState;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  wishOpen: boolean;
  setWishOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  loginOpen: boolean;
  setLoginOpen: (open: boolean) => void;
  accountPanelOpen: boolean;
  setAccountPanelOpen: (open: boolean) => void;
  addToBag: (
    productId: number,
    variantId: number,
    quantity?: number,
    giftWrap?: boolean
  ) => Promise<void>;
  quickAdd: (product: ProductItem) => Promise<void>;
  updateBagQty: (itemId: number, quantity: number) => Promise<void>;
  removeFromBag: (itemId: number) => Promise<void>;
  setGiftWrap: (giftWrap: boolean) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  refreshCart: () => Promise<void>;
  wishlist: WishlistRow[];
  isWishlisted: (productId: number) => boolean;
  toggleWishlist: (productId: number, variantId?: number) => Promise<boolean>;
  refreshWishlist: () => Promise<void>;
  siteContent: SiteContent;
  refreshSiteContent: () => Promise<void>;
  wsConnected: boolean;
  subscribeRealtime: (listener: (event: RealtimeEvent) => void) => () => void;
  toast: string | null;
  showToast: (msg: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<string>(() => {
    if (window.location.hash && window.location.hash.length > 1) {
      return normalizePath(window.location.hash);
    }
    return (window.location.pathname || '/') + (window.location.search || '');
  });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const currencyRef = useRef<CurrencyCode>('INR');
  const currencyOverriddenRef = useRef(false);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [activeShopCategory, setActiveShopCategory] = useState<string | null>(null);

  const [cart, setCart] = useState<CartState>(EMPTY_CART);
  const [cartOpen, setCartOpen] = useState<boolean>(false);
  const [wishOpen, setWishOpen] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [loginOpen, setLoginOpen] = useState<boolean>(false);
  const [accountPanelOpen, setAccountPanelOpen] = useState<boolean>(false);

  const [wishlist, setWishlist] = useState<WishlistRow[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [googleLoginEnabled, setGoogleLoginEnabled] = useState<boolean>(() =>
    Boolean(
      import.meta.env.VITE_ENABLE_GOOGLE_LOGIN === 'true' ||
        (typeof import.meta.env.VITE_GOOGLE_CLIENT_ID === 'string' &&
          import.meta.env.VITE_GOOGLE_CLIENT_ID.trim()) ||
        (typeof import.meta.env.VITE_GOOGLE_LOGIN_CODE === 'string' &&
          import.meta.env.VITE_GOOGLE_LOGIN_CODE.trim())
    )
  );
  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    const cid =
      typeof import.meta.env.VITE_GOOGLE_CLIENT_ID === 'string'
        ? import.meta.env.VITE_GOOGLE_CLIENT_ID.trim()
        : '';
    if (cid) return cid;
    const code =
      typeof import.meta.env.VITE_GOOGLE_LOGIN_CODE === 'string'
        ? import.meta.env.VITE_GOOGLE_LOGIN_CODE.trim()
        : '';
    return code.endsWith('.apps.googleusercontent.com') ? code : '';
  });
  const [googleAuthMode, setGoogleAuthMode] = useState<
    'google_gis' | 'firebase_google' | 'demo'
  >('demo');
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const realtimeListenersRef = useRef<Set<(event: RealtimeEvent) => void>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    currencyRef.current = currency;
  }, [currency]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    const onPopState = () => {
      if (window.location.hash && window.location.hash.length > 1) {
        setRoute(normalizePath(window.location.hash));
      } else {
        setRoute((window.location.pathname || '/') + (window.location.search || ''));
      }
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onPopState);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2800);
  }, []);

  const navigate = useCallback((rawPath: string) => {
    const targetPath = normalizePath(rawPath);
    window.history.pushState({}, '', targetPath);
    setRoute(targetPath || '/');
    setCartOpen(false);
    setWishOpen(false);
    setSearchOpen(false);
    setAccountPanelOpen(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const apiFetch = useCallback(
    async <T = unknown>(url: string, options: RequestInit = {}): Promise<T> => {
      const headers = new Headers(options.headers || {});
      headers.set('x-cart-session', getSessionId());
      headers.set('x-currency', currencyRef.current);
      if (tokenRef.current) {
        headers.set('Authorization', `Bearer ${tokenRef.current}`);
      }
      if (
        options.body &&
        !(options.body instanceof FormData) &&
        !headers.has('Content-Type')
      ) {
        headers.set('Content-Type', 'application/json');
      }

      const res = await fetch(url, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      return data as T;
    },
    []
  );

  const refreshSiteContent = useCallback(async () => {
    try {
      const data = await apiFetch<SiteContent>('/api/site-content');
      const merged: SiteContent = {
        ...DEFAULT_SITE_CONTENT,
        ...data,
        headerNav:
          Array.isArray(data?.headerNav) && data.headerNav.length > 0
            ? data.headerNav
            : DEFAULT_SITE_CONTENT.headerNav,
        showcaseStages:
          Array.isArray(data?.showcaseStages) && data.showcaseStages.length > 0
            ? data.showcaseStages
            : DEFAULT_SITE_CONTENT.showcaseStages,
        sizeGuideRows: Array.isArray(data?.sizeGuideRows)
          ? data.sizeGuideRows
          : DEFAULT_SITE_CONTENT.sizeGuideRows,
        sizeGuideTips: Array.isArray(data?.sizeGuideTips)
          ? data.sizeGuideTips
          : DEFAULT_SITE_CONTENT.sizeGuideTips,
      };
      setSiteContent(merged);
      if (
        !currencyOverriddenRef.current &&
        (merged.currency === 'USD' || merged.currency === 'INR')
      ) {
        setCurrency(merged.currency);
      }
    } catch {
      // keep defaults
    }
  }, [apiFetch]);

  const refreshCatalog = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([
        apiFetch<ProductItem[]>('/api/products'),
        apiFetch<CategoryItem[]>('/api/categories'),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch {
      // keep current
    }
  }, [apiFetch]);

  const refreshCart = useCallback(async () => {
    try {
      const data = await apiFetch<CartState>('/api/cart');
      setCart(data);
    } catch {
      // keep existing
    }
  }, [apiFetch]);

  const refreshWishlist = useCallback(async () => {
    if (!tokenRef.current) {
      setWishlist([]);
      return;
    }
    try {
      const data = await apiFetch<WishlistRow[]>('/api/wishlist');
      setWishlist(data);
    } catch {
      setWishlist([]);
    }
  }, [apiFetch]);

  const refreshAuthConfig = useCallback(async () => {
    try {
      const cfg = await apiFetch<{
        googleLoginEnabled: boolean;
        googleClientId: string;
        mode: 'google_gis' | 'firebase_google' | 'demo';
      }>('/api/auth/config');
      setGoogleLoginEnabled(Boolean(cfg.googleLoginEnabled));
      setGoogleClientId(cfg.googleClientId || '');
      setGoogleAuthMode(cfg.mode || 'demo');
    } catch {
      // keep existing config
    }
  }, [apiFetch]);

  useEffect(() => {
    refreshSiteContent();
    refreshCatalog();
    refreshCart();
    refreshAuthConfig();
  }, [refreshSiteContent, refreshCatalog, refreshCart, refreshAuthConfig]);

  useEffect(() => {
    if (loginOpen) {
      void refreshAuthConfig();
    }
  }, [loginOpen, refreshAuthConfig]);

  const subscribeRealtime = useCallback(
    (listener: (event: RealtimeEvent) => void) => {
      realtimeListenersRef.current.add(listener);
      return () => {
        realtimeListenersRef.current.delete(listener);
      };
    },
    []
  );

  useEffect(() => {
    let disposed = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let retryDelay = 1000;
    let hasConnectedOnce = false;

    const connect = () => {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        ws = new WebSocket(wsUrl);
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        if (disposed) {
          ws?.close();
          return;
        }
        setWsConnected(true);
        retryDelay = 1000;
        if (hasConnectedOnce) {
          // Resync full state after reconnect
          void refreshSiteContent();
          void refreshCatalog();
          void refreshCart();
        }
        hasConnectedOnce = true;
      };

      ws.onmessage = (msg) => {
        try {
          const event = JSON.parse(msg.data) as RealtimeEvent;
          if (!event || !event.type) return;

          if (event.type === 'catalog:updated') {
            void refreshCatalog();
            void refreshCart();
          } else if (event.type === 'cms:updated') {
            currencyOverriddenRef.current = false;
            void refreshSiteContent();
            void refreshCart();
          } else if (event.type === 'coupons:updated') {
            void refreshCart();
          }

          realtimeListenersRef.current.forEach((fn) => {
            try {
              fn(event);
            } catch {
              // ignore individual listener errors
            }
          });
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (disposed) return;
        setWsConnected(false);
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer !== null) return;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        retryDelay = Math.min(15000, retryDelay * 2);
        connect();
      }, retryDelay);
    };

    connect();

    return () => {
      disposed = true;
      setWsConnected(false);
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close();
      }
    };
  }, [refreshCatalog, refreshSiteContent, refreshCart]);

  useEffect(() => {
    let active = true;
    const savedToken = window.sessionStorage.getItem('mf_auth_token');
    if (savedToken) {
      tokenRef.current = savedToken;
      setAuthToken(savedToken);
      apiFetch<{ user: UserProfile }>('/api/auth/me')
        .then(async (data) => {
          if (!active) return;
          setUser(data.user);
          await Promise.all([refreshCart(), refreshWishlist()]);
        })
        .catch(() => {
          if (!active) return;
          window.sessionStorage.removeItem('mf_auth_token');
          tokenRef.current = null;
          setAuthToken(null);
          setUser(null);
        })
        .finally(() => {
          if (active) setAuthLoading(false);
        });
    }

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      // Do not let Firebase overwrite an active local/admin session token
      if (window.sessionStorage.getItem('mf_auth_token')) {
        if (active) setAuthLoading(false);
        return;
      }
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          tokenRef.current = idToken;
          setAuthToken(idToken);
          const data = await apiFetch<{ user: UserProfile }>('/api/auth/session', {
            method: 'POST',
            body: JSON.stringify({ guestSessionId: getSessionId() }),
          });
          if (!active) return;
          setUser(data.user);
          await Promise.all([refreshCart(), refreshWishlist()]);
        } catch {
          if (!active) return;
          tokenRef.current = null;
          setAuthToken(null);
          setUser(null);
        }
      }
      if (active) setAuthLoading(false);
    });
    return () => {
      active = false;
      unsub();
    };
  }, [apiFetch, refreshCart, refreshWishlist]);

  const handleSetCurrency = useCallback((c: CurrencyCode) => {
    currencyOverriddenRef.current = true;
    setCurrency(c);
  }, []);

  const formatPrice = useCallback(
    (usdCents: number) =>
      formatMoney(usdCents, currency, siteContent.inrRate || 84),
    [currency, siteContent.inrRate]
  );

  const loginWithGoogle = useCallback(async () => {
    window.sessionStorage.removeItem('mf_auth_token');
    const cred = await signInWithPopup(auth, googleAuthProvider);
    const idToken = await cred.user.getIdToken();
    tokenRef.current = idToken;
    setAuthToken(idToken);
    const data = await apiFetch<{ user: UserProfile }>('/api/auth/session', {
      method: 'POST',
      body: JSON.stringify({ guestSessionId: getSessionId() }),
    });
    setUser(data.user);
    await Promise.all([refreshCart(), refreshWishlist()]);
    return data.user;
  }, [apiFetch, refreshCart, refreshWishlist]);

  const loginWithGoogleCredential = useCallback(
    async (credential: string) => {
      const data = await apiFetch<{ token: string; user: UserProfile }>(
        '/api/auth/google',
        {
          method: 'POST',
          body: JSON.stringify({ credential }),
        }
      );
      window.sessionStorage.setItem('mf_auth_token', data.token);
      tokenRef.current = data.token;
      setAuthToken(data.token);
      setUser(data.user);
      await apiFetch('/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({ guestSessionId: getSessionId() }),
      });
      await Promise.all([refreshCart(), refreshWishlist()]);
      return data.user;
    },
    [apiFetch, refreshCart, refreshWishlist]
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<{ token: string; user: UserProfile }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );
      window.sessionStorage.setItem('mf_auth_token', data.token);
      tokenRef.current = data.token;
      setAuthToken(data.token);
      setUser(data.user);
      await apiFetch('/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({ guestSessionId: getSessionId() }),
      });
      await Promise.all([refreshCart(), refreshWishlist()]);
      return data.user;
    },
    [apiFetch, refreshCart, refreshWishlist]
  );

  const loginAdmin = useCallback(
    async (email: string, password: string) => {
      try {
        await firebaseSignOut(auth);
      } catch {
        // ignore
      }
      const data = await apiFetch<{ token: string; user: UserProfile }>(
        '/api/auth/admin-login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );
      window.sessionStorage.setItem('mf_auth_token', data.token);
      tokenRef.current = data.token;
      setAuthToken(data.token);
      setUser(data.user);
      return data.user;
    },
    [apiFetch]
  );

  const registerWithEmail = useCallback(
    async (name: string, email: string, password: string, phone?: string) => {
      const data = await apiFetch<{ token: string; user: UserProfile }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ name, email, password, phone }),
        }
      );
      window.sessionStorage.setItem('mf_auth_token', data.token);
      tokenRef.current = data.token;
      setAuthToken(data.token);
      setUser(data.user);
      await apiFetch('/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({ guestSessionId: getSessionId() }),
      });
      await Promise.all([refreshCart(), refreshWishlist()]);
      return data.user;
    },
    [apiFetch, refreshCart, refreshWishlist]
  );

  const logout = useCallback(async () => {
    window.sessionStorage.removeItem('mf_auth_token');
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    tokenRef.current = null;
    setAuthToken(null);
    setUser(null);
    setWishlist([]);
    setAccountPanelOpen(false);
    await refreshCart();
  }, [refreshCart]);

  const refreshUser = useCallback(async () => {
    if (!tokenRef.current) return;
    const data = await apiFetch<{ user: UserProfile }>('/api/auth/me');
    setUser(data.user);
  }, [apiFetch]);

  const addToBag = useCallback(
    async (
      productId: number,
      variantId: number,
      quantity = 1,
      giftWrap?: boolean
    ) => {
      const next = await apiFetch<CartState>('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          variantId,
          quantity,
          ...(typeof giftWrap === 'boolean' ? { giftWrap } : {}),
        }),
      });
      setCart(next);
      showToast('Added to bag');
    },
    [apiFetch, showToast]
  );

  const quickAdd = useCallback(
    async (product: ProductItem) => {
      const firstVariant =
        product.variants.find((v) => v.isActive && v.stockQty > 0) ||
        product.variants[0];
      if (!firstVariant) {
        showToast('Variant unavailable');
        return;
      }
      await addToBag(product.id, firstVariant.id, 1);
    },
    [addToBag, showToast]
  );

  const updateBagQty = useCallback(
    async (itemId: number, quantity: number) => {
      const next = await apiFetch<CartState>(`/api/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      setCart(next);
    },
    [apiFetch]
  );

  const removeFromBag = useCallback(
    async (itemId: number) => {
      const next = await apiFetch<CartState>(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
      });
      setCart(next);
    },
    [apiFetch]
  );

  const setGiftWrap = useCallback(
    async (giftWrap: boolean) => {
      const next = await apiFetch<CartState>('/api/cart/gift-wrap', {
        method: 'PATCH',
        body: JSON.stringify({ giftWrap }),
      });
      setCart(next);
    },
    [apiFetch]
  );

  const applyCoupon = useCallback(
    async (code: string) => {
      const next = await apiFetch<CartState>('/api/cart/coupon', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      setCart(next);
      showToast(`Coupon ${code.toUpperCase()} applied`);
    },
    [apiFetch, showToast]
  );

  const removeCoupon = useCallback(async () => {
    const next = await apiFetch<CartState>('/api/cart/coupon', {
      method: 'DELETE',
    });
    setCart(next);
  }, [apiFetch]);

  const isWishlisted = useCallback(
    (productId: number) => wishlist.some((w) => w.productId === productId),
    [wishlist]
  );

  const toggleWishlist = useCallback(
    async (productId: number, variantId?: number) => {
      if (!tokenRef.current) {
        showToast('Sign in to save items to your wishlist');
        setLoginOpen(true);
        return false;
      }
      const res = await apiFetch<{ saved: boolean }>('/api/wishlist', {
        method: 'POST',
        body: JSON.stringify({ productId, variantId }),
      });
      await refreshWishlist();
      showToast(res.saved ? 'Saved to wishlist' : 'Removed from wishlist');
      return res.saved;
    },
    [apiFetch, refreshWishlist, showToast]
  );

  const shopByCategory = useCallback(
    (cat: string | null) => {
      setActiveShopCategory(cat);
      navigate('/shop');
    },
    [navigate]
  );

  const openProduct = useCallback(
    (slug: string) => {
      navigate(`/product/${slug}`);
    },
    [navigate]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toUpperCase();
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setCartOpen(false);
        setWishOpen(false);
        setLoginOpen(false);
        setAccountPanelOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        route,
        navigate,
        theme,
        toggleTheme,
        currency,
        setCurrency: handleSetCurrency,
        formatPrice,
        user,
        authLoading,
        authToken,
        googleLoginEnabled,
        googleClientId,
        googleAuthMode,
        refreshAuthConfig,
        apiFetch,
        loginWithGoogle,
        loginWithGoogleCredential,
        loginWithEmail,
        loginAdmin,
        registerWithEmail,
        logout,
        refreshUser,
        products,
        categories,
        refreshCatalog,
        activeShopCategory,
        setActiveShopCategory,
        shopByCategory,
        openProduct,
        cart,
        cartOpen,
        setCartOpen,
        wishOpen,
        setWishOpen,
        searchOpen,
        setSearchOpen,
        loginOpen,
        setLoginOpen,
        accountPanelOpen,
        setAccountPanelOpen,
        addToBag,
        quickAdd,
        updateBagQty,
        removeFromBag,
        setGiftWrap,
        applyCoupon,
        removeCoupon,
        refreshCart,
        wishlist,
        isWishlisted,
        toggleWishlist,
        refreshWishlist,
        siteContent,
        refreshSiteContent,
        wsConnected,
        subscribeRealtime,
        toast,
        showToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used inside StoreProvider');
  }
  return ctx;
}
