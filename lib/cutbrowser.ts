// Makes the cut-out of a picture drawn on black, in the browser (components/CutImg.tsx): load it, cut the black away (lib/cutout.ts), trim to what is left, shrink to `width`, and
// give back an object URL of the PNG (null when anything goes wrong). Browser only.
import { cutBlack } from './cutout';

export function cutOut(src: string, width = 288): Promise<string | null> {
  return new Promise((done) => {
    const im = new Image();
    im.onerror = () => done(null);
    im.onload = () => {
      try {
        const w = im.naturalWidth, h = im.naturalHeight;
        if (!w || !h) return done(null);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const g = c.getContext('2d', { willReadFrequently: true });
        if (!g) return done(null);
        g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, w, h), box = cutBlack(d.data, w, h);
        if (!box) return done(null);
        g.putImageData(d, 0, 0);
        const k = Math.min(1, width / box.w), o = document.createElement('canvas');
        o.width = Math.max(1, Math.round(box.w * k)); o.height = Math.max(1, Math.round(box.h * k));
        const og = o.getContext('2d');
        if (!og) return done(null);
        og.imageSmoothingQuality = 'high';
        og.drawImage(c, box.x, box.y, box.w, box.h, 0, 0, o.width, o.height);   // scaling the cut canvas smooths the edge of the cut
        o.toBlob((b) => done(b ? URL.createObjectURL(b) : null), 'image/png');
      } catch { done(null); }
    };
    im.src = src;
  });
}
