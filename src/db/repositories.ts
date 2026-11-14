import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  addresses,
  cartItems,
  carts,
  categories,
  contactMessages,
  coupons,
  newsletterSubscribers,
  orderItems,
  orders,
  payments,
  products,
  reviews,
  ShippingAddressSnapshot,
  TrackingEvent,
  users,
  variants,
  wishlists,
} from './schema.ts';
import { ensureSeeded, getSiteHomepageContent } from './seed.ts';

function wrapDbError(message: string, cause: unknown): Error {
  console.error(message, cause);
  return new Error(message, { cause });
}

export async function listCategories() {
  try {
    await ensureSeeded();
    return await db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.id));
  } catch (err) {
    throw wrapDbError('Failed to fetch categories', err);
  }
}

export interface ProductFilterParams {
  category?: string;
  q?: string;
  material?: string; // comma-separated
  stone?: string; // comma-separated
  occasion?: string; // comma-separated
  minPrice?: number; // in INR rupees
  maxPrice?: number; // in INR rupees
  sort?: string;
  includeInactive?: boolean;
}

export async function listProducts(filters: ProductFilterParams = {}) {
  try {
    await ensureSeeded();
    const allProducts = await db.query.products.findMany({
      where: filters.includeInactive ? undefined : eq(products.isActive, true),
      with: {
        category: true,
        images: {
          orderBy: (img, { asc }) => [asc(img.sortOrder)],
        },
        variants: {
          orderBy: (v, { asc }) => [asc(v.priceCents)],
        },
        reviews: {
          orderBy: (r, { desc }) => [desc(r.createdAt)],
        },
      },
      orderBy: [desc(products.isFeatured), asc(products.id)],
    });

    let result = allProducts;

    if (filters.category && filters.category !== 'all') {
      const catTerm = filters.category.toLowerCase();
      result = result.filter(
        (p) =>
          p.category?.slug.toLowerCase() === catTerm ||
          p.category?.name.toLowerCase() === catTerm
      );
    }

    if (filters.q && filters.q.trim()) {
      const query = filters.q.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.subtitle.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.stone.toLowerCase().includes(query) ||
          p.occasion.toLowerCase().includes(query) ||
          p.category?.name.toLowerCase().includes(query) ||
          p.variants.some(
            (v) =>
              v.finishName.toLowerCase().includes(query) ||
              v.sizeLabel.toLowerCase().includes(query) ||
              v.sku.toLowerCase().includes(query)
          )
      );
    }

    if (filters.material && filters.material.trim()) {
      const mats = filters.material
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (mats.length > 0) {
        result = result.filter((p) =>
          p.variants.some(
            (v) =>
              v.isActive &&
              mats.some((m) => v.finishName.toLowerCase().includes(m))
          )
        );
      }
    }

    if (filters.stone && filters.stone.trim()) {
      const stones = filters.stone
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (stones.length > 0) {
        result = result.filter((p) =>
          stones.some((st) => p.stone.toLowerCase().includes(st))
        );
      }
    }

    if (filters.occasion && filters.occasion.trim()) {
      const occs = filters.occasion
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (occs.length > 0) {
        result = result.filter((p) =>
          occs.some((oc) => p.occasion.toLowerCase().includes(oc))
        );
      }
    }

    if (typeof filters.minPrice === 'number' && !Number.isNaN(filters.minPrice)) {
      const minCents = filters.minPrice * 100;
      result = result.filter((p) => {
        const minVar = p.variants.length
          ? Math.min(...p.variants.map((v) => v.priceCents))
          : p.basePriceCents;
        return minVar >= minCents;
      });
    }

    if (typeof filters.maxPrice === 'number' && !Number.isNaN(filters.maxPrice)) {
      const maxCents = filters.maxPrice * 100;
      result = result.filter((p) => {
        const minVar = p.variants.length
          ? Math.min(...p.variants.map((v) => v.priceCents))
          : p.basePriceCents;
        return minVar <= maxCents;
      });
    }

    if (filters.sort === 'price_asc') {
      result = [...result].sort((a, b) => a.basePriceCents - b.basePriceCents);
    } else if (filters.sort === 'price_desc') {
      result = [...result].sort((a, b) => b.basePriceCents - a.basePriceCents);
    } else if (filters.sort === 'newest') {
      result = [...result].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (filters.sort === 'popularity') {
      result = [...result].sort((a, b) => b.reviewsCount - a.reviewsCount);
    }

    return result;
  } catch (err) {
    throw wrapDbError('Failed to fetch products', err);
  }
}

