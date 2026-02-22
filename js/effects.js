/* ============================================
   AltPic — Effects Engine
   ============================================ */

const Effects = (() => {

  // ---- Color Utilities ----

  function clamp(v, min = 0, max = 255) {
    return v < min ? min : v > max ? max : v;
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [h * 360, s * 100, l * 100];
  }

  function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  function luminance(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // ---- Palettes ----

  const PALETTES = {
    bw: [[0, 0, 0], [255, 255, 255]],
    cga: [
      [0, 0, 0], [0, 0, 170], [0, 170, 0], [0, 170, 170],
      [170, 0, 0], [170, 0, 170], [170, 85, 0], [170, 170, 170],
      [85, 85, 85], [85, 85, 255], [85, 255, 85], [85, 255, 255],
      [255, 85, 85], [255, 85, 255], [255, 255, 85], [255, 255, 255]
    ],
    gameboy: [
      [15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]
    ],
    // EGA: all 4^3 = 64 colors (4 levels per channel)
    ega: (() => {
      const vals = [0, 85, 170, 255];
      const c = [];
      for (const r of vals) for (const g of vals) for (const b of vals) c.push([r, g, b]);
      return c;
    })(),
    // NES 64-color palette
    nes: [
      [84,84,84],[0,30,116],[8,16,144],[48,0,136],[68,0,100],[92,0,48],[84,4,0],[60,24,0],
      [32,42,0],[8,58,0],[0,64,0],[0,60,0],[0,50,60],[0,0,0],[0,0,0],[0,0,0],
      [152,150,152],[8,76,196],[48,50,236],[92,30,228],[136,20,176],[160,20,100],[152,34,32],[120,60,0],
      [84,90,0],[40,114,0],[8,124,0],[0,118,40],[0,102,120],[0,0,0],[0,0,0],[0,0,0],
      [236,238,236],[76,154,236],[120,124,236],[176,98,236],[228,84,236],[236,88,180],[236,106,100],[212,136,32],
      [160,170,0],[116,196,0],[76,208,32],[56,204,108],[56,180,204],[60,60,60],[0,0,0],[0,0,0],
      [236,238,236],[168,204,236],[188,188,236],[212,178,236],[236,174,236],[236,174,212],[236,180,176],[228,196,144],
      [204,210,120],[180,222,120],[168,226,144],[152,226,180],[160,214,228],[160,162,160],[0,0,0],[0,0,0]
    ],
    // Pico-8 16 colors
    pico8: [
      [0,0,0],[29,43,83],[126,37,83],[0,135,81],[171,82,54],[95,87,79],[194,195,199],[255,241,232],
      [255,0,77],[255,163,0],[255,236,39],[0,228,54],[41,173,255],[131,118,156],[255,119,168],[255,204,170]
    ],
    // ZX Spectrum 15 colors (normal + bright, no duplicate black)
    zxspec: [
      [0,0,0],[0,0,215],[215,0,0],[215,0,215],[0,215,0],[0,215,215],[215,215,0],[215,215,215],
      [0,0,255],[255,0,0],[255,0,255],[0,255,0],[0,255,255],[255,255,0],[255,255,255]
    ]
  };

  function parseCustomPalette(str) {
    if (!str) return [];
    return str.split(',')
      .map(s => s.trim())
      .filter(s => /^#[0-9a-fA-F]{6}$/.test(s))
      .map(hexToRgb);
  }

  function getPalette(name, numColors, customColors) {
    if (name === 'custom') {
      const pal = parseCustomPalette(customColors || '');
      return pal.length > 0 ? pal : PALETTES.bw;
    }
    const full = PALETTES[name] || PALETTES.bw;
    if (full.length <= numColors) return full;
    const result = [];
    for (let i = 0; i < numColors; i++) {
      result.push(full[Math.floor(i * full.length / numColors)]);
    }
    return result;
  }

  function nearestColor(r, g, b, palette) {
    let minDist = Infinity, best = palette[0];
    for (const c of palette) {
      const dr = r - c[0], dg = g - c[1], db = b - c[2];
      const dist = dr * dr + dg * dg + db * db;
      if (dist < minDist) { minDist = dist; best = c; }
    }
    return best;
  }

  // ---- Basic Adjustments ----

  function applyAdjustments(imageData, params) {
    const d = imageData.data;
    const brightness = params.brightness || 0;
    const contrast = params.contrast || 0;
    const saturation = params.saturation || 0;
    const hue = params.hue || 0;

    const cf = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];

      r += brightness * 2.55;
      g += brightness * 2.55;
      b += brightness * 2.55;

      r = cf * (r - 128) + 128;
      g = cf * (g - 128) + 128;
      b = cf * (b - 128) + 128;

      if (saturation !== 0 || hue !== 0) {
        let [h, s, l] = rgbToHsl(clamp(r), clamp(g), clamp(b));
        s = clamp(s + saturation, 0, 100);
        h = (h + hue) % 360;
        [r, g, b] = hslToRgb(h, s, l);
      }

      d[i] = clamp(r);
      d[i + 1] = clamp(g);
      d[i + 2] = clamp(b);
    }
    return imageData;
  }

  // ---- Posterize ----

  function applyPosterize(imageData, levels) {
    if (levels >= 32) return imageData;
    const d = imageData.data;
    const step = 255 / (levels - 1);
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.round(Math.round(d[i] / step) * step);
      d[i + 1] = Math.round(Math.round(d[i + 1] / step) * step);
      d[i + 2] = Math.round(Math.round(d[i + 2] / step) * step);
    }
    return imageData;
  }

  // ---- Sepia ----

  function applySepia(imageData, amount) {
    if (amount === 0) return imageData;
    const d = imageData.data;
    const a = amount / 100;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const tr = 0.393 * r + 0.769 * g + 0.189 * b;
      const tg = 0.349 * r + 0.686 * g + 0.168 * b;
      const tb = 0.272 * r + 0.534 * g + 0.131 * b;
      d[i] = clamp(r + (tr - r) * a);
      d[i + 1] = clamp(g + (tg - g) * a);
      d[i + 2] = clamp(b + (tb - b) * a);
    }
    return imageData;
  }

  // ---- Invert ----

  function applyInvert(imageData, amount) {
    if (amount === 0) return imageData;
    const d = imageData.data;
    const a = amount / 100;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = clamp(d[i] + (255 - 2 * d[i]) * a);
      d[i + 1] = clamp(d[i + 1] + (255 - 2 * d[i + 1]) * a);
      d[i + 2] = clamp(d[i + 2] + (255 - 2 * d[i + 2]) * a);
    }
    return imageData;
  }

  // ---- Duotone ----

  function applyDuotone(imageData, amount, colorA, colorB) {
    if (amount === 0) return imageData;
    const d = imageData.data;
    const a = amount / 100;
    const cA = hexToRgb(colorA);
    const cB = hexToRgb(colorB);
    for (let i = 0; i < d.length; i += 4) {
      const lum = luminance(d[i], d[i + 1], d[i + 2]) / 255;
      const dr = cA[0] + (cB[0] - cA[0]) * lum;
      const dg = cA[1] + (cB[1] - cA[1]) * lum;
      const db = cA[2] + (cB[2] - cA[2]) * lum;
      d[i] = clamp(d[i] + (dr - d[i]) * a);
      d[i + 1] = clamp(d[i + 1] + (dg - d[i + 1]) * a);
      d[i + 2] = clamp(d[i + 2] + (db - d[i + 2]) * a);
    }
    return imageData;
  }

  // ---- Pixelate ----

  function applyPixelate(ctx, w, h, size) {
    if (size <= 1) return;
    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;
    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        let rr = 0, gg = 0, bb = 0, count = 0;
        for (let dy = 0; dy < size && y + dy < h; dy++) {
          for (let dx = 0; dx < size && x + dx < w; dx++) {
            const idx = ((y + dy) * w + (x + dx)) * 4;
            rr += d[idx]; gg += d[idx + 1]; bb += d[idx + 2];
            count++;
          }
        }
        rr = Math.round(rr / count);
        gg = Math.round(gg / count);
        bb = Math.round(bb / count);
        for (let dy = 0; dy < size && y + dy < h; dy++) {
          for (let dx = 0; dx < size && x + dx < w; dx++) {
            const idx = ((y + dy) * w + (x + dx)) * 4;
            d[idx] = rr; d[idx + 1] = gg; d[idx + 2] = bb;
          }
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // ---- Scanlines ----

  function applyScanlines(ctx, w, h, intensity, lineWidth) {
    if (intensity === 0) return;
    const alpha = intensity / 100 * 0.7;
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    for (let y = 0; y < h; y += lineWidth * 2) {
      ctx.fillRect(0, y, w, lineWidth);
    }
  }

  // ---- Halftone ----

  function applyHalftone(ctx, w, h, intensity, dotSize) {
    if (intensity === 0) return;
    const src = ctx.getImageData(0, 0, w, h);
    const sd = src.data;
    const a = intensity / 100;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < h; y += dotSize * 2) {
      for (let x = 0; x < w; x += dotSize * 2) {
        const idx = (y * w + x) * 4;
        const lum = luminance(sd[idx], sd[idx + 1], sd[idx + 2]) / 255;
        const radius = (1 - lum) * dotSize * a;
        if (radius > 0.2) {
          ctx.beginPath();
          ctx.arc(x + dotSize, y + dotSize, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgb(${sd[idx]}, ${sd[idx + 1]}, ${sd[idx + 2]})`;
          ctx.fill();
        }
      }
    }
  }

  // ---- Glitch ----

  function applyGlitch(ctx, w, h, intensity) {
    if (intensity === 0) return;
    const slices = Math.floor(intensity / 5) + 1;
    const maxShift = Math.floor(w * intensity / 200);

    for (let i = 0; i < slices; i++) {
      const y = Math.floor(Math.random() * h);
      const sliceH = Math.floor(Math.random() * (h / 10)) + 1;
      const shift = Math.floor(Math.random() * maxShift * 2) - maxShift;
      const slice = ctx.getImageData(0, y, w, Math.min(sliceH, h - y));
      ctx.putImageData(slice, shift, y);
    }

    if (intensity > 30) {
      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;
      const shift = Math.floor(intensity / 15);
      const copy = new Uint8ClampedArray(d);
      for (let i = 0; i < d.length; i += 4) {
        const offset = shift * 4;
        if (i + offset < d.length) {
          d[i] = copy[i + offset];
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
  }

  // ---- Dithering: Bayer Matrices ----

  const BAYER_4x4 = [
    [ 0,  8,  2, 10],
    [12,  4, 14,  6],
    [ 3, 11,  1,  9],
    [15,  7, 13,  5]
  ];

  function makeBayerMatrix(n) {
    if (n === 1) return [[0]];
    const half = makeBayerMatrix(n / 2);
    const m = [];
    for (let y = 0; y < n; y++) {
      m[y] = [];
      for (let x = 0; x < n; x++) {
        const hy = y % (n / 2);
        const hx = x % (n / 2);
        const base = half[hy][hx] * 4;
        const quadrant = (y < n / 2 ? 0 : 2) + (x < n / 2 ? 0 : 1);
        m[y][x] = base + [0, 2, 3, 1][quadrant];
      }
    }
    return m;
  }

  const BAYER_8x8 = makeBayerMatrix(8);
  const BAYER_16x16 = makeBayerMatrix(16);

  // ---- Dithering: Floyd-Steinberg (with serpentine) ----

  function ditherFloydSteinberg(imageData, w, h, palette, strength, serpentine) {
    const d = imageData.data;
    const s = strength / 100;
    const errors = new Float32Array(w * h * 3);

    for (let i = 0; i < d.length; i += 4) {
      const idx = i / 4;
      errors[idx * 3] = d[i];
      errors[idx * 3 + 1] = d[i + 1];
      errors[idx * 3 + 2] = d[i + 2];
    }

    for (let y = 0; y < h; y++) {
      const rev = serpentine && (y % 2 === 1);
      for (let xi = 0; xi < w; xi++) {
        const x = rev ? w - 1 - xi : xi;
        const idx = y * w + x;
        const r = clamp(errors[idx * 3]);
        const g = clamp(errors[idx * 3 + 1]);
        const b = clamp(errors[idx * 3 + 2]);

        const nc = nearestColor(r, g, b, palette);
        d[idx * 4] = nc[0];
        d[idx * 4 + 1] = nc[1];
        d[idx * 4 + 2] = nc[2];

        const er = (r - nc[0]) * s;
        const eg = (g - nc[1]) * s;
        const eb = (b - nc[2]) * s;

        const dir = rev ? -1 : 1;
        const spread = [
          [x + dir, y,     7/16],
          [x - dir, y + 1, 3/16],
          [x,       y + 1, 5/16],
          [x + dir, y + 1, 1/16]
        ];

        for (const [sx, sy, factor] of spread) {
          if (sx >= 0 && sx < w && sy < h) {
            const si = sy * w + sx;
            errors[si * 3] += er * factor;
            errors[si * 3 + 1] += eg * factor;
            errors[si * 3 + 2] += eb * factor;
          }
        }
      }
    }
    return imageData;
  }

  // ---- Dithering: Ordered (Bayer, multi-size) ----

  function ditherOrdered(imageData, w, h, palette, strength, matrixSize) {
    const d = imageData.data;
    const s = strength / 100;
    let matrix, divisor;
    if (matrixSize === 8) {
      matrix = BAYER_8x8; divisor = 64;
    } else if (matrixSize === 16) {
      matrix = BAYER_16x16; divisor = 256;
    } else {
      matrix = BAYER_4x4; divisor = 16;
      matrixSize = 4;
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const threshold = (matrix[y % matrixSize][x % matrixSize] / divisor - 0.5) * 64 * s;

        const r = clamp(d[idx] + threshold);
        const g = clamp(d[idx + 1] + threshold);
        const b = clamp(d[idx + 2] + threshold);

        const nc = nearestColor(r, g, b, palette);
        d[idx] = nc[0];
        d[idx + 1] = nc[1];
        d[idx + 2] = nc[2];
      }
    }
    return imageData;
  }

  // ---- Dithering: Atkinson (with serpentine) ----

  function ditherAtkinson(imageData, w, h, palette, strength, serpentine) {
    const d = imageData.data;
    const s = strength / 100;
    const errors = new Float32Array(w * h * 3);

    for (let i = 0; i < d.length; i += 4) {
      const idx = i / 4;
      errors[idx * 3] = d[i];
      errors[idx * 3 + 1] = d[i + 1];
      errors[idx * 3 + 2] = d[i + 2];
    }

    for (let y = 0; y < h; y++) {
      const rev = serpentine && (y % 2 === 1);
      for (let xi = 0; xi < w; xi++) {
        const x = rev ? w - 1 - xi : xi;
        const idx = y * w + x;
        const r = clamp(errors[idx * 3]);
        const g = clamp(errors[idx * 3 + 1]);
        const b = clamp(errors[idx * 3 + 2]);

        const nc = nearestColor(r, g, b, palette);
        d[idx * 4] = nc[0];
        d[idx * 4 + 1] = nc[1];
        d[idx * 4 + 2] = nc[2];

        const er = (r - nc[0]) * s / 8;
        const eg = (g - nc[1]) * s / 8;
        const eb = (b - nc[2]) * s / 8;

        const dir = rev ? -1 : 1;
        const spread = [
          [x + dir, y],     [x + dir * 2, y],
          [x - dir, y + 1], [x, y + 1], [x + dir, y + 1],
          [x, y + 2]
        ];

        for (const [sx, sy] of spread) {
          if (sx >= 0 && sx < w && sy < h) {
            const si = sy * w + sx;
            errors[si * 3] += er;
            errors[si * 3 + 1] += eg;
            errors[si * 3 + 2] += eb;
          }
        }
      }
    }
    return imageData;
  }

  // ---- Dithering: Sierra ----

  function ditherSierra(imageData, w, h, palette, strength, serpentine) {
    const d = imageData.data;
    const s = strength / 100;
    const errors = new Float32Array(w * h * 3);

    for (let i = 0; i < d.length; i += 4) {
      const idx = i / 4;
      errors[idx * 3] = d[i];
      errors[idx * 3 + 1] = d[i + 1];
      errors[idx * 3 + 2] = d[i + 2];
    }

    for (let y = 0; y < h; y++) {
      const rev = serpentine && (y % 2 === 1);
      for (let xi = 0; xi < w; xi++) {
        const x = rev ? w - 1 - xi : xi;
        const idx = y * w + x;
        const r = clamp(errors[idx * 3]);
        const g = clamp(errors[idx * 3 + 1]);
        const b = clamp(errors[idx * 3 + 2]);

        const nc = nearestColor(r, g, b, palette);
        d[idx * 4] = nc[0];
        d[idx * 4 + 1] = nc[1];
        d[idx * 4 + 2] = nc[2];

        const er = (r - nc[0]) * s;
        const eg = (g - nc[1]) * s;
        const eb = (b - nc[2]) * s;

        const p = rev ? -1 : 1;
        const spread = [
          [x+p,   y,   5/32], [x+p*2, y,   3/32],
          [x-p*2, y+1, 2/32], [x-p,   y+1, 4/32], [x,     y+1, 5/32], [x+p,   y+1, 4/32], [x+p*2, y+1, 2/32],
          [x-p,   y+2, 2/32], [x,     y+2, 3/32], [x+p,   y+2, 2/32]
        ];

        for (const [sx, sy, factor] of spread) {
          if (sx >= 0 && sx < w && sy < h) {
            const si = sy * w + sx;
            errors[si * 3] += er * factor;
            errors[si * 3 + 1] += eg * factor;
            errors[si * 3 + 2] += eb * factor;
          }
        }
      }
    }
    return imageData;
  }

  // ---- Dithering: Jarvis-Judice-Ninke ----

  function ditherJJN(imageData, w, h, palette, strength, serpentine) {
    const d = imageData.data;
    const s = strength / 100;
    const errors = new Float32Array(w * h * 3);

    for (let i = 0; i < d.length; i += 4) {
      const idx = i / 4;
      errors[idx * 3] = d[i];
      errors[idx * 3 + 1] = d[i + 1];
      errors[idx * 3 + 2] = d[i + 2];
    }

    for (let y = 0; y < h; y++) {
      const rev = serpentine && (y % 2 === 1);
      for (let xi = 0; xi < w; xi++) {
        const x = rev ? w - 1 - xi : xi;
        const idx = y * w + x;
        const r = clamp(errors[idx * 3]);
        const g = clamp(errors[idx * 3 + 1]);
        const b = clamp(errors[idx * 3 + 2]);

        const nc = nearestColor(r, g, b, palette);
        d[idx * 4] = nc[0];
        d[idx * 4 + 1] = nc[1];
        d[idx * 4 + 2] = nc[2];

        const er = (r - nc[0]) * s;
        const eg = (g - nc[1]) * s;
        const eb = (b - nc[2]) * s;

        const p = rev ? -1 : 1;
        const spread = [
          [x+p,   y,   7/48], [x+p*2, y,   5/48],
          [x-p*2, y+1, 3/48], [x-p,   y+1, 5/48], [x,     y+1, 7/48], [x+p,   y+1, 5/48], [x+p*2, y+1, 3/48],
          [x-p*2, y+2, 1/48], [x-p,   y+2, 3/48], [x,     y+2, 5/48], [x+p,   y+2, 3/48], [x+p*2, y+2, 1/48]
        ];

        for (const [sx, sy, factor] of spread) {
          if (sx >= 0 && sx < w && sy < h) {
            const si = sy * w + sx;
            errors[si * 3] += er * factor;
            errors[si * 3 + 1] += eg * factor;
            errors[si * 3 + 2] += eb * factor;
          }
        }
      }
    }
    return imageData;
  }

  // ---- Dithering: Stucki ----

  function ditherStucki(imageData, w, h, palette, strength, serpentine) {
    const d = imageData.data;
    const s = strength / 100;
    const errors = new Float32Array(w * h * 3);

    for (let i = 0; i < d.length; i += 4) {
      const idx = i / 4;
      errors[idx * 3] = d[i];
      errors[idx * 3 + 1] = d[i + 1];
      errors[idx * 3 + 2] = d[i + 2];
    }

    for (let y = 0; y < h; y++) {
      const rev = serpentine && (y % 2 === 1);
      for (let xi = 0; xi < w; xi++) {
        const x = rev ? w - 1 - xi : xi;
        const idx = y * w + x;
        const r = clamp(errors[idx * 3]);
        const g = clamp(errors[idx * 3 + 1]);
        const b = clamp(errors[idx * 3 + 2]);

        const nc = nearestColor(r, g, b, palette);
        d[idx * 4] = nc[0];
        d[idx * 4 + 1] = nc[1];
        d[idx * 4 + 2] = nc[2];

        const er = (r - nc[0]) * s;
        const eg = (g - nc[1]) * s;
        const eb = (b - nc[2]) * s;

        const p = rev ? -1 : 1;
        const spread = [
          [x+p,   y,   8/42], [x+p*2, y,   4/42],
          [x-p*2, y+1, 2/42], [x-p,   y+1, 4/42], [x,     y+1, 8/42], [x+p,   y+1, 4/42], [x+p*2, y+1, 2/42],
          [x-p*2, y+2, 1/42], [x-p,   y+2, 2/42], [x,     y+2, 4/42], [x+p,   y+2, 2/42], [x+p*2, y+2, 1/42]
        ];

        for (const [sx, sy, factor] of spread) {
          if (sx >= 0 && sx < w && sy < h) {
            const si = sy * w + sx;
            errors[si * 3] += er * factor;
            errors[si * 3 + 1] += eg * factor;
            errors[si * 3 + 2] += eb * factor;
          }
        }
      }
    }
    return imageData;
  }

  // ---- Dithering: Random (Noise) ----

  function ditherRandom(imageData, w, h, palette, strength) {
    const d = imageData.data;
    const s = strength / 100;

    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 128 * s;
      const r = clamp(d[i] + noise);
      const g = clamp(d[i + 1] + noise);
      const b = clamp(d[i + 2] + noise);
      const nc = nearestColor(r, g, b, palette);
      d[i] = nc[0];
      d[i + 1] = nc[1];
      d[i + 2] = nc[2];
    }
    return imageData;
  }

  function runDitherAlgo(algo, imageData, dw, dh, palette, strength, serp) {
    switch (algo) {
      case 'floydSteinberg': return ditherFloydSteinberg(imageData, dw, dh, palette, strength, serp);
      case 'bayer4':         return ditherOrdered(imageData, dw, dh, palette, strength, 4);
      case 'bayer8':         return ditherOrdered(imageData, dw, dh, palette, strength, 8);
      case 'bayer16':        return ditherOrdered(imageData, dw, dh, palette, strength, 16);
      case 'atkinson':       return ditherAtkinson(imageData, dw, dh, palette, strength, serp);
      case 'sierra':         return ditherSierra(imageData, dw, dh, palette, strength, serp);
      case 'jjn':            return ditherJJN(imageData, dw, dh, palette, strength, serp);
      case 'stucki':         return ditherStucki(imageData, dw, dh, palette, strength, serp);
      case 'random':         return ditherRandom(imageData, dw, dh, palette, strength);
      default:               return null;
    }
  }

  function applyDithering(ctx, w, h, params) {
    if (params.ditherAlgo === 'none') return;
    const palette = getPalette(params.ditherPalette, params.ditherColors, params.ditherCustomColors);
    const serp = params.ditherSerpentine || false;
    const blockSize = Math.max(1, Math.round(params.ditherBlockSize || 1));

    if (blockSize > 1) {
      const sw = Math.max(1, Math.floor(w / blockSize));
      const sh = Math.max(1, Math.floor(h / blockSize));
      const small = document.createElement('canvas');
      small.width = sw; small.height = sh;
      const sCtx = small.getContext('2d', { willReadFrequently: true });
      sCtx.imageSmoothingEnabled = true;
      sCtx.drawImage(ctx.canvas, 0, 0, sw, sh);
      const imageData = sCtx.getImageData(0, 0, sw, sh);
      const result = runDitherAlgo(params.ditherAlgo, imageData, sw, sh, palette, params.ditherStrength, serp);
      if (!result) return;
      sCtx.putImageData(result, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
    } else {
      const imageData = ctx.getImageData(0, 0, w, h);
      const result = runDitherAlgo(params.ditherAlgo, imageData, w, h, palette, params.ditherStrength, serp);
      if (!result) return;
      ctx.putImageData(result, 0, 0);
    }
  }

  // ---- ASCII Art ----

  const ASCII_CHARSETS = {
    simple: ' .:-=+*#%@',
    detailed: ' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
    blocks: ' ░▒▓█',
    braille: ' ⠁⠃⠇⡇⡏⡟⡿⣿'
  };

  function generateAscii(ctx, w, h, params) {
    const cellSize = params.asciiCellSize;
    const cellH = cellSize * 2; // compensate for monospace char ~2:1 height:width ratio
    const charset = params.asciiCharset === 'custom'
      ? params.asciiCustomChars
      : ASCII_CHARSETS[params.asciiCharset] || ASCII_CHARSETS.simple;

    if (!charset || charset.length === 0) return { text: '', lines: [], colors: [], cols: 0, rows: 0 };

    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;

    let edgeData = null;
    if (params.asciiEdges) {
      edgeData = detectEdges(d, w, h);
    }

    const cols = Math.floor(w / cellSize);
    const rows = Math.floor(h / cellH);
    const lines = [];
    const colors = [];

    for (let row = 0; row < rows; row++) {
      let line = '';
      const lineColors = [];
      for (let col = 0; col < cols; col++) {
        const x = col * cellSize;
        const y = row * cellH;

        let rr = 0, gg = 0, bb = 0, count = 0;
        for (let dy = 0; dy < cellH && y + dy < h; dy++) {
          for (let dx = 0; dx < cellSize && x + dx < w; dx++) {
            const idx = ((y + dy) * w + (x + dx)) * 4;
            rr += d[idx]; gg += d[idx + 1]; bb += d[idx + 2];
            count++;
          }
        }
        rr = Math.round(rr / count);
        gg = Math.round(gg / count);
        bb = Math.round(bb / count);

        let charIndex;
        if (edgeData) {
          const edgeIdx = (y + Math.floor(cellH / 2)) * w + (x + Math.floor(cellSize / 2));
          const edgeVal = edgeData[edgeIdx] || 0;
          if (edgeVal > 50) {
            const edgeChars = '/\\|-+';
            charIndex = Math.min(Math.floor(edgeVal / 51), edgeChars.length - 1);
            line += edgeChars[charIndex];
          } else {
            const lum = luminance(rr, gg, bb) / 255;
            charIndex = Math.floor(lum * (charset.length - 1));
            line += charset[charIndex];
          }
        } else {
          const lum = luminance(rr, gg, bb) / 255;
          charIndex = Math.floor(lum * (charset.length - 1));
          line += charset[charIndex];
        }
        lineColors.push([rr, gg, bb]);
      }
      lines.push(line);
      colors.push(lineColors);
    }

    return { text: lines.join('\n'), lines, colors, cols, rows };
  }

  // ---- ASCII: Canvas Overlay Rendering ----

  function renderAsciiToCanvas(asciiCanvas, result, params) {
    const cellSize = params.asciiCellSize;
    const opacity = (params.asciiOverlayOpacity !== undefined ? params.asciiOverlayOpacity : 80) / 100;
    const { lines, colors, cols, rows } = result;

    asciiCanvas.width = cols * cellSize;
    asciiCanvas.height = rows * cellSize * 2;

    const ctx = asciiCanvas.getContext('2d');
    ctx.clearRect(0, 0, asciiCanvas.width, asciiCanvas.height);
    ctx.font = `${cellSize * 2}px "Courier New", monospace`;
    ctx.textBaseline = 'top';

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const ch = lines[row] ? lines[row][col] : ' ';
        if (!ch || ch === ' ') continue;
        const [r, g, b] = colors[row][col];
        ctx.fillStyle = `rgba(${r},${g},${b},${opacity})`;
        ctx.fillText(ch, col * cellSize, row * cellSize * 2);
      }
    }
  }

  function detectEdges(data, w, h) {
    const gray = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      gray[i] = luminance(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    }

    const edges = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const gx =
          -gray[(y - 1) * w + (x - 1)] + gray[(y - 1) * w + (x + 1)] +
          -2 * gray[y * w + (x - 1)] + 2 * gray[y * w + (x + 1)] +
          -gray[(y + 1) * w + (x - 1)] + gray[(y + 1) * w + (x + 1)];
        const gy =
          -gray[(y - 1) * w + (x - 1)] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)] +
          gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)];
        edges[y * w + x] = Math.sqrt(gx * gx + gy * gy);
      }
    }
    return edges;
  }

  // ---- Dot Matrix ----

  function applyDotMatrix(ctx, w, h, params) {
    if (!params.dotMatrix || params.dotMatrix === 0) return;

    const gridSize  = Math.max(2, params.dotMatrixSize || 8);
    const shape     = params.dotMatrixShape || 'circle';
    const bg        = params.dotMatrixBg || '#000000';
    const intensity = params.dotMatrix / 100;
    const layout    = params.dotMatrixLayout || 'grid';
    const colorMode = params.dotMatrixColorMode || 'original';
    const monoColor = hexToRgb(params.dotMatrixColor || '#ffffff');
    const invert    = params.dotMatrixInvert || false;
    const soft      = params.dotMatrixSoft || false;
    const gamma     = Math.max(0.2, Math.min(3.0, params.dotMatrixGamma || 1.0));
    const halfGrid  = gridSize / 2;

    const snapshot = ctx.getImageData(0, 0, w, h);
    const sd = snapshot.data;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const rows = Math.ceil(h / gridSize);
    const cols = Math.ceil(w / gridSize);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let cx = col * gridSize + halfGrid;
        const cy = row * gridSize + halfGrid;
        if (layout === 'brick' && row % 2 === 1) cx += halfGrid;

        // Average color from snapshot region around center
        const x0 = Math.max(0, Math.round(cx - halfGrid));
        const y0 = Math.max(0, Math.round(cy - halfGrid));
        const x1 = Math.min(w - 1, Math.round(cx + halfGrid));
        const y1 = Math.min(h - 1, Math.round(cy + halfGrid));

        let rr = 0, gg = 0, bb = 0, count = 0;
        for (let py = y0; py <= y1; py++) {
          for (let px = x0; px <= x1; px++) {
            const i = (py * w + px) * 4;
            rr += sd[i]; gg += sd[i + 1]; bb += sd[i + 2];
            count++;
          }
        }
        if (count === 0) continue;
        rr = Math.round(rr / count);
        gg = Math.round(gg / count);
        bb = Math.round(bb / count);

        const lum = luminance(rr, gg, bb) / 255;
        const base = invert ? lum : 1 - lum;
        const mappedLum = Math.pow(Math.max(0, Math.min(1, base)), gamma);
        const radius = mappedLum * halfGrid * intensity;

        if (radius < 0.3) continue;

        // Determine draw color
        let dr, dg, db;
        if (colorMode === 'mono') {
          [dr, dg, db] = monoColor;
        } else if (colorMode === 'invert') {
          dr = 255 - rr; dg = 255 - gg; db = 255 - bb;
        } else {
          dr = rr; dg = gg; db = bb;
        }

        ctx.beginPath();

        if (shape === 'circle') {
          if (soft) {
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
            grad.addColorStop(0, `rgba(${dr},${dg},${db},1)`);
            grad.addColorStop(1, `rgba(${dr},${dg},${db},0)`);
            ctx.fillStyle = grad;
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = `rgb(${dr},${dg},${db})`;
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (shape === 'square') {
          ctx.fillStyle = `rgb(${dr},${dg},${db})`;
          ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
        } else if (shape === 'diamond') {
          ctx.fillStyle = `rgb(${dr},${dg},${db})`;
          ctx.moveTo(cx, cy - radius);
          ctx.lineTo(cx + radius, cy);
          ctx.lineTo(cx, cy + radius);
          ctx.lineTo(cx - radius, cy);
          ctx.closePath();
          ctx.fill();
        } else if (shape === 'ring') {
          ctx.fillStyle = `rgb(${dr},${dg},${db})`;
          const inner = Math.max(0, radius * 0.45);
          ctx.arc(cx, cy, radius, 0, Math.PI * 2, false);
          ctx.arc(cx, cy, inner, 0, Math.PI * 2, true);
          ctx.fill('evenodd');
        } else if (shape === 'cross') {
          ctx.fillStyle = `rgb(${dr},${dg},${db})`;
          const t = Math.max(1, radius * 0.35);
          ctx.fillRect(cx - radius, cy - t, radius * 2, t * 2);
          ctx.fillRect(cx - t, cy - radius, t * 2, radius * 2);
        }
      }
    }
  }

  // ---- Public API ----

  return {
    applyAdjustments,
    applyPosterize,
    applySepia,
    applyInvert,
    applyDuotone,
    applyPixelate,
    applyScanlines,
    applyHalftone,
    applyGlitch,
    applyDithering,
    generateAscii,
    renderAsciiToCanvas,
    applyDotMatrix,
    luminance,
    hexToRgb,
    PALETTES,
    getPalette
  };

})();
