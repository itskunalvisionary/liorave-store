import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  addresses,
  carts,
  categories,
  contactMessages,
  coupons,
  newsletterSubscribers,
  orders,
  payments,
  productImages,
  products,
  siteSettings,
  TrackingEvent,
  users,
  variants,
} from '../db/schema.ts';
import {
  addCartItem,
  calculateCouponDiscount,
  createOrderFromCart,
  createProductReview,
  findOrderByNumber,
  getAdminAnalytics,
  getCartDetails,
  getOrCreateCart,
  getProductBySlug,
  getSiteHomepageContent,
  listCategories,
  listProducts,
  listUserAddresses,
  listUserOrders,
  listUserWishlist,
  mergeGuestCartToUser,
  removeCartItem,
  setCartGiftWrap,
  toggleWishlistItem,
  updateCartItemQuantity,
} from '../db/repositories.ts';
import { ensureSeeded } from '../db/seed.ts';
import { signSessionToken } from '../lib/auth-token.ts';
import {
  getConfiguredAdminPassword,
  isConfiguredAdminEmail,
  verifyEnvAdminPassword,
} from '../lib/admin-env.ts';
import {
  forwardToGoogleSheet,
  getCloudinaryConfig,
  getGoogleAuthConfig,
  getGoogleSheetConfig,
} from '../lib/env.ts';
import {
  AuthRequest,
  getOrCreateFirebaseUser,
  optionalAuth,
  requireAdmin,
  requireAuth,
} from '../middleware/auth.ts';
import { broadcastRealtime } from '../lib/realtime.ts';

const router = express.Router();

const uploadDir = path.resolve(process.cwd(), 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

function getCartSessionId(req: Request): string {
  const header = req.headers['x-cart-session'];
  if (typeof header === 'string' && header.trim()) {
    return header.trim();
  }
  return 'guest-default';
}

const FINISH_HEX_MAP: Record<string, string> = {
  'Alpine Sage': '#48634B',
  'Basalt Black': '#222624',
  'Glacier Silver': '#B4BDB8',
};

function iconKeyForCategory(catName: string): string {
  const c = catName.toLowerCase();
  if (c.includes('wide')) return 'wide';
  if (c.includes('camp')) return 'camp';
  if (c.includes('access')) return 'accessory';
  return 'flask';
}

// ============================================================================
// PUBLIC SITE CONTENT, CATALOG & FORMS
// ============================================================================

router.get('/site-content', async (_req: Request, res: Response) => {
  try {
    const content = await getSiteHomepageContent();
    res.json(content);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load site content' });
  }
});

router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const list = await listCategories();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load categories' });
  }
});

router.get('/products', async (req: Request, res: Response) => {
  try {
    const list = await listProducts({
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      material: typeof req.query.material === 'string' ? req.query.material : undefined,
      stone: typeof req.query.stone === 'string' ? req.query.stone : undefined,
      occasion: typeof req.query.occasion === 'string' ? req.query.occasion : undefined,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      sort: typeof req.query.sort === 'string' ? req.query.sort : undefined,
    });
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load products' });
  }
});

router.get('/products/:slug', async (req: Request, res: Response) => {
  try {
    const product = await getProductBySlug(String(req.params.slug));
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load product' });
  }
});

router.post(
  '/products/:id/reviews',
  optionalAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const productId = Number(req.params.id);
      const { authorName, rating, title, body } = req.body ?? {};
      if (!Number.isFinite(productId) || !body || typeof body !== 'string') {
        res.status(400).json({ error: 'Review text and rating are required' });
        return;
      }
      const review = await createProductReview({
        productId,
        userId: req.authUser?.id,
        authorName:
          req.authUser?.name ||
          (typeof authorName === 'string' && authorName.trim()) ||
          'Verified Customer',
        rating: Number(rating) || 5,
        title: typeof title === 'string' ? title.trim() : '',
        body: body.trim(),
      });
      broadcastRealtime({ type: 'catalog:updated', action: 'review_created', productId });
      res.status(201).json(review);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to submit review' });
    }
  }
);

router.post('/newsletter', async (req: Request, res: Response) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid email address' });
      return;
    }
    await db
      .insert(newsletterSubscribers)
      .values({ email })
      .onConflictDoNothing();

    const sheetCfg = getGoogleSheetConfig();
    if (sheetCfg.dispatchUrl) {
      await forwardToGoogleSheet(sheetCfg.dispatchUrl, {
        type: 'field_dispatch',
        section: 'Field Dispatch',
        email,
        submittedAt: new Date().toISOString(),
      });
    }

    broadcastRealtime({
      type: 'leads:updated',
      action: 'newsletter_subscribed',
    });
    res.status(201).json({ subscribed: true, email });
  } catch {
    res.status(500).json({ error: 'Subscription failed' });
  }
});

router.post('/contact', async (req: Request, res: Response) => {
  try {
    const { name, email, message } = req.body ?? {};
    if (!name || !email || !message) {
      res.status(400).json({ error: 'Name, email, and message are required' });
      return;
    }
    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim();
    const cleanMessage = String(message).trim();
    const [inserted] = await db
      .insert(contactMessages)
      .values({
        name: cleanName,
        email: cleanEmail,
        message: cleanMessage,
      })
      .returning();

    const sheetCfg = getGoogleSheetConfig();
    if (sheetCfg.contactUrl) {
      await forwardToGoogleSheet(sheetCfg.contactUrl, {
        type: 'contact_message',
        section: 'Contact Section',
        id: inserted.id,
        name: cleanName,
        email: cleanEmail,
        message: cleanMessage,
        submittedAt: new Date().toISOString(),
      });
    }

    broadcastRealtime({
      type: 'leads:updated',
      action: 'contact_submitted',
    });
    res.status(201).json(inserted);
  } catch {
    res.status(500).json({ error: 'Failed to submit inquiry' });
  }
});

