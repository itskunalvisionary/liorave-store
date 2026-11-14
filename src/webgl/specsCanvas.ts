export function initSpecsCanvas(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  let rafId = 0;
  let width = 0;
  let height = 0;
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth || canvas.parentElement?.clientWidth || 600;
    height = canvas.clientHeight || canvas.parentElement?.clientHeight || 420;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  resize();
  window.addEventListener('resize', resize);

  const drawPolygon = (
    cx: number,
    cy: number,
    radius: number,
    sides: number,
    rotation: number
  ) => {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < sides; i++) {
      const a = rotation + (i / sides) * Math.PI * 2;
      pts.push({
        x: cx + Math.cos(a) * radius,
        y: cy + Math.sin(a) * radius,
      });
    }
    ctx.beginPath();
    pts.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.stroke();
    return pts;
  };

  const draw = (now: number) => {
    const t = reducedMotion ? 0 : now * 0.00028;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    ctx.clearRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.5;
    const maxR = Math.min(width, height) * 0.43;

    const hairline = isDark
      ? 'rgba(245, 244, 240, 0.13)'
      : 'rgba(18, 20, 19, 0.11)';
    const subtleHairline = isDark
      ? 'rgba(245, 244, 240, 0.07)'
      : 'rgba(18, 20, 19, 0.06)';
    const accentStroke = isDark
      ? 'rgba(122, 163, 127, 0.46)'
      : 'rgba(72, 99, 75, 0.38)';

    // 1. Concentric ring-band profile arcs & comfort-fit tolerances
    const ringBandRadii = [0.98, 0.88, 0.77, 0.62];
    ringBandRadii.forEach((ratio, idx) => {
      const r = maxR * ratio;
      ctx.save();
      ctx.strokeStyle = idx === 1 ? accentStroke : hairline;
      ctx.lineWidth = idx === 1 ? 1.25 : 0.85;
      if (idx === 2) {
        ctx.setLineDash([4, 6]);
      }
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // Subtle bezel calibration ticks along the outer ring band
    const ticks = 48;
    for (let i = 0; i < ticks; i++) {
      const angle = (i / ticks) * Math.PI * 2 + t * 0.25;
      const isMajor = i % 6 === 0;
      const rInner = maxR * (isMajor ? 0.91 : 0.945);
      const rOuter = maxR * 0.98;
      ctx.strokeStyle = isMajor ? accentStroke : subtleHairline;
      ctx.lineWidth = isMajor ? 1.15 : 0.75;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * rInner, cy + Math.sin(angle) * rInner);
      ctx.lineTo(cx + Math.cos(angle) * rOuter, cy + Math.sin(angle) * rOuter);
      ctx.stroke();
    }

    // 2. Rotating faceted gemstone crown & bezel geometry
    const outerGirdleR = maxR * 0.56;
    const starFacetR = maxR * 0.41;
    const tableR = maxR * 0.28;

    ctx.strokeStyle = accentStroke;
    ctx.lineWidth = 1.2;
    const girdlePts = drawPolygon(cx, cy, outerGirdleR, 12, t);

    ctx.strokeStyle = hairline;
    ctx.lineWidth = 0.9;
    const starPts = drawPolygon(cx, cy, starFacetR, 12, t + Math.PI / 12);

    ctx.strokeStyle = accentStroke;
    ctx.lineWidth = 1.1;
    const tablePts = drawPolygon(cx, cy, tableR, 8, -t * 0.65);

    // Connect crown & pavilion facet ribs
    ctx.strokeStyle = subtleHairline;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    girdlePts.forEach((gp, i) => {
      const spA = starPts[i];
      const spB = starPts[(i + starPts.length - 1) % starPts.length];
      ctx.moveTo(gp.x, gp.y);
      ctx.lineTo(spA.x, spA.y);
      ctx.moveTo(gp.x, gp.y);
      ctx.lineTo(spB.x, spB.y);
    });
    tablePts.forEach((tp, i) => {
      const nearestStar = starPts[Math.floor((i * starPts.length) / tablePts.length)];
      ctx.moveTo(tp.x, tp.y);
      ctx.lineTo(nearestStar.x, nearestStar.y);
    });
    ctx.stroke();

    // 3. Bezel tolerance axis crosshairs
    ctx.strokeStyle = subtleHairline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - maxR * 1.12, cy);
    ctx.lineTo(cx + maxR * 1.12, cy);
    ctx.moveTo(cx, cy - maxR * 1.12);
    ctx.lineTo(cx, cy + maxR * 1.12);
    ctx.stroke();

    if (!reducedMotion) {
      rafId = window.requestAnimationFrame(draw);
    }
  };

  rafId = window.requestAnimationFrame(draw);

  return () => {
    window.cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
  };
}
