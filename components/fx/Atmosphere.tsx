'use client';
import type { CSSProperties } from 'react';

// The world behind the interface (styles in app/ds/atmosphere.css): a painted scene that follows the mode (dawn while wandering,
// night while in seclusion), an aura tint from the hero's element, a vignette and a little grain. It is STATIC: nothing here is animated every frame
// (a full-screen particle canvas, drifting mist and pointer parallax used to repaint the whole window and made the page lag). The drifting qi and the waves
// live in the small ornament in the header (QiWidget).

const ZONE_IDS = ['thanhvan', 'hannguyet', 'xichviem', 'loivan', 'cuuu', 'tinhha'] as const;

export function Atmosphere({ scene = 'night', aura = '#62cfae', zone }: { scene?: 'night' | 'dawn'; aura?: string; zone?: string }) {

  return (
    <div className="atmo" style={{ '--aura': aura } as CSSProperties} aria-hidden="true">
      <div className={`atmo-scene night ${!zone && scene === 'night' ? 'on' : ''}`} />
      <div className={`atmo-scene dawn ${!zone && scene === 'dawn' ? 'on' : ''}`} />
      {ZONE_IDS.map((id) => <div key={id} className={`atmo-scene zone z-${id} ${scene} ${zone === id ? 'on' : ''}`} />)}
      <div className="atmo-tint" />
      <div className="atmo-vignette" />
      <div className="atmo-grain" />
    </div>
  );
}
