import { ImageResponse } from 'next/og';

export const alt = 'LīzingsAuto — lietoti auto ar līzingu Rīgā';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0b464d', padding: 72, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <svg width="84" height="84" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#fff" /><path d="M14 42a18 18 0 0 1 36 0" fill="none" stroke="#f5b301" strokeWidth="6" strokeLinecap="round" /><path d="M32 42 41 27" stroke="#0f5a63" strokeWidth="5" strokeLinecap="round" /><circle cx="32" cy="42" r="4.5" fill="#0f5a63" /></svg>
          <div style={{ fontSize: 48, fontWeight: 800 }}>LizingsAuto</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>Auto ar lizingu.</div>
          <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, color: '#f5b301' }}>Ari tad, ja banka atteica.</div>
        </div>
        <div style={{ fontSize: 30, color: 'rgba(255,255,255,.75)' }}>No 0% pirmas iemaksas  |  Garantija lidz 36 men.  |  Riga</div>
      </div>
    ),
    size,
  );
}