export async function getProductBySlug(slug: string) {
  try {
    await ensureSeeded();
    const product = await db.query.products.findFirst({
      where: eq(products.slug, slug),
      with: {
        category: true,
        images: {
          orderBy: (img, { asc }) => [asc(img.sortOrder)],
        },
        variants: {
          orderBy: (v, { asc }) => [asc(v.priceCents)],
        },
        reviews: {
          orderBy: (r, { desc }) => [desc(r.createdAt)],
        },
      },
    });
    return product ?? null;
  } catch (err) {
    throw wrapDbError('Failed to fetch product details', err);
  }
}

export async function createProductReview(input: {
  productId: number;
  userId?: number;
  authorName: string;
  rating: number;
  title: string;
  body: string;
}) {
  try {
    const ratingVal = Math.max(1, Math.min(5, Math.round(input.rating)));
    const inserted = await db
      .insert(reviews)
      .values({
        productId: input.productId,
        userId: input.userId ?? null,
        authorName: input.authorName,
        rating: ratingVal,
        title: input.title,
        body: input.body,
        isVerified: Boolean(input.userId),
      })
      .returning();

    await db
      .update(products)
      .set({
        reviewsCount: sql`${products.reviewsCount} + 1`,
      })
      .where(eq(products.id, input.productId));

    return inserted[0];
  } catch (err) {
    throw wrapDbError('Failed to save review', err);
  }
}

export async function getOrCreateCart(userId?: number, sessionId?: string) {
  try {
    await ensureSeeded();
    if (userId) {
      const existing = await db
        .select()
        .from(carts)
        .where(eq(carts.userId, userId))
        .limit(1);
      if (existing.length > 0) return existing[0];
      const created = await db.insert(carts).values({ userId }).returning();
      return created[0];
    }

    if (sessionId) {
      const existing = await db
        .select()
        .from(carts)
        .where(eq(carts.sessionId, sessionId))
        .limit(1);
      if (existing.length > 0) return existing[0];
      const created = await db.insert(carts).values({ sessionId }).returning();
      return created[0];
    }

    throw new Error('Cart identifier missing');
  } catch (err) {
    throw wrapDbError('Failed to load cart', err);
  }
}

export async function calculateCouponDiscount(
  code: string | null | undefined,
  subtotalCents: number,
  displayCurrency: 'USD' | 'INR' = 'USD',
  inrRate = 84
): Promise<{
  valid: boolean;
  code: string | null;
  discountCents: number;
  message?: string;
  couponId?: number;
}> {
  if (!code || !code.trim()) {
    return { valid: false, code: null, discountCents: 0 };
  }
  const normalized = code.trim().toUpperCase();
  const rows = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, normalized))
    .limit(1);

  if (rows.length === 0) {
    return {
      valid: false,
      code: null,
      discountCents: 0,
      message: 'Coupon code not found',
    };
  }

  const coupon = rows[0];
  if (!coupon.isActive) {
    return {
      valid: false,
      code: null,
      discountCents: 0,
      message: 'This coupon is no longer active',
    };
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return {
      valid: false,
      code: null,
      discountCents: 0,
      message: 'This coupon has expired',
    };
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return {
      valid: false,
      code: null,
      discountCents: 0,
      message: 'This coupon has reached its usage limit',
    };
  }
  if (subtotalCents < coupon.minOrderCents) {
    const formattedMin =
      displayCurrency === 'INR'
        ? `₹${Math.round((coupon.minOrderCents / 100) * Math.max(1, inrRate)).toLocaleString('en-IN')}`
        : `$${Math.round(coupon.minOrderCents / 100)}`;
    return {
      valid: false,
      code: null,
      discountCents: 0,
      message: `Minimum order of ${formattedMin} required`,
    };
  }

  let discountCents = 0;
  if (coupon.discountType === 'percent') {
    discountCents = Math.round((subtotalCents * coupon.discountValue) / 100);
  } else {
    discountCents = Math.min(subtotalCents, coupon.discountValue);
  }

  return {
    valid: true,
    code: coupon.code,
    discountCents,
    couponId: coupon.id,
  };
}

