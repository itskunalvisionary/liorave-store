export function initHeroCanvas(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  let rafId = 0;
  let width = 0;
  let height = 0;
  let mouseX = 0.5;
  let mouseY = 0.5;
  let targetMouseX = 0.5;
  let targetMouseY = 0.5;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const onMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      targetMouseX = (e.clientX - rect.left) / rect.width;
      targetMouseY = (e.clientY - rect.top) / rect.height;
    }
  };

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onMouseMove, { passive: true });

  const contourCount = 18;
  const stepX = 16;

  const draw = (now: number) => {
    const t = now * 0.00035;
    mouseX += (targetMouseX - mouseX) * 0.04;
    mouseY += (targetMouseY - mouseY) * 0.04;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    ctx.clearRect(0, 0, width, height);

    const strokeBase = isDark
      ? 'rgba(248, 234, 198, 0.10)'
      : 'rgba(130, 94, 30, 0.10)';
    const goldHighlight = isDark
      ? 'rgba(226, 184, 88, 0.28)'
      : 'rgba(168, 122, 34, 0.24)';

    for (let i = 0; i < contourCount; i++) {
      const ratio = i / (contourCount - 1);
      const baseY = height * (0.14 + ratio * 0.76);
      ctx.beginPath();
      ctx.strokeStyle = i % 5 === 0 ? goldHighlight : strokeBase;
      ctx.lineWidth = i % 5 === 0 ? 1.25 : 0.85;

      for (let x = -stepX; x <= width + stepX; x += stepX) {
        const nx = x / Math.max(1, width);
        const distMouse = Math.hypot(nx - mouseX, ratio - mouseY);
        const ripple = Math.exp(-distMouse * 5) * 32;

        const wave1 = Math.sin(nx * 4.2 + t + ratio * 2.8) * 26;
        const wave2 = Math.cos(nx * 8.1 - t * 1.4 + i * 0.45) * 11;
        const ridge = Math.sin((nx - 0.5) * 3.1 + ratio * 1.9) * 18;
        const y = baseY + wave1 + wave2 + ridge - ripple;

        if (x <= -stepX) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    rafId = window.requestAnimationFrame(draw);
  };

  rafId = window.requestAnimationFrame(draw);

  return () => {
    window.cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onMouseMove);
  };
}
