// Reads a PowerPoint mood board: slide images + theme colours + a palette pulled from the images.
import JSZip from 'jszip';

export async function readMoodBoard(file) {
  const zip = await JSZip.loadAsync(file);
  const images = [];
  const media = Object.keys(zip.files).filter((n) => /^ppt\/media\/.+\.(png|jpe?g|gif|webp)$/i.test(n));
  for (const name of media) {
    const blob = await zip.file(name).async('blob');
    if (blob.size < 15000) continue; // skip icons / bullets
    images.push(await blobToDataUrl(blob, 900));
  }

  const themeColors = [];
  const theme = zip.file('ppt/theme/theme1.xml');
  if (theme) {
    const xml = await theme.async('string');
    const scheme = xml.match(/<a:clrScheme[\s\S]*?<\/a:clrScheme>/)?.[0] || '';
    for (const m of scheme.matchAll(/<a:(accent\d|dk2|lt2)>[\s\S]*?(?:srgbClr val|lastClr)="([0-9A-Fa-f]{6})"/g)) themeColors.push('#' + m[2].toLowerCase());
  }

  // all slide text, used to recognise furniture names written on the slides
  let text = '';
  for (const name of Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))) {
    const xml = await zip.file(name).async('string');
    text += ' ' + [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(' ');
  }

  const imgColors = await paletteFromImages(images.slice(0, 12));
  const palette = dedupe([...imgColors, ...themeColors]).slice(0, 12);
  return { images, palette, text };
}

export function blobToDataUrl(blob, maxSize) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Could not open this image'));
    img.onload = () => {
      const k = Math.min(1, maxSize / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = img.width * k; c.height = img.height * k;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.src = URL.createObjectURL(blob);
  });
}

// Simple k-means over sampled pixels of all mood images.
export async function paletteFromImages(urls, k = 8) {
  const px = [];
  for (const url of urls) {
    const img = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = url; });
    const c = document.createElement('canvas'); c.width = 48; c.height = 48;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, 48, 48);
    const d = ctx.getImageData(0, 0, 48, 48).data;
    for (let i = 0; i < d.length; i += 16) px.push([d[i], d[i + 1], d[i + 2]]);
  }
  if (!px.length) return [];
  let centers = Array.from({ length: k }, (_, i) => px[Math.floor((i * px.length) / k)]);
  for (let iter = 0; iter < 10; iter++) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (const p of px) {
      let best = 0, bd = Infinity;
      centers.forEach((c, j) => { const dd = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2; if (dd < bd) { bd = dd; best = j; } });
      const s = sums[best]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++;
    }
    centers = sums.map((s, j) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : centers[j]));
    centers.counts = sums.map((s) => s[3]);
  }
  const counts = centers.counts || [];
  return centers.map((c, i) => ({ c, n: counts[i] || 0 })).sort((a, b) => b.n - a.n)
    .map(({ c }) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''));
}

export function dedupe(colors) {
  const out = [];
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  for (const c of colors) {
    const a = rgb(c);
    if (out.every((o) => { const b = rgb(o); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 28; })) out.push(c);
  }
  return out;
}