export async function getCartDetails(cartId: number) {
  try {
    const cartRow = await db
      .select()
      .from(carts)
      .where(eq(carts.id, cartId))
      .limit(1);
    if (cartRow.length === 0) {
      return {
        id: cartId,
        items: [],
        couponCode: null,
        giftWrap: false,
        giftWrapCents: 0,
        subtotalCents: 0,
        discountCents: 0,
        shippingCents: 0,
        totalCents: 0,
      };
    }

    const items = await db.query.cartItems.findMany({
      where: eq(cartItems.cartId, cartId),
      with: {
        product: {
          with: {
            images: {
              orderBy: (img, { asc }) => [asc(img.sortOrder)],
            },
          },
        },
        variant: true,
      },
      orderBy: [asc(cartItems.id)],
    });

    const formatted = items
      .filter((i) => i.product && i.variant)
      .map((i) => ({
        id: i.id,
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
        productName: i.product.name,
        productSlug: i.product.slug,
        iconKey: i.product.iconKey,
        finishName: i.variant.finishName,
        finishCode: i.variant.finishCode,
        finishHex: i.variant.finishHex,
        sizeLabel: i.variant.sizeLabel,
        priceCents: i.variant.priceCents,
        stockQty: i.variant.stockQty,
        imageUrl: i.product.images[0]?.url ?? '',
      }));

    const subtotalCents = formatted.reduce(
      (sum, item) => sum + item.priceCents * item.quantity,
      0
    );

    const site = (await getSiteHomepageContent()) as Record<string, unknown>;
    const giftWrapAvailable = site.giftWrapEnabled !== false;
    const configuredGiftWrapCents = Math.max(
      0,
      Number(site.giftWrapPriceCents ?? 500) || 0
    );

    const couponResult = await calculateCouponDiscount(
      cartRow[0].couponCode,
      subtotalCents
    );
    const discountCents = couponResult.valid ? couponResult.discountCents : 0;
    const activeCoupon = couponResult.valid ? couponResult.code : null;
    const giftWrap =
      giftWrapAvailable && formatted.length > 0 && Boolean(cartRow[0].giftWrap);
    const giftWrapCents = giftWrap ? configuredGiftWrapCents : 0;
    const shippingCents = 0;
    const totalCents = Math.max(
      0,
      subtotalCents - discountCents + shippingCents + giftWrapCents
    );

    return {
      id: cartRow[0].id,
      items: formatted,
      couponCode: activeCoupon,
      giftWrap,
      giftWrapCents,
      subtotalCents,
      discountCents,
      shippingCents,
      totalCents,
    };
  } catch (err) {
    throw wrapDbError('Failed to retrieve cart details', err);
  }
}

export async function addCartItem(
  cartId: number,
  productId: number,
  variantId: number,
  quantity: number,
  giftWrap?: boolean
) {
  try {
    const variantRows = await db
      .select()
      .from(variants)
      .where(and(eq(variants.id, variantId), eq(variants.productId, productId)))
      .limit(1);

    if (variantRows.length === 0 || !variantRows[0].isActive) {
      throw new Error('Selected variant is unavailable');
    }

    const existing = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cartId),
          eq(cartItems.productId, productId),
          eq(cartItems.variantId, variantId)
        )
      )
      .limit(1);

    const requestedQty = Math.max(1, quantity);
    if (existing.length > 0) {
      const nextQty = Math.min(
        Math.max(1, variantRows[0].stockQty),
        existing[0].quantity + requestedQty
      );
      await db
        .update(cartItems)
        .set({ quantity: nextQty })
        .where(eq(cartItems.id, existing[0].id));
    } else {
      if (variantRows[0].stockQty <= 0) {
        throw new Error('Currently out of stock');
      }
      const clampedQty = Math.min(variantRows[0].stockQty, requestedQty);
      await db.insert(cartItems).values({
        cartId,
        productId,
        variantId,
        quantity: clampedQty,
      });
    }

    if (typeof giftWrap === 'boolean') {
      const site = (await getSiteHomepageContent()) as Record<string, unknown>;
      const giftWrapAvailable = site.giftWrapEnabled !== false;
      const nextGiftWrap = giftWrapAvailable ? giftWrap : false;
      await db
        .update(carts)
        .set({ giftWrap: nextGiftWrap, updatedAt: new Date() })
        .where(eq(carts.id, cartId));
    }

    return await getCartDetails(cartId);
  } catch (err) {
    throw wrapDbError(
      err instanceof Error ? err.message : 'Failed to add piece to bag',
      err
    );
  }
}