// ============================================================================
// AUTHENTICATION & USER PROFILE
// ============================================================================

router.get('/auth/config', (_req: Request, res: Response) => {
  const googleCfg = getGoogleAuthConfig();
  res.json(googleCfg);
});

router.post('/auth/google', async (req: Request, res: Response) => {
  try {
    await ensureSeeded();
    const googleCfg = getGoogleAuthConfig();
    if (!googleCfg.googleLoginEnabled) {
      res.status(403).json({ error: 'Google sign-in is not enabled in environment configuration' });
      return;
    }

    const credential = typeof req.body?.credential === 'string' ? req.body.credential.trim() : '';
    if (!credential) {
      res.status(400).json({ error: 'Google credential token is required' });
      return;
    }

    const verifyResp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!verifyResp.ok) {
      res.status(401).json({ error: 'Invalid Google credential' });
      return;
    }

    const payload = (await verifyResp.json()) as {
      sub?: string;
      email?: string;
      email_verified?: string | boolean;
      name?: string;
      aud?: string;
    };

    const emailVerified =
      payload.email_verified === true || payload.email_verified === 'true';
    if (!payload.email || !payload.sub || !emailVerified) {
      res.status(401).json({ error: 'Verified Google email is required' });
      return;
    }

    if (googleCfg.googleClientId && payload.aud !== googleCfg.googleClientId) {
      res.status(401).json({ error: 'Google Client ID mismatch' });
      return;
    }

    const customer = await getOrCreateFirebaseUser(
      `google_${payload.sub}`,
      payload.email,
      payload.name
    );

    const token = signSessionToken({
      uid: customer.uid,
      email: customer.email,
      role: 'customer',
      isAdminSession: false,
    });

    res.json({
      token,
      user: {
        ...customer,
        role: 'customer',
      },
    });
  } catch (err: any) {
    console.error('Google sign-in error:', err);
    res.status(500).json({ error: 'Google sign-in failed' });
  }
});

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    await ensureSeeded();
    const { name, email, password, phone } = req.body ?? {};
    if (
      typeof email !== 'string' ||
      !email.includes('@') ||
      typeof password !== 'string' ||
      password.length < 6
    ) {
      res.status(400).json({
        error: 'Valid email and password (at least 6 characters) are required',
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const uid = `local_${crypto.randomUUID()}`;
    const role = 'customer';

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        name:
          typeof name === 'string' && name.trim()
            ? name.trim()
            : normalizedEmail.split('@')[0],
        phone: typeof phone === 'string' ? phone.trim() : '',
        passwordHash,
        role,
      })
      .returning();

    const user = inserted[0];
    const token = signSessionToken({
      uid: user.uid,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    await ensureSeeded();
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (rows.length === 0 || !rows[0].passwordHash) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(password, rows[0].passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = rows[0];
    const token = signSessionToken({
      uid: user.uid,
      email: user.email,
      role: 'customer',
      isAdminSession: false,
    });

    res.json({
      token,
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: 'customer',
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/auth/admin-login', async (req: Request, res: Response) => {
  try {
    await ensureSeeded();
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!isConfiguredAdminEmail(normalizedEmail)) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const envPassword = getConfiguredAdminPassword();
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (envPassword) {
      if (!verifyEnvAdminPassword(password)) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
    } else {
      if (rows.length === 0 || !rows[0].passwordHash) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      const valid = await bcrypt.compare(password, rows[0].passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
    }

    let adminUser = rows[0];
    if (!adminUser) {
      const passwordHash = await bcrypt.hash(password, 10);
      const inserted = await db
        .insert(users)
        .values({
          uid: `admin_${crypto.randomUUID()}`,
          email: normalizedEmail,
          name: normalizedEmail.split('@')[0],
          phone: '',
          passwordHash,
          role: 'admin',
        })
        .returning();
      adminUser = inserted[0];
    } else if (adminUser.role !== 'admin') {
      const updated = await db
        .update(users)
        .set({ role: 'admin', updatedAt: new Date() })
        .where(eq(users.id, adminUser.id))
        .returning();
      adminUser = updated[0];
    }

    const token = signSessionToken({
      uid: adminUser.uid,
      email: adminUser.email,
      role: 'admin',
      isAdminSession: true,
    });

    res.json({
      token,
      user: {
        id: adminUser.id,
        uid: adminUser.uid,
        email: adminUser.email,
        name: adminUser.name,
        phone: adminUser.phone,
        role: 'admin',
      },
    });
  } catch (err: any) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Sign-in failed' });
  }
});

router.post('/auth/session', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const guestSessionId = req.body?.guestSessionId;
    if (typeof guestSessionId === 'string' && guestSessionId.trim()) {
      await mergeGuestCartToUser(guestSessionId.trim(), req.authUser!.id);
    }
    res.json({ user: req.authUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Session sync failed' });
  }
});

router.get('/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ user: req.authUser });
});

router.patch('/auth/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone } = req.body ?? {};
    const updated = await db
      .update(users)
      .set({
        name:
          typeof name === 'string' && name.trim()
            ? name.trim()
            : req.authUser!.name,
        phone: typeof phone === 'string' ? phone.trim() : req.authUser!.phone,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.authUser!.id))
      .returning();

    const u = updated[0];
    res.json({
      user: {
        id: u.id,
        uid: u.uid,
        email: u.email,
        name: u.name,
        phone: u.phone,
        role: u.role,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ============================================================================
// ADDRESSES
// ============================================================================

router.get('/addresses', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const list = await listUserAddresses(req.authUser!.id);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load addresses' });
  }
});

router.post('/addresses', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, phone, line1, line2, city, state, postalCode, country, isDefault } =
      req.body ?? {};
    if (!fullName || !phone || !line1 || !city || !state || !postalCode) {
      res.status(400).json({ error: 'Please complete all required address fields' });
      return;
    }
    if (isDefault) {
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, req.authUser!.id));
    }
    const inserted = await db
      .insert(addresses)
      .values({
        userId: req.authUser!.id,
        fullName: String(fullName).trim(),
        phone: String(phone).trim(),
        line1: String(line1).trim(),
        line2: typeof line2 === 'string' ? line2.trim() : '',
        city: String(city).trim(),
        state: String(state).trim(),
        postalCode: String(postalCode).trim(),
        country: typeof country === 'string' && country.trim() ? country.trim() : 'United States',
        isDefault: Boolean(isDefault),
      })
      .returning();
    res.status(201).json(inserted[0]);
  } catch {
    res.status(500).json({ error: 'Failed to save address' });
  }
});

