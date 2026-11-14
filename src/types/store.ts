export type CurrencyCode = 'USD' | 'INR';

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  name: string;
  phone: string;
  role: 'customer' | 'admin' | string;
}

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
}

export interface ProductImageItem {
  id: number;
  productId: number;
  url: string;
  altText: string;
  finishTag: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductVariantItem {
  id: number;
  productId: number;
  sku: string;
  finishName: string;
  finishCode: string;
  finishHex: string;
  sizeLabel: string;
  scaleFactor: string;
  priceCents: number;
  stockQty: number;
  isActive: boolean;
}

export interface ReviewItem {
  id: number;
  productId: number;
  userId: number | null;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  isVerified: boolean;
  createdAt: string;
}

export interface ProductItem {
  id: number;
  categoryId: number | null;
  category?: CategoryItem | null;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  basePriceCents: number;
  mrpCents: number | null;
  tag: string | null;
  iconKey: string;
  stone: string;
  occasion: string;
  careGuide: string;
  rating: string;
  reviewsCount: number;
  isFeatured: boolean;
  isActive: boolean;
  specs: Record<string, string>;
  images: ProductImageItem[];
  variants: ProductVariantItem[];
  reviews?: ReviewItem[];
  createdAt: string;
}

export interface CartItemRow {
  id: number;
  productId: number;
  variantId: number;
  quantity: number;
  productName: string;
  productSlug: string;
  iconKey: string;
  finishName: string;
  finishCode: string;
  finishHex: string;
  sizeLabel: string;
  priceCents: number;
  stockQty: number;
  imageUrl: string;
}

export interface CartState {
  id: number;
  items: CartItemRow[];
  couponCode: string | null;
  giftWrap: boolean;
  giftWrapCents: number;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
}

export interface WishlistRow {
  id: number;
  productId: number;
  variantId: number | null;
  product: ProductItem;
  variant: ProductVariantItem | null;
}

export interface AddressItem {
  id: number;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface OrderItemRow {
  id: number;
  productId: number | null;
  variantId: number | null;
  productName: string;
  variantLabel: string;
  imageUrl: string;
  unitPriceCents: number;
  quantity: number;
}

export interface TrackingEventItem {
  status: string;
  note: string;
  timestamp: string;
}

export interface OrderRecord {
  id: number;
  orderNumber: string;
  status: string;
  paymentMethod: 'COD_CASH' | 'COD_ONLINE' | string;
  paymentStatus: 'pending' | 'paid_on_delivery' | 'failed' | string;
  subtotalCents: number;
  discountCents: number;
  giftWrap?: boolean;
  giftWrapCents?: number;
  shippingCents: number;
  totalCents: number;
  couponCode: string | null;
  shippingAddress: {
    fullName: string;
    phone: string;
    email: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    addressType?: string;
  };
  trackingNotes: TrackingEventItem[];
  items: OrderItemRow[];
  createdAt: string;
}

export interface NavSubOption {
  id: string;
  label: string;
  route: string;
  categoryFilter?: string;
}

export interface HeaderNavOption {
  id: string;
  label: string;
  type: 'single' | 'dropdown';
  route: string;
  categoryFilter?: string;
  subOptions: NavSubOption[];
}

export interface ShowcaseStageItem {
  id: string;
  src: string;
  alt: string;
  title: string;
  sub: string;
}

export interface SizeGuideRow {
  usSize: string;
  ukSize: string;
  diameterMm: string;
  circumferenceMm: string;
}

export interface SiteContent {
  currency: CurrencyCode;
  inrRate: number;
  headerNav: HeaderNavOption[];
  heroEyebrow: string;
  heroHeadline: string;
  heroSubline: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  heroImage: string;
  aboutImage: string;
  showcaseStages: ShowcaseStageItem[];
  metricCold: string;
  metricColdLabel: string;
  metricHot: string;
  metricHotLabel: string;
  metricSteel: string;
  metricSteelLabel: string;
  storyEyebrow: string;
  storyHeadline: string;
  storyText: string;
  storyText2: string;
  newsletterOffer: string;
  newsletterSubtext: string;
  privacyPolicyText: string;
  termsPolicyText: string;
  giftWrapEnabled: boolean;
  giftWrapPriceCents: number;
  sizeGuideEnabled: boolean;
  sizeGuideTitle: string;
  sizeGuideIntro: string;
  sizeGuideRows: SizeGuideRow[];
  sizeGuideTips: string[];
  festivalBannerEnabled: boolean;
  festivalTitle: string;
  festivalSubtitle: string;
  festivalCtaLabel: string;
}

export type RealtimeEventType =
  | 'connected'
  | 'catalog:updated'
  | 'cms:updated'
  | 'orders:updated'
  | 'coupons:updated'
  | 'leads:updated';

export interface RealtimeEvent {
  type: RealtimeEventType;
  action?: string;
  orderNumber?: string;
  status?: string;
  paymentStatus?: string;
  productId?: number;
  categoryId?: number;
  couponId?: number;
  timestamp: string;
}