export async function setCartGiftWrap(cartId: number, giftWrap: boolean) {
  try {
    const site = (await getSiteHomepageContent()) as Record<string, unknown>;
    const giftWrapAvailable = site.giftWrapEnabled !== false;
    const nextGiftWrap = giftWrapAvailable ? Boolean(giftWrap) : false;
    await db
      .update(carts)
      .set({ giftWrap: nextGiftWrap, updatedAt: new Date() })
      .where(eq(carts.id, cartId));
    return await getCartDetails(cartId);
  } catch (err) {
    throw wrapDbError('Failed to update gift wrap option', err);
  }
}

export async function updateCartItemQuantity(
  cartId: number,
  itemId: number,
  quantity: number
) {
  try {
    if (quantity <= 0) {
      await db
        .delete(cartItems)
        .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
    } else {
      await db
        .update(cartItems)
        .set({ quantity })
        .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
    }
    return await getCartDetails(cartId);
  } catch (err) {
    throw wrapDbError('Failed to update bag', err);
  }
}

export async function removeCartItem(cartId: number, itemId: number) {
  try {
    await db
      .delete(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
    return await getCartDetails(cartId);
  } catch (err) {
    throw wrapDbError('Failed to remove piece from bag', err);
  }
}

export async function mergeGuestCartToUser(sessionId: string, userId: number) {
  try {
    const guestCart = await db
      .select()
      .from(carts)
      .where(eq(carts.sessionId, sessionId))
      .limit(1);
    if (guestCart.length === 0) return;

    const userCart = await getOrCreateCart(userId);
    const guestItems = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, guestCart[0].id));

    for (const item of guestItems) {
      await addCartItem(
        userCart.id,
        item.productId,
        item.variantId,
        item.quantity
      );
    }

    if (guestCart[0].giftWrap) {
      await db
        .update(carts)
        .set({ giftWrap: true, updatedAt: new Date() })
        .where(eq(carts.id, userCart.id));
    }

    await db.delete(carts).where(eq(carts.id, guestCart[0].id));
  } catch (err) {
    throw wrapDbError('Failed to merge guest bag', err);
  }
}

export async function listUserWishlist(userId: number) {
  try {
    await ensureSeeded();
    return await db.query.wishlists.findMany({
      where: eq(wishlists.userId, userId),
      with: {
        product: {
          with: {
            images: {
              orderBy: (img, { asc }) => [asc(img.sortOrder)],
            },
            variants: true,
          },
        },
        variant: true,
      },
      orderBy: [desc(wishlists.createdAt)],
    });
  } catch (err) {
    throw wrapDbError('Failed to fetch wishlist', err);
  }
}

export async function toggleWishlistItem(
  userId: number,
  productId: number,
  variantId?: number
) {
  try {
    const existing = await db
      .select()
      .from(wishlists)
      .where(
        and(eq(wishlists.userId, userId), eq(wishlists.productId, productId))
      )
      .limit(1);

    if (existing.length > 0) {
      await db.delete(wishlists).where(eq(wishlists.id, existing[0].id));
      return { saved: false };
    }

    await db.insert(wishlists).values({
      userId,
      productId,
      variantId: variantId ?? null,
    });
    return { saved: true };
  } catch (err) {
    throw wrapDbError('Failed to update wishlist', err);
  }
}

export async function listUserAddresses(userId: number) {
  try {
    return await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, userId))
      .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
  } catch (err) {
    throw wrapDbError('Failed to fetch addresses', err);
  }
}