router.delete('/addresses/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await db
      .delete(addresses)
      .where(
        and(
          eq(addresses.id, Number(req.params.id)),
          eq(addresses.userId, req.authUser!.id)
        )
      );
    res.json({ deleted: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

// ============================================================================
// CART & COUPONS
// ============================================================================

router.get('/cart', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cart = await getOrCreateCart(req.authUser?.id, getCartSessionId(req));
    const details = await getCartDetails(cart.id);
    res.json(details);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load bag' });
  }
});

router.post('/cart/items', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { productId, variantId, quantity, giftWrap } = req.body ?? {};
    if (!Number.isFinite(Number(productId)) || !Number.isFinite(Number(variantId))) {
      res.status(400).json({ error: 'Invalid product or variant' });
      return;
    }
    const cart = await getOrCreateCart(req.authUser?.id, getCartSessionId(req));
    const details = await addCartItem(
      cart.id,
      Number(productId),
      Number(variantId),
      Number(quantity) || 1,
      typeof giftWrap === 'boolean' ? giftWrap : undefined
    );
    res.json(details);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to add to bag' });
  }
});

router.patch('/cart/gift-wrap', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cart = await getOrCreateCart(req.authUser?.id, getCartSessionId(req));
    const details = await setCartGiftWrap(cart.id, Boolean(req.body?.giftWrap));
    res.json(details);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update gift wrap' });
  }
});

router.patch('/cart/items/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cart = await getOrCreateCart(req.authUser?.id, getCartSessionId(req));
    const details = await updateCartItemQuantity(
      cart.id,
      Number(req.params.id),
      Number(req.body?.quantity ?? 0)
    );
    res.json(details);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update bag' });
  }
});

router.delete('/cart/items/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cart = await getOrCreateCart(req.authUser?.id, getCartSessionId(req));
    const details = await removeCartItem(cart.id, Number(req.params.id));
    res.json(details);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to remove item' });
  }
});

router.post('/cart/coupon', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body ?? {};
    const cart = await getOrCreateCart(req.authUser?.id, getCartSessionId(req));
    const current = await getCartDetails(cart.id);
    const site = await getSiteHomepageContent();
    const inrRate = Number((site as any).inrRate) || 84;
    const reqCurrency =
      req.headers['x-currency'] === 'INR' || req.body?.currency === 'INR'
        ? 'INR'
        : req.headers['x-currency'] === 'USD' || req.body?.currency === 'USD'
        ? 'USD'
        : ((site as any).currency === 'USD' ? 'USD' : 'INR');

    const check = await calculateCouponDiscount(
      typeof code === 'string' ? code : '',
      current.subtotalCents,
      reqCurrency,
      inrRate
    );
    if (!check.valid) {
      res.status(400).json({ error: check.message || 'Invalid coupon code' });
      return;
    }
    await db
      .update(carts)
      .set({ couponCode: check.code, updatedAt: new Date() })
      .where(eq(carts.id, cart.id));
    const updated = await getCartDetails(cart.id);
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to apply coupon' });
  }
});

router.delete('/cart/coupon', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cart = await getOrCreateCart(req.authUser?.id, getCartSessionId(req));
    await db
      .update(carts)
      .set({ couponCode: null, updatedAt: new Date() })
      .where(eq(carts.id, cart.id));
    const updated = await getCartDetails(cart.id);
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to remove coupon' });
  }
});

