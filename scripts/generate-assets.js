#!/usr/bin/env node
/**
 * Gera ícones e splash do "Fuja do Sol!" sem dependências externas.
 * Rasterizador por SDF (signed distance fields) com supersampling 3x3 e
 * encoder PNG próprio (zlib nativo do Node).
 *
 * Uso: node scripts/generate-assets.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'assets');

// ---------- PNG encoder ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(width, height, rgba, withAlpha) {
  const channels = withAlpha ? 4 : 3;
  const stride = width * channels + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = y * stride + 1 + x * channels;
      raw[di] = rgba[si];
      raw[di + 1] = rgba[si + 1];
      raw[di + 2] = rgba[si + 2];
      if (withAlpha) raw[di + 3] = rgba[si + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = withAlpha ? 6 : 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- helpers ----------
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (d, aa) => clamp01(0.5 - d / aa); // coverage from signed distance

function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - hw + r;
  const qy = Math.abs(py - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
const sdCircle = (px, py, cx, cy, r) => Math.hypot(px - cx, py - cy) - r;

/**
 * Cena do ícone em coordenadas normalizadas [0,1]^2.
 * Retorna [r,g,b,a] (0..255, a 0..1).
 *  - Céu em gradiente (dourado -> laranja -> magenta)
 *  - Sol com raios à esquerda
 *  - Janela de veículo arredondada com metade direita em sombra índigo
 */
function iconScene(u, v, opts) {
  const { background = true, scale = 1 } = opts;
  // recentraliza para permitir margens (splash / adaptive)
  const x = (u - 0.5) / scale + 0.5;
  const y = (v - 0.5) / scale + 0.5;
  const aa = 1.6 / (opts.size * scale);

  let col = [0, 0, 0];
  let alpha = 0;
  if (background) {
    const t = clamp01(v * 0.85 + u * 0.15);
    col = t < 0.55 ? mix(hex('#FFD66B'), hex('#FF9500'), t / 0.55) : mix(hex('#FF9500'), hex('#FF4F6D'), (t - 0.55) / 0.45);
    alpha = 1;
  }
  const over = (c, a) => {
    col = mix(col, c, a);
    alpha = alpha + a * (1 - alpha);
  };

  // Janela (moldura)
  const wx = 0.5, wy = 0.53, whw = 0.33, whh = 0.27, wr = 0.12;
  const dWin = sdRoundRect(x, y, wx, wy, whw, whh, wr);
  const dInner = sdRoundRect(x, y, wx, wy, whw - 0.035, whh - 0.035, wr - 0.03);

  // sombra projetada suave da janela
  if (background) {
    const dShadow = sdRoundRect(x, y - 0.02, wx, wy + 0.02, whw, whh, wr);
    over([120, 30, 40], 0.18 * clamp01(0.5 - dShadow / 0.05));
  }
  // moldura branca
  over(hex('#FFF8EC'), smooth(dWin, aa));

  // interior: metade esquerda céu ensolarado, metade direita sombra índigo
  const inside = smooth(dInner, aa);
  if (inside > 0) {
    const split = 0.5 + (y - wy) * 0.35; // divisória levemente inclinada
    const sunSide = smooth(x - split, aa);
    const sunny = mix(hex('#FFE7A3'), hex('#FFC247'), clamp01((y - (wy - whh)) / (2 * whh)));
    const shade = mix(hex('#3A3FB8'), hex('#1B1F5E'), clamp01((y - (wy - whh)) / (2 * whh)));
    over(mix(shade, sunny, sunSide), inside);

    // Sol + raios no lado esquerdo
    const sx = 0.36, sy = 0.47, sr = 0.085;
    const dSun = sdCircle(x, y, sx, sy, sr);
    let rays = 1e9;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const rx = sx + Math.cos(a) * (sr + 0.055);
      const ry = sy + Math.sin(a) * (sr + 0.055);
      // raio como cápsula curta
      const ax = sx + Math.cos(a) * (sr + 0.03), ay = sy + Math.sin(a) * (sr + 0.03);
      const bx = rx, by = ry;
      const pax = x - ax, pay = y - ay, bax = bx - ax, bay = by - ay;
      const h = clamp01((pax * bax + pay * bay) / (bax * bax + bay * bay));
      rays = Math.min(rays, Math.hypot(pax - bax * h, pay - bay * h) - 0.014);
    }
    const sunMask = inside * smooth(Math.min(dSun, rays), aa);
    over(hex('#FF8A00'), sunMask * 0.95);
    over(hex('#FFF1B8'), inside * smooth(sdCircle(x, y, sx - 0.02, sy - 0.02, sr * 0.45), aa) * 0.55);

    // Lua crescente discreta no lado da sombra (frescor)
    const mx = 0.66, my = 0.6;
    const dMoon = Math.max(sdCircle(x, y, mx, my, 0.06), -sdCircle(x, y, mx + 0.03, my - 0.025, 0.05));
    over(hex('#C9CCFF'), inside * smooth(dMoon, aa) * 0.9);
  }
  return [col[0], col[1], col[2], alpha];
}

function render(size, opts) {
  const px = new Uint8ClampedArray(size * size * 4);
  const SS = 3;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sj = 0; sj < SS; sj++) {
        for (let si = 0; si < SS; si++) {
          const u = (i + (si + 0.5) / SS) / size;
          const v = (j + (sj + 0.5) / SS) / size;
          const c = iconScene(u, v, { ...opts, size });
          r += c[0] * c[3];
          g += c[1] * c[3];
          b += c[2] * c[3];
          a += c[3];
        }
      }
      const n = SS * SS;
      const o = (j * size + i) * 4;
      const alpha = a / n;
      px[o] = alpha > 0 ? r / a : 0;
      px[o + 1] = alpha > 0 ? g / a : 0;
      px[o + 2] = alpha > 0 ? b / a : 0;
      px[o + 3] = Math.round(alpha * 255);
    }
  }
  return px;
}

/** Ícone monocromático (silhueta do sol) para notificações Android. */
function renderNotification(size) {
  const px = new Uint8ClampedArray(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i + 0.5) / size, y = (j + 0.5) / size;
      let d = sdCircle(x, y, 0.5, 0.5, 0.2);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        d = Math.min(d, sdCircle(x, y, 0.5 + Math.cos(a) * 0.34, 0.5 + Math.sin(a) * 0.34, 0.05));
      }
      const o = (j * size + i) * 4;
      px[o] = px[o + 1] = px[o + 2] = 255;
      px[o + 3] = Math.round(smooth(d, 1.5 / size) * 255);
    }
  }
  return px;
}

function write(name, size, data, alpha) {
  fs.writeFileSync(path.join(OUT, name), encodePNG(size, size, data, alpha));
  console.log(`  ✓ assets/${name} (${size}x${size}${alpha ? ', RGBA' : ', RGB'})`);
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  console.log('Gerando assets do Fuja do Sol!');
  // App Store exige ícone 1024x1024 SEM canal alfa.
  write('icon.png', 1024, render(1024, { background: true, scale: 1 }), false);
  write('splash-icon.png', 512, render(512, { background: false, scale: 0.92 }), true);
  write('adaptive-icon.png', 1024, render(1024, { background: false, scale: 0.62 }), true);
  write('favicon.png', 48, render(48, { background: true, scale: 1 }), false);
  write('notification-icon.png', 96, renderNotification(96), true);
}

if (require.main === module) main();
module.exports = { encodePNG, crc32 };