export async function createOrderFromCart(input: {
  cartId: number;
  userId?: number;
  paymentMethod: 'COD_CASH' | 'COD_ONLINE';
  shippingAddress: ShippingAddressSnapshot;
  couponCode?: string | null;
}) {
  try {
    return await db.transaction(async (tx) => {
      const items = await tx.query.cartItems.findMany({
        where: eq(cartItems.cartId, input.cartId),
        with: {
          product: {
            with: {
              images: {
                orderBy: (img, { asc }) => [asc(img.sortOrder)],
              },
            },
          },
          variant: true,
        },
      });

      if (items.length === 0) {
        throw new Error('Your bag is empty');
      }

      let subtotalCents = 0;
      for (const item of items) {
        if (!item.variant || !item.product || !item.product.isActive || !item.variant.isActive) {
          throw new Error('One or more items in your bag are no longer available');
        }
        if (item.variant.stockQty < item.quantity) {
          throw new Error(
            `Insufficient stock for ${item.product.name} (${item.variant.finishName} ${item.variant.sizeLabel})`
          );
        }
        subtotalCents += item.variant.priceCents * item.quantity;
      }

      const cartRows = await tx
        .select()
        .from(carts)
        .where(eq(carts.id, input.cartId))
        .limit(1);
      const site = (await getSiteHomepageContent()) as Record<string, unknown>;
      const giftWrapAvailable = site.giftWrapEnabled !== false;
      const giftWrap =
        giftWrapAvailable && Boolean(cartRows[0]?.giftWrap);
      const giftWrapCents = giftWrap
        ? Math.max(0, Number(site.giftWrapPriceCents ?? 500) || 0)
        : 0;

      const couponCheck = await calculateCouponDiscount(
        input.couponCode,
        subtotalCents
      );
      const discountCents = couponCheck.valid ? couponCheck.discountCents : 0;
      const shippingCents = 0;
      const totalCents = Math.max(
        0,
        subtotalCents - discountCents + shippingCents + giftWrapCents
      );

      const orderNumber = `MF-${Math.floor(10000 + Math.random() * 89999)}`;
      const initialTracking: TrackingEvent[] = [
        {
          status: 'confirmed',
          note:
            input.paymentMethod === 'COD_ONLINE'
              ? 'Order confirmed. Pay online via Card/Wallet upon doorstep delivery.'
              : 'Order confirmed. Pay with cash when your LIORAVÉ parcel arrives.',
          timestamp: new Date().toISOString(),
        },
      ];

      const insertedOrder = await tx
        .insert(orders)
        .values({
          orderNumber,
          userId: input.userId ?? null,
          guestEmail: input.shippingAddress.email,
          status: 'confirmed',
          paymentMethod: input.paymentMethod,
          paymentStatus: 'pending',
          subtotalCents,
          discountCents,
          giftWrap,
          giftWrapCents,
          shippingCents,
          totalCents,
          couponCode: couponCheck.valid ? couponCheck.code : null,
          shippingAddress: input.shippingAddress,
          trackingNotes: initialTracking,
        })
        .returning();

      const order = insertedOrder[0];

      for (const item of items) {
        await tx.insert(orderItems).values({
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.product.name,
          variantLabel: `${item.variant.finishName} · ${item.variant.sizeLabel}`,
          imageUrl: item.product.images[0]?.url ?? '',
          unitPriceCents: item.variant.priceCents,
          quantity: item.quantity,
        });

        await tx
          .update(variants)
          .set({
            stockQty: sql`${variants.stockQty} - ${item.quantity}`,
          })
          .where(eq(variants.id, item.variantId));
      }

      await tx.insert(payments).values({
        orderId: order.id,
        method: input.paymentMethod,
        status: 'pending',
        amountCents: totalCents,
      });

      if (couponCheck.valid && couponCheck.couponId) {
        await tx
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1` })
          .where(eq(coupons.id, couponCheck.couponId));
      }

      await tx.delete(cartItems).where(eq(cartItems.cartId, input.cartId));
      await tx
        .update(carts)
        .set({ couponCode: null, giftWrap: false, updatedAt: new Date() })
        .where(eq(carts.id, input.cartId));

      return order;
    });
  } catch (err) {
    throw wrapDbError(
      err instanceof Error ? err.message : 'Failed to create order',
      err
    );
  }
}

export async function listUserOrders(userId: number) {
  try {
    return await db.query.orders.findMany({
      where: eq(orders.userId, userId),
      with: {
        items: true,
        payments: true,
      },
      orderBy: [desc(orders.createdAt)],
    });
  } catch (err) {
    throw wrapDbError('Failed to fetch order history', err);
  }
}

export async function findOrderByNumber(orderNumber: string) {
  try {
    await ensureSeeded();
    const clean = orderNumber.trim().replace(/^#/, '').toUpperCase();
    const order = await db.query.orders.findFirst({
      where: eq(orders.orderNumber, clean),
      with: {
        items: true,
        payments: true,
      },
    });
    return order ?? null;
  } catch (err) {
    throw wrapDbError('Failed to look up order', err);
  }
}

export async function getAdminAnalytics() {
  try {
    await ensureSeeded();
    const [
      allOrders,
      allUsers,
      allProducts,
      lowStockVariants,
      allDispatches,
      allContacts,
    ] = await Promise.all([
      db.query.orders.findMany({
        with: {
          items: true,
          user: { columns: { id: true, email: true, name: true } },
        },
        orderBy: [desc(orders.createdAt)],
      }),
      db.select().from(users),
      db.query.products.findMany({
        with: { category: true, variants: true, images: true },
        orderBy: [desc(products.reviewsCount)],
      }),
      db.query.variants.findMany({
        where: sql`${variants.stockQty} <= 8`,
        with: { product: true },
      }),
      db
        .select()
        .from(newsletterSubscribers)
        .orderBy(desc(newsletterSubscribers.createdAt)),
      db
        .select()
        .from(contactMessages)
        .orderBy(desc(contactMessages.createdAt)),
    ]);

    const activeOrders = allOrders.filter((o) => o.status !== 'cancelled');
    const totalRevenueCents = activeOrders.reduce(
      (sum, o) => sum + o.totalCents,
      0
    );

    const paidOrdersCount = activeOrders.filter(
      (o) => o.paymentStatus === 'paid_on_delivery'
    ).length;

    const collectedRevenueCents = activeOrders
      .filter((o) => o.paymentStatus === 'paid_on_delivery')
      .reduce((sum, o) => sum + o.totalCents, 0);

    const pendingCodCents = activeOrders
      .filter((o) => o.paymentStatus === 'pending')
      .reduce((sum, o) => sum + o.totalCents, 0);

    const ordersByStatus = {
      confirmed: 0,
      packed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const o of allOrders) {
      if (o.status === 'confirmed') ordersByStatus.confirmed += 1;
      else if (o.status === 'packed') ordersByStatus.packed += 1;
      else if (o.status === 'shipped') ordersByStatus.shipped += 1;
      else if (o.status === 'delivered') ordersByStatus.delivered += 1;
      else if (o.status === 'cancelled') ordersByStatus.cancelled += 1;
    }

    const salesByProduct = new Map<
      number,
      { unitsSold: number; revenueCents: number }
    >();
    for (const ord of activeOrders) {
      for (const item of ord.items || []) {
        if (!item.productId) continue;
        const curr = salesByProduct.get(item.productId) ?? {
          unitsSold: 0,
          revenueCents: 0,
        };
        curr.unitsSold += item.quantity;
        curr.revenueCents += item.unitPriceCents * item.quantity;
        salesByProduct.set(item.productId, curr);
      }
    }

    const topProducts = allProducts
      .map((p) => {
        const sales = salesByProduct.get(p.id) ?? {
          unitsSold: 0,
          revenueCents: 0,
        };
        const totalStock = (p.variants || []).reduce(
          (s, v) => s + (v.isActive ? v.stockQty : 0),
          0
        );
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          categoryName: p.category?.name || 'Uncategorized',
          basePriceCents: p.basePriceCents,
          isActive: p.isActive,
          totalStock,
          unitsSold: sales.unitsSold,
          revenueCents: sales.revenueCents,
        };
      })
      .sort(
        (a, b) =>
          b.unitsSold - a.unitsSold ||
          b.revenueCents - a.revenueCents ||
          a.totalStock - b.totalStock
      )
      .slice(0, 6);

    const customerUsers = allUsers.filter((u) => u.role === 'customer');
    const adminUsers = allUsers.filter((u) => u.role === 'admin');

    return {
      totalRevenueCents,
      collectedRevenueCents,
      pendingCodCents,
      totalOrders: allOrders.length,
      paidOrdersCount,
      ordersByStatus,
      totalCustomers: customerUsers.length,
      totalAdmins: adminUsers.length,
      totalProducts: allProducts.length,
      activeProductsCount: allProducts.filter((p) => p.isActive).length,
      lowStockCount: lowStockVariants.length,
      lowStockVariants,
      topProducts,
      recentOrders: allOrders.slice(0, 8),
      newsletterCount: allDispatches.length,
      recentDispatches: allDispatches.slice(0, 10),
      contactCount: allContacts.length,
      recentContacts: allContacts.slice(0, 10),
    };
  } catch (err) {
    throw wrapDbError('Failed to load analytics', err);
  }
}

export { getSiteHomepageContent };