router.post('/coupons/validate', async (req: Request, res: Response) => {
  try {
    const { code, subtotalCents } = req.body ?? {};
    const site = await getSiteHomepageContent();
    const inrRate = Number((site as any).inrRate) || 84;
    const reqCurrency =
      req.headers['x-currency'] === 'INR' || req.body?.currency === 'INR'
        ? 'INR'
        : req.headers['x-currency'] === 'USD' || req.body?.currency === 'USD'
        ? 'USD'
        : ((site as any).currency === 'USD' ? 'USD' : 'INR');

    const result = await calculateCouponDiscount(
      typeof code === 'string' ? code : '',
      Number(subtotalCents) || 0,
      reqCurrency,
      inrRate
    );
    if (!result.valid) {
      res.status(400).json({ error: result.message || 'Invalid coupon' });
      return;
    }
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

// ============================================================================
// WISHLIST
// ============================================================================

router.get('/wishlist', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const list = await listUserWishlist(req.authUser!.id);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load wishlist' });
  }
});

router.post('/wishlist', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { productId, variantId } = req.body ?? {};
    if (!Number.isFinite(Number(productId))) {
      res.status(400).json({ error: 'Invalid product' });
      return;
    }
    const result = await toggleWishlistItem(
      req.authUser!.id,
      Number(productId),
      variantId ? Number(variantId) : undefined
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update wishlist' });
  }
});

// ============================================================================
// CHECKOUT & ORDERS (ONLY COD: CASH ON DELIVERY OR ONLINE PAY ON DELIVERY)
// ============================================================================

router.post('/orders', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { paymentMethod, shippingAddress, couponCode } = req.body ?? {};
    const method = paymentMethod === 'COD_ONLINE' ? 'COD_ONLINE' : 'COD_CASH';

    if (
      !shippingAddress ||
      !shippingAddress.fullName ||
      !shippingAddress.phone ||
      !shippingAddress.line1 ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.postalCode
    ) {
      res
        .status(400)
        .json({ error: 'Please complete all shipping address fields' });
      return;
    }

    const cart = await getOrCreateCart(req.authUser?.id, getCartSessionId(req));
    const cartDetails = await getCartDetails(cart.id);

    const order = await createOrderFromCart({
      cartId: cart.id,
      userId: req.authUser?.id,
      paymentMethod: method,
      couponCode: couponCode || cartDetails.couponCode,
      shippingAddress: {
        fullName: String(shippingAddress.fullName).trim(),
        phone: String(shippingAddress.phone).trim(),
        email:
          typeof shippingAddress.email === 'string' && shippingAddress.email.trim()
            ? shippingAddress.email.trim()
            : req.authUser?.email || 'guest@liorave.com',
        line1: String(shippingAddress.line1).trim(),
        line2:
          typeof shippingAddress.line2 === 'string'
            ? shippingAddress.line2.trim()
            : '',
        city: String(shippingAddress.city).trim(),
        state: String(shippingAddress.state).trim(),
        postalCode: String(shippingAddress.postalCode).trim(),
        country:
          typeof shippingAddress.country === 'string' &&
          shippingAddress.country.trim()
            ? shippingAddress.country.trim()
            : 'United States',
        addressType:
          typeof shippingAddress.addressType === 'string'
            ? shippingAddress.addressType.trim()
            : 'Home',
      },
    });

    const fullOrder = await findOrderByNumber(order.orderNumber);
    broadcastRealtime({
      type: 'orders:updated',
      action: 'created',
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
    });
    broadcastRealtime({ type: 'catalog:updated', action: 'stock_decremented' });
    res.status(201).json(fullOrder);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Order creation failed' });
  }
});

router.get('/orders', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const list = await listUserOrders(req.authUser!.id);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load orders' });
  }
});

router.get('/orders/track/:orderNumber', async (req: Request, res: Response) => {
  try {
    const order = await findOrderByNumber(String(req.params.orderNumber));
    if (!order) {
      res.status(404).json({ error: 'Order not found. Check your order number.' });
      return;
    }
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to track order' });
  }
});

