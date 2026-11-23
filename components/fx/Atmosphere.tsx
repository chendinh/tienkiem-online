'use client';
import { useEffect, useState, type CSSProperties } from 'react';

// The world behind the interface (styles in app/ds/atmosphere.css): a painted scene that follows the mode (dawn while wandering,
// night while in seclusion), an aura tint from the hero's element, a vignette and a little grain. It is STATIC: nothing here is animated every frame
// (a full-screen particle canvas, drifting mist and pointer parallax used to repaint the whole window and made the page lag). The drifting qi and the waves
// live in the small ornament in the header (QiWidget).
//
// Only the picture that is showing is in the page (and, for the length of a cross-fade, the one it replaces). All eight used to be mounted at opacity 0: the phone
// downloaded every zone picture (a tall and a wide one each, about 7 MB) on the first visit and kept a full-screen layer of each in memory for nothing.

const ZONE_IDS = ['thanhvan', 'hannguyet', 'xichviem', 'loivan', 'cuuu', 'tinhha'] as const;
const LAYERS = ['night', 'dawn', ...ZONE_IDS] as const;   // stacking order, as before
type Layer = (typeof LAYERS)[number];
const FADE_MS = 1500;   // a little longer than --dur-ambient (1200 ms), the cross-fade of a scene change

export function Atmosphere({ scene = 'night', aura = '#62cfae', zone }: { scene?: 'night' | 'dawn'; aura?: string; zone?: string }) {
  // the picture that should show: the zone's, else the night or dawn scene (a zone with no picture shows none, as before)
  const want: Layer | null = zone ? ((ZONE_IDS as readonly string[]).includes(zone) ? (zone as Layer) : null) : scene;
  const [on, setOn] = useState<Layer | null>(want);   // the layer that is faded in
  const [mounted, setMounted] = useState<Layer[]>(want ? [want] : []);   // what is in the page: the showing layer, plus one that is still fading out

  useEffect(() => {
    // A new picture: put it in the page (still transparent), switch it on two frames later so the browser has painted it and the opacity transition runs,
    // then drop the one it replaced when the cross-fade is over.
    setMounted((m) => (want && !m.includes(want) ? [...m, want] : m));
    let r2 = 0, tm = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        setOn(want);
        tm = window.setTimeout(() => setMounted((m) => (m.length === (want ? 1 : 0) && (!want || m[0] === want) ? m : want ? [want] : [])), FADE_MS);
      });
    });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); clearTimeout(tm); };
  }, [want]);

  return (
    <div className="atmo" style={{ '--aura': aura } as CSSProperties} aria-hidden="true">
      {LAYERS.filter((k) => mounted.includes(k)).map((k) => (k === 'night' || k === 'dawn'
        ? <div key={k} className={`atmo-scene ${k} ${on === k ? 'on' : ''}`} />
        : <div key={k} className={`atmo-scene zone z-${k} ${scene} ${on === k ? 'on' : ''}`} />))}
      <div className="atmo-tint" />
      <div className="atmo-vignette" />
      <div className="atmo-grain" />
    </div>
  );
}
