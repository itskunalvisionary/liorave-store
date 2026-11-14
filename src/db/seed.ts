import bcrypt from 'bcryptjs';
import { count, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  categories,
  coupons,
  orderItems,
  orders,
  payments,
  productImages,
  products,
  reviews,
  siteSettings,
  users,
  variants,
} from './schema.ts';

let seedPromise: Promise<void> | null = null;

export const IMG_STUDIO =
  'https://www.gstatic.com/aistudio/starter-apps/flask-applet/flask-showcase-studio.webp';
export const IMG_RIVER =
  'https://www.gstatic.com/aistudio/starter-apps/flask-applet/flask-showcase-river.webp';
export const IMG_TRAIL =
  'https://www.gstatic.com/aistudio/starter-apps/flask-applet/flask-showcase-trail.webp';
export const IMG_LAKE =
  'https://www.gstatic.com/aistudio/starter-apps/flask-applet/flask-showcase-lake.webp';

const LEGACY_SITE_DEFAULTS: Record<string, string> = {
  heroEyebrow: 'Copper-Lined 18/8 Stainless Steel',
  heroHeadline: 'Thermal Precision for Alpine & Everyday.',
  heroSubline:
    'Double-wall vacuum insulation keeps water glacier-cold for 36 hours or pour-over piping hot for 18 hours — finished in zero-condensation powder coat.',
  heroPrimaryCta: 'Configure Flask',
  metricCold: '36h',
  metricColdLabel: 'Glacier Cold',
  metricHot: '18h',
  metricHotLabel: 'Steaming Hot',
  metricSteel: '18/8',
  metricSteelLabel: 'Medical Grade Steel',
  storyEyebrow: 'Engineered Without Compromise',
  storyHeadline: 'Built for ridge traverses, honed for architectural desks.',
  storyText:
    'Every Material Flask begins with thicker-gauge 18/8 kitchen-grade stainless steel, wrapped in an internal copper thermal shield that reflects radiant heat without adding bulk.',
  storyText2:
    'A precision-machined threaded steel collar and leakproof chug cap lock pressure cleanly from sea level to alpine passes.',
  newsletterOffer: 'Get 10% Off Your First Flask',
  newsletterSubtext:
    'Join field dispatches for small-batch powder-coat drops, trail testing notes, and early access.',
};