router.post(
  '/orders/:orderNumber/verify-payment',
  optionalAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const order = await findOrderByNumber(String(req.params.orderNumber));
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      if (order.paymentStatus === 'paid_on_delivery') {
        res.json(order);
        return;
      }
      const ref = `COD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const existingNotes = Array.isArray(order.trackingNotes)
        ? (order.trackingNotes as TrackingEvent[])
        : [];
      const nextNotes: TrackingEvent[] = [
        ...existingNotes,
        {
          status: order.status,
          note:
            order.paymentMethod === 'COD_ONLINE'
              ? `Online pay-on-delivery verified via UPI/Card (Ref: ${ref})`
              : `Cash on delivery settlement confirmed (Ref: ${ref})`,
          timestamp: new Date().toISOString(),
        },
      ];

      await db
        .update(orders)
        .set({
          paymentStatus: 'paid_on_delivery',
          trackingNotes: nextNotes,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      await db
        .update(payments)
        .set({
          status: 'completed',
          transactionRef: ref,
          paidAt: new Date(),
        })
        .where(eq(payments.orderId, order.id));

      const updated = await findOrderByNumber(order.orderNumber);
      broadcastRealtime({
        type: 'orders:updated',
        action: 'payment_verified',
        orderNumber: order.orderNumber,
        status: updated?.status,
        paymentStatus: updated?.paymentStatus,
      });
      res.json(updated);
    } catch {
      res.status(500).json({ error: 'Payment verification failed' });
    }
  }
);

// ============================================================================
// ADMIN DASHBOARD ROUTES (Protected strictly by requireAuth + requireAdmin)
// ============================================================================

router.get(
  '/admin/analytics',
  requireAuth,
  requireAdmin,
  async (_req: AuthRequest, res: Response) => {
    try {
      const stats = await getAdminAnalytics();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to load analytics' });
    }
  }
);

router.get(
  '/admin/products',
  requireAuth,
  requireAdmin,
  async (_req: AuthRequest, res: Response) => {
    try {
      const list = await listProducts({ includeInactive: true });
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to load products' });
    }
  }
);

router.post(
  '/admin/upload',
  requireAuth,
  requireAdmin,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'No image file chosen' });
        return;
      }

      const cloud = getCloudinaryConfig();

      if (cloud.configured) {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signParts: string[] = [];
        if (cloud.folder) {
          signParts.push(`folder=${cloud.folder}`);
        }
        signParts.push(`timestamp=${timestamp}`);
        const sigStr = `${signParts.join('&')}${cloud.apiSecret}`;
        const signature = crypto
          .createHash('sha1')
          .update(sigStr)
          .digest('hex');
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(file.buffer)], {
          type: file.mimetype,
        });
        formData.append('file', blob, file.originalname);
        formData.append('api_key', cloud.apiKey);
        formData.append('timestamp', timestamp);
        if (cloud.folder) {
          formData.append('folder', cloud.folder);
        }
        formData.append('signature', signature);

        const resp = await fetch(
          `https://api.cloudinary.com/v1_1/${cloud.cloudName}/image/upload`,
          { method: 'POST', body: formData }
        );
        if (resp.ok) {
          const data = (await resp.json()) as { secure_url?: string };
          if (data.secure_url) {
            res.json({ url: data.secure_url, provider: 'cloudinary' });
            return;
          }
        } else {
          const errText = await resp.text().catch(() => '');
          console.warn('Cloudinary upload failed, falling back to local storage:', resp.status, errText);
        }
      }

      const ext = path.extname(file.originalname) || '.png';
      const safeExt = /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(ext) ? ext : '.png';
      const filename = `mf-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExt}`;
      fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
      res.json({ url: `/uploads/${filename}`, provider: 'local' });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Image upload failed' });
    }
  }
);

router.post(
  '/admin/products',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        name,
        description,
        categoryId,
        categoryName,
        tag,
        stone,
        occasion,
        careGuide,
        rating,
        reviewsCount,
        price,
        mrp,
        currency,
        stock,
        sizes,
        materials,
        isActive,
        imageUrl,
      } = req.body ?? {};

      if (!name || !price) {
        res.status(400).json({ error: 'Product title and price are required' });
        return;
      }

      const site = await getSiteHomepageContent();
      const inrRate = Number((site as any).inrRate) || 84;
      const usdPrice =
        currency === 'INR' ? Number(price) / inrRate : Number(price);
      const usdMrp =
        mrp !== undefined && mrp !== null && mrp !== ''
          ? currency === 'INR'
            ? Number(mrp) / inrRate
            : Number(mrp)
          : null;

      let resolvedCatId = categoryId ? Number(categoryId) : null;
      let resolvedCatName = typeof categoryName === 'string' ? categoryName : 'Insulated Flasks';
      if (!resolvedCatId && categoryName) {
        const foundCat = await db
          .select()
          .from(categories)
          .where(eq(categories.name, String(categoryName)))
          .limit(1);
        if (foundCat[0]) {
          resolvedCatId = foundCat[0].id;
          resolvedCatName = foundCat[0].name;
        }
      }

      const finalSlug =
        String(name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') +
        '-' +
        Date.now().toString(36).slice(-4);

      const basePriceCents = Math.max(100, Math.round(usdPrice * 100));
      const mrpCents = usdMrp
        ? Math.max(basePriceCents, Math.round(usdMrp * 100))
        : null;
      const stockQty = Math.max(0, Number(stock ?? 12));
      const sizeList =
        Array.isArray(sizes) && sizes.length > 0 ? sizes : ['950 ml'];
      const matList =
        Array.isArray(materials) && materials.length > 0
          ? materials
          : ['Alpine Sage'];

      const created = await db.transaction(async (tx) => {
        const [prod] = await tx
          .insert(products)
          .values({
            name: String(name).trim(),
            slug: finalSlug,
            subtitle: `${resolvedCatName} · ${stone || '18/8 Stainless Steel'}`,
            description:
              typeof description === 'string' && description.trim()
                ? description.trim()
                : 'Double-wall vacuum insulated flask engineered for alpine and everyday carry.',
            categoryId: resolvedCatId,
            basePriceCents,
            mrpCents,
            tag: typeof tag === 'string' && tag.trim() ? tag.trim() : null,
            iconKey: iconKeyForCategory(resolvedCatName),
            stone: typeof stone === 'string' && stone.trim() ? stone.trim() : '18/8 Stainless Steel',
            occasion:
              typeof occasion === 'string' && occasion.trim()
                ? occasion.trim()
                : 'All-Day Carry',
            careGuide:
              typeof careGuide === 'string' && careGuide.trim()
                ? careGuide.trim()
                : 'Hand wash lid collar with warm soapy water. Vessel body is top-rack dishwasher safe.',
            rating: rating ? String(rating) : '4.9',
            reviewsCount: Number(reviewsCount ?? 0),
            isFeatured: tag === 'Bestseller' || tag === 'New',
            isActive: isActive !== false,
            specs: {
              Alloy: '18/8 Food-Grade Stainless Steel',
              Finish: matList.join(', '),
              Carry:
                typeof occasion === 'string' && occasion.trim()
                  ? occasion.trim()
                  : 'All-Day Carry',
              Thermal: '36h Cold / 18h Hot',
            },
          })
          .returning();

        if (typeof imageUrl === 'string' && imageUrl.trim()) {
          await tx.insert(productImages).values({
            productId: prod.id,
            url: imageUrl.trim(),
            altText: prod.name,
            sortOrder: 1,
            isPrimary: true,
          });
        }

        for (let m = 0; m < matList.length; m++) {
          const mat = String(matList[m]).trim();
          for (let s = 0; s < sizeList.length; s++) {
            const sz = String(sizeList[s]).trim();
            await tx.insert(variants).values({
              productId: prod.id,
              sku: `MF-${prod.id}-${m + 1}-${s + 1}-${Date.now().toString(36).slice(-3)}`,
              finishName: mat,
              finishCode: mat.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              finishHex: FINISH_HEX_MAP[mat] || '#48634B',
              sizeLabel: sz,
              scaleFactor: '1.0',
              priceCents: basePriceCents,
              stockQty,
              isActive: true,
            });
          }
        }

        return prod;
      });

      const full = await getProductBySlug(created.slug);
      broadcastRealtime({
        type: 'catalog:updated',
        action: 'product_created',
        productId: created.id,
      });
      res.status(201).json(full);
    } catch (err: any) {
      console.error('Admin create product error:', err);
      res.status(500).json({ error: err.message || 'Failed to create product' });
    }
  }
);

router.put(
  '/admin/products/:id',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const {
        name,
        description,
        categoryId,
        categoryName,
        tag,
        stone,
        occasion,
        careGuide,
        rating,
        reviewsCount,
        price,
        mrp,
        currency,
        stock,
        sizes,
        materials,
        isActive,
        imageUrl,
      } = req.body ?? {};

      const existing = await db
        .select()
        .from(products)
        .where(eq(products.id, id))
        .limit(1);
      if (existing.length === 0) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const site = await getSiteHomepageContent();
      const inrRate = Number((site as any).inrRate) || 84;

      let nextBaseCents = existing[0].basePriceCents;
      if (price !== undefined && price !== null && price !== '') {
        const usdPrice =
          currency === 'INR' ? Number(price) / inrRate : Number(price);
        nextBaseCents = Math.max(100, Math.round(usdPrice * 100));
      }

      let nextMrpCents = existing[0].mrpCents;
      if (mrp !== undefined) {
        if (mrp === null || mrp === '') {
          nextMrpCents = null;
        } else {
          const usdMrp =
            currency === 'INR' ? Number(mrp) / inrRate : Number(mrp);
          nextMrpCents = Math.round(usdMrp * 100);
        }
      }

      let resolvedCatId =
        categoryId !== undefined ? (categoryId ? Number(categoryId) : null) : existing[0].categoryId;
      let resolvedCatName = typeof categoryName === 'string' ? categoryName : '';
      if (!resolvedCatId && categoryName) {
        const foundCat = await db
          .select()
          .from(categories)
          .where(eq(categories.name, String(categoryName)))
          .limit(1);
        if (foundCat[0]) {
          resolvedCatId = foundCat[0].id;
          resolvedCatName = foundCat[0].name;
        }
      }

      await db.transaction(async (tx) => {
        await tx
          .update(products)
          .set({
            name: typeof name === 'string' && name.trim() ? name.trim() : existing[0].name,
            description:
              typeof description === 'string' ? description.trim() : existing[0].description,
            categoryId: resolvedCatId,
            basePriceCents: nextBaseCents,
            mrpCents: nextMrpCents,
            tag: tag !== undefined ? (tag ? String(tag).trim() : null) : existing[0].tag,
            iconKey: resolvedCatName ? iconKeyForCategory(resolvedCatName) : existing[0].iconKey,
            stone: typeof stone === 'string' && stone.trim() ? stone.trim() : existing[0].stone,
            occasion:
              typeof occasion === 'string' && occasion.trim()
                ? occasion.trim()
                : existing[0].occasion,
            careGuide:
              typeof careGuide === 'string' ? careGuide.trim() : existing[0].careGuide,
            rating: rating !== undefined ? String(rating) : existing[0].rating,
            reviewsCount:
              reviewsCount !== undefined ? Number(reviewsCount) : existing[0].reviewsCount,
            isActive: typeof isActive === 'boolean' ? isActive : existing[0].isActive,
            updatedAt: new Date(),
          })
          .where(eq(products.id, id));

        if (imageUrl !== undefined) {
          await tx.delete(productImages).where(eq(productImages.productId, id));
          if (typeof imageUrl === 'string' && imageUrl.trim()) {
            await tx.insert(productImages).values({
              productId: id,
              url: imageUrl.trim(),
              altText: typeof name === 'string' && name.trim() ? name.trim() : existing[0].name,
              sortOrder: 1,
              isPrimary: true,
            });
          }
        }

        if (Array.isArray(sizes) || Array.isArray(materials)) {
          const matList =
            Array.isArray(materials) && materials.length > 0
              ? materials
              : ['Alpine Sage'];
          const sizeList =
            Array.isArray(sizes) && sizes.length > 0 ? sizes : ['950 ml'];
          const stockQty = stock !== undefined ? Math.max(0, Number(stock)) : 12;

          await tx.delete(variants).where(eq(variants.productId, id));
          for (let m = 0; m < matList.length; m++) {
            const mat = String(matList[m]).trim();
            for (let s = 0; s < sizeList.length; s++) {
              const sz = String(sizeList[s]).trim();
              await tx.insert(variants).values({
                productId: id,
                sku: `MF-${id}-${m + 1}-${s + 1}-${Date.now().toString(36).slice(-3)}`,
                finishName: mat,
                finishCode: mat.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                finishHex: FINISH_HEX_MAP[mat] || '#48634B',
                sizeLabel: sz,
                scaleFactor: '1.0',
                priceCents: nextBaseCents,
                stockQty,
                isActive: true,
              });
            }
          }
        } else if (price !== undefined || stock !== undefined) {
          const updateData: Record<string, unknown> = {};
          if (price !== undefined) updateData.priceCents = nextBaseCents;
          if (stock !== undefined) updateData.stockQty = Math.max(0, Number(stock));
          if (Object.keys(updateData).length > 0) {
            await tx.update(variants).set(updateData).where(eq(variants.productId, id));
          }
        }
      });

      const full = await getProductBySlug(existing[0].slug);
      broadcastRealtime({
        type: 'catalog:updated',
        action: 'product_updated',
        productId: id,
      });
      res.json(full);
    } catch (err: any) {
      console.error('Admin update product error:', err);
      res.status(500).json({ error: err.message || 'Failed to update product' });
    }
  }
);