export const DEFAULT_SITE_CONTENT = {
  currency: 'INR' as 'USD' | 'INR',
  inrRate: 84,
  headerNav: [
    {
      id: 'nav-home',
      label: 'Home',
      type: 'single' as const,
      route: '/',
      subOptions: [],
    },
    {
      id: 'nav-shop',
      label: 'Shop',
      type: 'single' as const,
      route: '/shop',
      subOptions: [],
    },
    {
      id: 'nav-collections',
      label: 'Collections',
      type: 'single' as const,
      route: '/collections',
      subOptions: [],
    },
    {
      id: 'nav-track',
      label: 'Track Order',
      type: 'single' as const,
      route: '/track-order',
      subOptions: [],
    },
    {
      id: 'nav-contact',
      label: 'Contact',
      type: 'single' as const,
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
  heroImage: IMG_STUDIO,
  aboutImage: IMG_TRAIL,
  showcaseStages: [
    {
      id: 'stage-1',
      src: IMG_STUDIO,
      alt: 'LIORAVÉ signature piece staged on honed dark basalt slate in an architectural studio',
      title: '01 — Refined Materials',
      sub: 'Thoughtfully selected materials. Distinctive finishes.',
    },
    {
      id: 'stage-2',
      src: IMG_RIVER,
      alt: 'LIORAVÉ studio collection resting on warm natural cedar beside clear water',
      title: '02 — Everyday Luxury',
      sub: 'Designed for effortless, everyday elegance.',
    },
    {
      id: 'stage-3',
      src: IMG_TRAIL,
      alt: 'LIORAVÉ architectural craft resting on sunlit stone overlooking golden meadows',
      title: '03 — Fine Detailing',
      sub: 'Every curve, contour and detail considered.',
    },
    {
      id: 'stage-4',
      src: IMG_LAKE,
      alt: 'LIORAVÉ silhouette at dusk overlooking calm water',
      title: '04 — Timeless Appeal',
      sub: 'Made to complement every moment, season and occasion.',
    },
  ],
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

const FINISH_HEX_MAP: Record<string, string> = {
  'Alpine Sage': '#48634B',
  'Basalt Black': '#222624',
  'Glacier Silver': '#B4BDB8',
};

const SIZE_PRICE_MAP: Record<string, { cents: number; scale: string }> = {
  '750 ml': { cents: 4200, scale: '0.94' },
  '950 ml': { cents: 4800, scale: '1.0' },
  '1.2 L': { cents: 5400, scale: '1.06' },
};

function slugifyFinish(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function migrateLegacySiteContent(): Promise<void> {
  const rows = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, 'homepage'))
    .limit(1);
  if (rows.length === 0 || !rows[0].value || typeof rows[0].value !== 'object') {
    return;
  }

  const current = { ...(rows[0].value as Record<string, unknown>) };
  let changed = false;

  const PREVIOUS_HERO_METRICS: Record<string, string> = {
    heroPrimaryCta: 'Configure Piece',
    metricCold: '2.5 µm',
    metricColdLabel: '22K Gold Vermeil',
    metricHot: '925',
    metricHotLabel: 'Sterling Silver Core',
    metricSteel: '316L',
    metricSteelLabel: 'Hypoallergenic Guard',
  };

  for (const [field, legacyVal] of Object.entries(LEGACY_SITE_DEFAULTS)) {
    if (current[field] === legacyVal && field in DEFAULT_SITE_CONTENT) {
      current[field] = (DEFAULT_SITE_CONTENT as Record<string, unknown>)[field];
      changed = true;
    }
  }

  for (const [field, prevVal] of Object.entries(PREVIOUS_HERO_METRICS)) {
    if (current[field] === prevVal && field in DEFAULT_SITE_CONTENT) {
      current[field] = (DEFAULT_SITE_CONTENT as Record<string, unknown>)[field];
      changed = true;
    }
  }

  const LEGACY_STAGE_TITLES = new Set([
    'Alpine Sage Matte',
    'Made for the Outside',
    'Machined Steel Collar',
    'All-Day Carry',
    'Alpine Sage & Vermeil',
    'Crafted for Daily Wear',
    'Micro-Beveled Precision',
    'All-Day Poise',
  ]);
  if (Array.isArray(current.showcaseStages) && current.showcaseStages.length === 4) {
    const existingStages = current.showcaseStages as Array<Record<string, unknown>>;
    const allUntouched = existingStages.every(
      (st) => typeof st?.title === 'string' && LEGACY_STAGE_TITLES.has(st.title)
    );
    if (allUntouched) {
      current.showcaseStages = existingStages.map((st, idx) => ({
        ...DEFAULT_SITE_CONTENT.showcaseStages[idx],
        src:
          typeof st.src === 'string' && st.src.trim()
            ? st.src
            : DEFAULT_SITE_CONTENT.showcaseStages[idx].src,
      }));
      changed = true;
    }
  }

  if (Array.isArray(current.headerNav)) {
    const existingNav = current.headerNav as Array<Record<string, unknown>>;
    const filteredNav = existingNav.filter(
      (item) => !(item && (item.id === 'nav-about' || item.route === '/about'))
    );
    if (filteredNav.length !== existingNav.length) {
      changed = true;
    }
    const updatedNav = filteredNav.map((item) => {
      if (
        item &&
        (item.id === 'nav-shop' || item.route === '/shop') &&
        (item.type === 'dropdown' ||
          (Array.isArray(item.subOptions) && item.subOptions.length > 0))
      ) {
        changed = true;
        return {
          ...item,
          type: 'single',
          route: '/shop',
          subOptions: [],
        };
      }
      return item;
    });
    if (changed) {
      current.headerNav = updatedNav;
    }
  }

  if (typeof current.privacyPolicyText !== 'string' || !current.privacyPolicyText.trim()) {
    current.privacyPolicyText = DEFAULT_SITE_CONTENT.privacyPolicyText;
    changed = true;
  }
  if (typeof current.termsPolicyText !== 'string' || !current.termsPolicyText.trim()) {
    current.termsPolicyText = DEFAULT_SITE_CONTENT.termsPolicyText;
    changed = true;
  }
  if (typeof current.giftWrapEnabled !== 'boolean') {
    current.giftWrapEnabled = DEFAULT_SITE_CONTENT.giftWrapEnabled;
    changed = true;
  }
  if (typeof current.giftWrapPriceCents !== 'number' || !Number.isFinite(current.giftWrapPriceCents)) {
    current.giftWrapPriceCents = DEFAULT_SITE_CONTENT.giftWrapPriceCents;
    changed = true;
  }
  if (typeof current.sizeGuideEnabled !== 'boolean') {
    current.sizeGuideEnabled = DEFAULT_SITE_CONTENT.sizeGuideEnabled;
    changed = true;
  }
  if (typeof current.sizeGuideTitle !== 'string' || !current.sizeGuideTitle.trim()) {
    current.sizeGuideTitle = DEFAULT_SITE_CONTENT.sizeGuideTitle;
    changed = true;
  }
  if (typeof current.sizeGuideIntro !== 'string' || !current.sizeGuideIntro.trim()) {
    current.sizeGuideIntro = DEFAULT_SITE_CONTENT.sizeGuideIntro;
    changed = true;
  }
  if (!Array.isArray(current.sizeGuideRows)) {
    current.sizeGuideRows = DEFAULT_SITE_CONTENT.sizeGuideRows;
    changed = true;
  }
  if (!Array.isArray(current.sizeGuideTips)) {
    current.sizeGuideTips = DEFAULT_SITE_CONTENT.sizeGuideTips;
    changed = true;
  }
  if (typeof current.festivalBannerEnabled !== 'boolean') {
    current.festivalBannerEnabled = DEFAULT_SITE_CONTENT.festivalBannerEnabled;
    changed = true;
  }
  if (typeof current.festivalTitle !== 'string' || current.festivalTitle === 'Festival of Jewellery') {
    current.festivalTitle = '';
    changed = true;
  }
  if (
    typeof current.festivalSubtitle !== 'string' ||
    !current.festivalSubtitle.trim() ||
    current.festivalSubtitle ===
      'Luminous 22K gold vermeil & celebratory silhouettes curated for the season'
  ) {
    current.festivalSubtitle = DEFAULT_SITE_CONTENT.festivalSubtitle;
    changed = true;
  }
  if (typeof current.festivalCtaLabel !== 'string' || !current.festivalCtaLabel.trim()) {
    current.festivalCtaLabel = DEFAULT_SITE_CONTENT.festivalCtaLabel;
    changed = true;
  }

  if (changed) {
    await db
      .update(siteSettings)
      .set({ value: current, updatedAt: new Date() })
      .where(eq(siteSettings.key, 'homepage'));
  }
}

async function runSeed(): Promise<void> {
  const existingCats = await db.select({ value: count() }).from(categories);
  if (Number(existingCats[0]?.value ?? 0) > 0) {
    await migrateLegacySiteContent();
    return;
  }

  // 1. Seed Users (Admins + Customers)
  const adminHash = await bcrypt.hash('Material@2026', 10);
  const demoHash = await bcrypt.hash('Customer@1234', 10);

  const insertedUsers = await db
    .insert(users)
    .values([
      {
        uid: 'admin-mf-uid',
        email: 'admin@materialflask.com',
        name: 'Material Flask Admin',
        phone: '+1 (503) 555-0142',
        passwordHash: adminHash,
        role: 'admin',
      },
      {
        uid: 'admin-owner-uid',
        email: 'thekunalvisionary@gmail.com',
        name: 'Kunal (Product Lead)',
        phone: '+1 (503) 555-0188',
        passwordHash: adminHash,
        role: 'admin',
      },
      {
        uid: 'customer-demo-uid',
        email: 'demo@materialflask.com',
        name: 'Elena Vance',
        phone: '+1 (415) 555-0193',
        passwordHash: demoHash,
        role: 'customer',
      },
      {
        uid: 'customer-alex-uid',
        email: 'alex@example.com',
        name: 'Alex Mercer',
        phone: '+1 (206) 555-0124',
        passwordHash: demoHash,
        role: 'customer',
      },
      {
        uid: 'customer-maya-uid',
        email: 'maya@example.com',
        name: 'Maya Lin',
        phone: '+1 (303) 555-0167',
        passwordHash: demoHash,
        role: 'customer',
      },
    ])
    .onConflictDoNothing()
    .returning();

  const alexUser = insertedUsers.find((u) => u.email === 'alex@example.com');
  const mayaUser = insertedUsers.find((u) => u.email === 'maya@example.com');

  // 2. Seed Categories
  const insertedCategories = await db
    .insert(categories)
    .values([
      {
        name: 'Insulated Flasks',
        slug: 'insulated-flasks',
        description:
          'Double-wall vacuum vessels with copper thermal lining and machined steel collars.',
        imageUrl: IMG_STUDIO,
        sortOrder: 1,
      },
      {
        name: 'Wide-Mouth Bottles',
        slug: 'wide-mouth-bottles',
        description:
          'Ice-cube friendly wide apertures engineered for trail filtration and rapid rinsing.',
        imageUrl: IMG_RIVER,
        sortOrder: 2,
      },
      {
        name: 'Camp Vessels',
        slug: 'camp-vessels',
        description:
          'High-volume expedition hydration built for dusk camps and long traverses.',
        imageUrl: IMG_LAKE,
        sortOrder: 3,
      },
      {
        name: 'Accessories',
        slug: 'accessories',
        description:
          'Machined chug lids, stainless tether caps, and protective silicone trail boots.',
        imageUrl: IMG_TRAIL,
        sortOrder: 4,
      },
    ])
    .returning();

  const catByName = new Map(insertedCategories.map((c) => [c.name, c.id]));

  // 3. Seed Material Flask Products (USD cents: $42 = 4200, $48 = 4800, $54 = 5400)
  const seedProducts = [
    {
      name: 'Material Flask — Flagship',
      slug: 'material-flask-flagship',
      cat: 'Insulated Flasks',
      priceCents: 4800,
      mrpCents: 5800,
      tag: 'Bestseller',
      iconKey: 'flask',
      stone: '18/8 Stainless Steel',
      occasion: 'All-Day Carry',
      subtitle: 'Copper-lined double-wall thermal flask in matte powder coat',
      description:
        'Our signature vessel honed for studio desks and alpine ridges alike. Double-wall vacuum insulation paired with an internal copper lining preserves temperature without condensation or metallic aftertaste.',
      rating: '4.9',
      reviewsCount: 312,
      sizes: ['750 ml', '950 ml', '1.2 L'],
      finishes: ['Alpine Sage', 'Basalt Black', 'Glacier Silver'],
      stock: 18,
      image: IMG_STUDIO,
      careGuide: 'Hand wash lid collar with warm soapy water. Vessel body is top-rack dishwasher safe.',
      isFeatured: true,
    },
    {
      name: 'Material Flask — Studio Basalt',
      slug: 'material-flask-studio-basalt',
      cat: 'Insulated Flasks',
      priceCents: 4800,
      mrpCents: 5600,
      tag: 'New',
      iconKey: 'flask',
      stone: 'Honed Powder Coat',
      occasion: 'Daily Studio',
      subtitle: 'Honed architectural matte texture with whisper-quiet silicone base',
      description:
        'Designed to sit silently on slate, timber, or concrete. Features an acoustic-dampened base ring and bead-blasted steel interior for pure water clarity.',
      rating: '4.9',
      reviewsCount: 148,
      sizes: ['750 ml', '950 ml', '1.2 L'],
      finishes: ['Basalt Black', 'Alpine Sage', 'Glacier Silver'],
      stock: 14,
      image: IMG_STUDIO,
      careGuide: 'Wipe powder-coat exterior with a soft damp cloth. Do not freeze full.',
      isFeatured: true,
    },
    {
      name: 'Riverflow Wide-Mouth 950 ml',
      slug: 'riverflow-wide-mouth-950ml',
      cat: 'Wide-Mouth Bottles',
      priceCents: 4800,
      mrpCents: null,
      tag: 'Bestseller',
      iconKey: 'wide',
      stone: 'Copper-Shielded Vacuum',
      occasion: 'River & Trail',
      subtitle: 'Zero-condensation carry built from morning trails to sunny riverbanks',
      description:
        'Engineered for rapid hydration beside clear mountain water. Fits standard backcountry gravity filters and oversized ice blocks while remaining bone-dry inside daypacks.',
      rating: '4.8',
      reviewsCount: 196,
      sizes: ['750 ml', '950 ml', '1.2 L'],
      finishes: ['Alpine Sage', 'Glacier Silver', 'Basalt Black'],
      stock: 11,
      image: IMG_RIVER,
      careGuide: 'Rinse silicone gaskets monthly and air dry with cap unthreaded.',
      isFeatured: true,
    },
    {
      name: 'Granite Ridge Chug Flask',
      slug: 'granite-ridge-chug-flask',
      cat: 'Insulated Flasks',
      priceCents: 5400,
      mrpCents: 6400,
      tag: 'New',
      iconKey: 'trail',
      stone: 'Machined 304 Collar',
      occasion: 'Alpine Ridge',
      subtitle: 'Leakproof machined steel chug lid built to take a knock',
      description:
        'Tested on exposed granite ridges above tree line. A CNC-machined steel collar reinforces the neck against drops, while the recessed O-ring guarantees a dry pack at altitude.',
      rating: '4.9',
      reviewsCount: 89,
      sizes: ['950 ml', '1.2 L'],
      finishes: ['Alpine Sage', 'Basalt Black'],
      stock: 7,
      image: IMG_TRAIL,
      careGuide: 'Inspect O-ring seal before high-altitude flights or alpine ascents.',
      isFeatured: true,
    },
    {
      name: 'Dusk Lake Camp Vessel 1.2 L',
      slug: 'dusk-lake-camp-vessel',
      cat: 'Camp Vessels',
      priceCents: 5400,
      mrpCents: 6800,
      tag: null,
      iconKey: 'camp',
      stone: 'Heavy-Gauge 18/8',
      occasion: 'Basecamp',
      subtitle: 'Extended 1.2 L capacity for shared pour-overs and evening camp',
      description:
        'Built to go from sunny ridge hikes to quiet evening lakeside camp. Holds enough boiling water for two freeze-dried meals or icy water across a full summer traverse.',
      rating: '4.8',
      reviewsCount: 124,
      sizes: ['950 ml', '1.2 L'],
      finishes: ['Basalt Black', 'Alpine Sage', 'Glacier Silver'],
      stock: 9,
      image: IMG_LAKE,
      careGuide: 'Pre-warm with hot water for 2 minutes before filling with coffee or tea.',
      isFeatured: true,
    },
    {
      name: 'Glacier Compact 750 ml',
      slug: 'glacier-compact-750ml',
      cat: 'Wide-Mouth Bottles',
      priceCents: 4200,
      mrpCents: null,
      tag: null,
      iconKey: 'wide',
      stone: 'Brushed Raw Steel',
      occasion: 'Everyday Commute',
      subtitle: 'Cup-holder friendly silhouette with raw brushed steel finish',
      description:
        'Slim enough for bike cages and commuter cup holders without sacrificing the full 36-hour cold rating.',
      rating: '4.7',
      reviewsCount: 77,
      sizes: ['750 ml', '950 ml'],
      finishes: ['Glacier Silver', 'Alpine Sage'],
      stock: 15,
      image: IMG_RIVER,
      careGuide: 'Wash regularly with warm water and mild dish soap.',
      isFeatured: false,
    },
    {
      name: 'Machined Steel Chug Cap',
      slug: 'machined-steel-chug-cap',
      cat: 'Accessories',
      priceCents: 1800,
      mrpCents: 2200,
      tag: null,
      iconKey: 'accessory',
      stone: 'CNC 304 Steel',
      occasion: 'Replacement & Modular',
      subtitle: 'Universal leakproof chug collar compatible with all Material Flasks',
      description:
        'Precision-turned stainless steel collar with high-flow spout and captive tether loop. Fits 750 ml, 950 ml, and 1.2 L vessels.',
      rating: '4.9',
      reviewsCount: 64,
      sizes: ['Universal Fit'],
      finishes: ['Basalt Black', 'Glacier Silver'],
      stock: 28,
      image: IMG_TRAIL,
      careGuide: 'Dishwasher safe on upper rack.',
      isFeatured: false,
    },
    {
      name: 'Alpine Silicone Trail Boot',
      slug: 'alpine-silicone-trail-boot',
      cat: 'Accessories',
      priceCents: 1400,
      mrpCents: null,
      tag: null,
      iconKey: 'accessory',
      stone: 'Food-Grade Silicone',
      occasion: 'Impact Protection',
      subtitle: 'Shock-absorbing base sleeve for granite and concrete surfaces',
      description:
        'Protects the powder-coat base against rock abrasion and silences desk placement.',
      rating: '4.8',
      reviewsCount: 51,
      sizes: ['Standard (750/950 ml)', 'Wide (1.2 L)'],
      finishes: ['Alpine Sage', 'Basalt Black'],
      stock: 34,
      image: IMG_LAKE,
      careGuide: 'Rinse cleanly with warm water.',
      isFeatured: false,
    },
  ];

  const insertedProdMap = new Map<string, { id: number; variantId: number; priceCents: number; image: string }>();

  for (const item of seedProducts) {
    const [prod] = await db
      .insert(products)
      .values({
        categoryId: catByName.get(item.cat) ?? null,
        name: item.name,
        slug: item.slug,
        subtitle: item.subtitle,
        description: item.description,
        basePriceCents: item.priceCents,
        mrpCents: item.mrpCents,
        tag: item.tag,
        iconKey: item.iconKey,
        stone: item.stone,
        occasion: item.occasion,
        careGuide: item.careGuide,
        rating: item.rating,
        reviewsCount: item.reviewsCount,
        isFeatured: item.isFeatured,
        isActive: true,
        specs: {
          Alloy: '18/8 Food-Grade Stainless Steel',
          Insulation: 'Double-Wall Vacuum + Copper Liner',
          ColdRetention: 'Up to 36 Hours',
          HotRetention: 'Up to 18 Hours',
        },
      })
      .returning();

    await db.insert(productImages).values({
      productId: prod.id,
      url: item.image,
      altText: item.name,
      sortOrder: 1,
      isPrimary: true,
    });

    let firstVariantId = 0;
    for (let mIdx = 0; mIdx < item.finishes.length; mIdx++) {
      const finish = item.finishes[mIdx];
      for (let sIdx = 0; sIdx < item.sizes.length; sIdx++) {
        const sizeLabel = item.sizes[sIdx];
        const sizePricing = SIZE_PRICE_MAP[sizeLabel];
        const variantPrice =
          item.cat === 'Accessories'
            ? item.priceCents
            : sizePricing
            ? sizePricing.cents
            : item.priceCents;
        const scaleFactor = sizePricing ? sizePricing.scale : '1.0';
        const sku = `MF-${prod.id}-${mIdx + 1}-${sIdx + 1}`;
        const [v] = await db
          .insert(variants)
          .values({
            productId: prod.id,
            sku,
            finishName: finish,
            finishCode: slugifyFinish(finish),
            finishHex: FINISH_HEX_MAP[finish] || '#48634B',
            sizeLabel,
            scaleFactor,
            priceCents: variantPrice,
            stockQty: item.stock,
            isActive: true,
          })
          .returning();
        if (!firstVariantId) firstVariantId = v.id;
      }
    }

    insertedProdMap.set(item.slug, {
      id: prod.id,
      variantId: firstVariantId,
      priceCents: item.priceCents,
      image: item.image,
    });
  }

  // 4. Seed Verified Product Reviews
  const flagship = insertedProdMap.get('material-flask-flagship');
  const trailFlask = insertedProdMap.get('granite-ridge-chug-flask');
  if (flagship) {
    await db.insert(reviews).values([
      {
        productId: flagship.id,
        authorName: 'Daniel K.',
        rating: 5,
        title: 'Still had ice after a 30-hour summer road trip',
        body: 'Left the Alpine Sage 950 ml in a hot car at the trailhead all afternoon and the water was still genuinely cold when we got back down.',
        isVerified: true,
      },
      {
        productId: flagship.id,
        authorName: 'Hannah M.',
        rating: 5,
        title: 'Zero condensation on my sketchbook',
        body: 'Sits right beside my laptop and studio papers with zero moisture ring. The matte powder coat feels rugged yet refined.',
        isVerified: true,
      },
    ]);
  }
  if (trailFlask) {
    await db.insert(reviews).values([
      {
        productId: trailFlask.id,
        authorName: 'Chris R.',
        rating: 5,
        title: 'Took a tumble down granite scree without leaking',
        body: 'Dropped it on a rocky switchback in the Cascades — slight scuff on the collar, zero dents and still watertight.',
        isVerified: true,
      },
    ]);
  }

  // 5. Seed Coupons (USD cents)
  await db
    .insert(coupons)
    .values([
      {
        code: 'WELCOME10',
        discountType: 'percent',
        discountValue: 10,
        minOrderCents: 3000, // $30
        maxUses: 500,
        usedCount: 142,
        isActive: true,
      },
      {
        code: 'TRAIL15',
        discountType: 'percent',
        discountValue: 15,
        minOrderCents: 8000, // $80
        maxUses: 250,
        usedCount: 64,
        isActive: true,
      },
      {
        code: 'ALPINE10',
        discountType: 'fixed',
        discountValue: 1000, // $10
        minOrderCents: 6000, // $60
        maxUses: 300,
        usedCount: 89,
        isActive: true,
      },
    ])
    .onConflictDoNothing();

  // 6. Seed Sample Orders (Order Tracking MF-10482, MF-10331, MF-10126)
  const river = insertedProdMap.get('riverflow-wide-mouth-950ml');
  const camp = insertedProdMap.get('dusk-lake-camp-vessel');

  if (flagship && alexUser) {
    const [o1] = await db
      .insert(orders)
      .values({
        orderNumber: 'MF-10482',
        userId: alexUser.id,
        guestEmail: alexUser.email,
        status: 'shipped',
        paymentMethod: 'COD_ONLINE',
        paymentStatus: 'pending',
        subtotalCents: 4800,
        discountCents: 0,
        shippingCents: 0,
        totalCents: 4800,
        shippingAddress: {
          fullName: 'Alex Mercer',
          phone: '206-555-0124',
          email: 'alex@example.com',
          line1: '742 NW Flanders St',
          city: 'Portland',
          state: 'OR',
          postalCode: '97209',
          country: 'United States',
          addressType: 'Home',
        },
        trackingNotes: [
          {
            status: 'confirmed',
            note: 'Order confirmed at Material Flask Portland Fulfilment.',
            timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
          },
          {
            status: 'processing',
            note: 'Vacuum seal & collar torque inspected.',
            timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
          {
            status: 'shipped',
            note: 'In transit with courier. Pay online at delivery.',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
          },
        ],
      })
      .returning();

    await db.insert(orderItems).values([
      {
        orderId: o1.id,
        productId: flagship.id,
        variantId: flagship.variantId,
        productName: 'Material Flask — Flagship',
        variantLabel: 'Alpine Sage · 950 ml',
        imageUrl: flagship.image,
        unitPriceCents: 4800,
        quantity: 1,
      },
    ]);

    await db.insert(payments).values({
      orderId: o1.id,
      method: 'COD_ONLINE',
      status: 'pending',
      amountCents: 4800,
    });
  }

  if (river && mayaUser) {
    const [o2] = await db
      .insert(orders)
      .values({
        orderNumber: 'MF-10331',
        userId: mayaUser.id,
        guestEmail: mayaUser.email,
        status: 'delivered',
        paymentMethod: 'COD_CASH',
        paymentStatus: 'paid_on_delivery',
        subtotalCents: 4800,
        discountCents: 0,
        shippingCents: 0,
        totalCents: 4800,
        shippingAddress: {
          fullName: 'Maya Lin',
          phone: '303-555-0167',
          email: 'maya@example.com',
          line1: '1820 Pearl St',
          city: 'Boulder',
          state: 'CO',
          postalCode: '80302',
          country: 'United States',
          addressType: 'Home',
        },
        trackingNotes: [
          {
            status: 'confirmed',
            note: 'Order confirmed. Pay Cash on Delivery.',
            timestamp: new Date(Date.now() - 86400000 * 8).toISOString(),
          },
          {
            status: 'delivered',
            note: 'Delivered and Cash on Delivery settled.',
            timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
          },
        ],
      })
      .returning();

    await db.insert(orderItems).values({
      orderId: o2.id,
      productId: river.id,
      variantId: river.variantId,
      productName: 'Riverflow Wide-Mouth 950 ml',
      variantLabel: 'Alpine Sage · 950 ml',
      imageUrl: river.image,
      unitPriceCents: 4800,
      quantity: 1,
    });

    await db.insert(payments).values({
      orderId: o2.id,
      method: 'COD_CASH',
      status: 'completed',
      amountCents: 4800,
      paidAt: new Date(Date.now() - 86400000 * 5),
    });
  }

  if (camp && alexUser) {
    const [o3] = await db
      .insert(orders)
      .values({
        orderNumber: 'MF-10126',
        userId: alexUser.id,
        guestEmail: alexUser.email,
        status: 'delivered',
        paymentMethod: 'COD_CASH',
        paymentStatus: 'paid_on_delivery',
        subtotalCents: 5400,
        discountCents: 0,
        shippingCents: 0,
        totalCents: 5400,
        shippingAddress: {
          fullName: 'Alex Mercer',
          phone: '206-555-0124',
          email: 'alex@example.com',
          line1: '742 NW Flanders St',
          city: 'Portland',
          state: 'OR',
          postalCode: '97209',
          country: 'United States',
          addressType: 'Home',
        },
        trackingNotes: [
          {
            status: 'delivered',
            note: 'Delivered and settled.',
            timestamp: new Date(Date.now() - 86400000 * 14).toISOString(),
          },
        ],
      })
      .returning();

    await db.insert(orderItems).values({
      orderId: o3.id,
      productId: camp.id,
      variantId: camp.variantId,
      productName: 'Dusk Lake Camp Vessel 1.2 L',
      variantLabel: 'Basalt Black · 1.2 L',
      imageUrl: camp.image,
      unitPriceCents: 5400,
      quantity: 1,
    });

    await db.insert(payments).values({
      orderId: o3.id,
      method: 'COD_CASH',
      status: 'completed',
      amountCents: 5400,
      paidAt: new Date(Date.now() - 86400000 * 14),
    });
  }

  // 7. Seed Site Settings
  await db
    .insert(siteSettings)
    .values({
      key: 'homepage',
      value: DEFAULT_SITE_CONTENT,
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: DEFAULT_SITE_CONTENT, updatedAt: new Date() },
    });
}

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      console.error('Database seed failed:', err);
      throw new Error('Failed to initialize catalog data', { cause: err });
    });
  }
  return seedPromise;
}

export async function getSiteHomepageContent() {
  await ensureSeeded();
  const rows = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, 'homepage'))
    .limit(1);
  if (rows.length > 0 && rows[0].value) {
    return { ...DEFAULT_SITE_CONTENT, ...(rows[0].value as Record<string, unknown>) };
  }
  return DEFAULT_SITE_CONTENT;
}

export { productImages };