router.delete(
  '/admin/products/:id',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const productId = Number(req.params.id);
      await db.delete(products).where(eq(products.id, productId));
      broadcastRealtime({
        type: 'catalog:updated',
        action: 'product_deleted',
        productId,
      });
      res.json({ deleted: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }
);

router.post(
  '/admin/categories',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, description, imageUrl } = req.body ?? {};
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Category name is required' });
        return;
      }
      const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const [created] = await db
        .insert(categories)
        .values({
          name: name.trim(),
          slug: `${slug}-${Date.now().toString(36).slice(-3)}`,
          description: typeof description === 'string' ? description.trim() : '',
          imageUrl: typeof imageUrl === 'string' ? imageUrl.trim() : '',
          sortOrder: 10,
        })
        .returning();
      broadcastRealtime({
        type: 'catalog:updated',
        action: 'category_created',
        categoryId: created.id,
      });
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create category' });
    }
  }
);

router.put(
  '/admin/categories/:id',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { name, description, imageUrl } = req.body ?? {};
      const existing = await db
        .select()
        .from(categories)
        .where(eq(categories.id, id))
        .limit(1);
      if (existing.length === 0) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }
      const [updated] = await db
        .update(categories)
        .set({
          name:
            typeof name === 'string' && name.trim()
              ? name.trim()
              : existing[0].name,
          description:
            typeof description === 'string'
              ? description.trim()
              : existing[0].description,
          imageUrl:
            imageUrl !== undefined
              ? typeof imageUrl === 'string'
                ? imageUrl.trim()
                : ''
              : existing[0].imageUrl,
        })
        .where(eq(categories.id, id))
        .returning();
      broadcastRealtime({
        type: 'catalog:updated',
        action: 'category_updated',
        categoryId: id,
      });
      res.json(updated);
    } catch {
      res.status(500).json({ error: 'Failed to update category' });
    }
  }
);

router.delete(
  '/admin/categories/:id',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const categoryId = Number(req.params.id);
      await db.delete(categories).where(eq(categories.id, categoryId));
      broadcastRealtime({
        type: 'catalog:updated',
        action: 'category_deleted',
        categoryId,
      });
      res.json({ deleted: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete category' });
    }
  }
);

router.get(
  '/admin/orders',
  requireAuth,
  requireAdmin,
  async (_req: AuthRequest, res: Response) => {
    try {
      const list = await db.query.orders.findMany({
        with: {
          items: true,
          payments: true,
          user: {
            columns: { id: true, email: true, name: true },
          },
        },
        orderBy: [desc(orders.createdAt)],
      });
      res.json(list);
    } catch {
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }
);

router.patch(
  '/admin/orders/:id',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { status, paymentStatus, note } = req.body ?? {};
      const existing = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);
      if (existing.length === 0) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      const currentNotes = Array.isArray(existing[0].trackingNotes)
        ? (existing[0].trackingNotes as TrackingEvent[])
        : [];
      const nextStatus = typeof status === 'string' ? status : existing[0].status;
      const nextPayStatus =
        typeof paymentStatus === 'string'
          ? paymentStatus
          : existing[0].paymentStatus;

      const updatedNotes =
        note || status
          ? [
              ...currentNotes,
              {
                status: nextStatus,
                note:
                  typeof note === 'string' && note.trim()
                    ? note.trim()
                    : `Order status updated to ${nextStatus}`,
                timestamp: new Date().toISOString(),
              },
            ]
          : currentNotes;

      const [updated] = await db
        .update(orders)
        .set({
          status: nextStatus,
          paymentStatus: nextPayStatus,
          trackingNotes: updatedNotes,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id))
        .returning();

      if (nextPayStatus === 'paid_on_delivery') {
        await db
          .update(payments)
          .set({ status: 'completed', paidAt: new Date() })
          .where(eq(payments.orderId, id));
      }

      broadcastRealtime({
        type: 'orders:updated',
        action: 'updated',
        orderNumber: updated.orderNumber,
        status: updated.status,
        paymentStatus: updated.paymentStatus,
      });
      res.json(updated);
    } catch {
      res.status(500).json({ error: 'Failed to update order' });
    }
  }
);

router.get(
  '/admin/customers',
  requireAuth,
  requireAdmin,
  async (_req: AuthRequest, res: Response) => {
    try {
      const userRows = await db
        .select({
          id: users.id,
          uid: users.uid,
          email: users.email,
          name: users.name,
          phone: users.phone,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt));

      const orderCounts = await db
        .select({
          userId: orders.userId,
          count: sql<number>`count(*)::int`,
        })
        .from(orders)
        .groupBy(orders.userId);

      const countMap = new Map(orderCounts.map((r) => [r.userId, r.count]));
      res.json(
        userRows.map((u) => ({
          ...u,
          ordersCount: countMap.get(u.id) ?? 0,
        }))
      );
    } catch {
      res.status(500).json({ error: 'Failed to load customers' });
    }
  }
);

router.patch(
  '/admin/customers/:id/role',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const role = req.body?.role === 'admin' ? 'admin' : 'customer';
      const [updated] = await db
        .update(users)
        .set({ role, updatedAt: new Date() })
        .where(eq(users.id, Number(req.params.id)))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
        });
      res.json(updated);
    } catch {
      res.status(500).json({ error: 'Failed to update role' });
    }
  }
);

router.get(
  '/admin/coupons',
  requireAuth,
  requireAdmin,
  async (_req: AuthRequest, res: Response) => {
    try {
      const list = await db
        .select()
        .from(coupons)
        .orderBy(desc(coupons.createdAt));
      res.json(list);
    } catch {
      res.status(500).json({ error: 'Failed to load coupons' });
    }
  }
);

router.post(
  '/admin/coupons',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        code,
        discountType,
        discountValue,
        currency,
        minOrderAmount,
        minOrderDollars,
        minOrderRupees,
        maxUses,
      } = req.body ?? {};
      if (!code || discountValue === undefined || discountValue === null || Number(discountValue) <= 0) {
        res.status(400).json({ error: 'Code and discount value are required' });
        return;
      }

      const site = await getSiteHomepageContent();
      const inrRate = Number((site as any).inrRate) || 84;
      const inputCurrency =
        currency === 'INR' || (minOrderRupees !== undefined && currency !== 'USD')
          ? 'INR'
          : 'USD';

      const rawDiscount = Number(discountValue);
      const val =
        discountType === 'fixed'
          ? Math.max(
              1,
              Math.round(
                (inputCurrency === 'INR' ? rawDiscount / inrRate : rawDiscount) * 100
              )
            )
          : Math.max(1, Math.min(100, Math.round(rawDiscount)));

      const rawMin =
        minOrderAmount !== undefined && minOrderAmount !== null && minOrderAmount !== ''
          ? Number(minOrderAmount)
          : inputCurrency === 'INR'
          ? Number(minOrderRupees ?? 0)
          : Number(minOrderDollars ?? 0);

      const minOrderCents =
        rawMin > 0
          ? Math.round((inputCurrency === 'INR' ? rawMin / inrRate : rawMin) * 100)
          : 0;

      const inserted = await db
        .insert(coupons)
        .values({
          code: String(code).trim().toUpperCase(),
          discountType: discountType === 'fixed' ? 'fixed' : 'percent',
          discountValue: val,
          minOrderCents,
          maxUses: maxUses ? Number(maxUses) : null,
          isActive: true,
        })
        .returning();
      broadcastRealtime({
        type: 'coupons:updated',
        action: 'created',
        couponId: inserted[0].id,
      });
      res.status(201).json(inserted[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create coupon' });
    }
  }
);

router.patch(
  '/admin/coupons/:id',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const couponId = Number(req.params.id);
      const [updated] = await db
        .update(coupons)
        .set({ isActive: Boolean(req.body?.isActive) })
        .where(eq(coupons.id, couponId))
        .returning();
      broadcastRealtime({
        type: 'coupons:updated',
        action: 'updated',
        couponId,
      });
      res.json(updated);
    } catch {
      res.status(500).json({ error: 'Failed to update coupon' });
    }
  }
);

router.delete(
  '/admin/coupons/:id',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const couponId = Number(req.params.id);
      await db.delete(coupons).where(eq(coupons.id, couponId));
      broadcastRealtime({
        type: 'coupons:updated',
        action: 'deleted',
        couponId,
      });
      res.json({ deleted: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete coupon' });
    }
  }
);

router.put(
  '/admin/site-content',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        res.status(400).json({ error: 'Invalid content payload' });
        return;
      }
      const current = await getSiteHomepageContent();
      const merged = { ...current, ...payload };
      await db
        .insert(siteSettings)
        .values({
          key: 'homepage',
          value: merged,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: { value: merged, updatedAt: new Date() },
        });
      broadcastRealtime({ type: 'cms:updated', action: 'site_content_updated' });
      res.json(merged);
    } catch {
      res.status(500).json({ error: 'Failed to save homepage content' });
    }
  }
);

export default router;
