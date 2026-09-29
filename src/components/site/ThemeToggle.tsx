'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Theme = 'light' | 'dark';

/** Ilustrēts dienas/nakts slēdzis: saule ar mākoņiem ↔ mēness ar zvaigznēm. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as Theme) || 'light');
  }, []);
  const dark = theme === 'dark';
  const toggle = () => {
    const next: Theme = dark ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('ta_theme', next);
    } catch {}
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Ieslēgt dienas režīmu' : 'Ieslēgt nakts režīmu'}
      title={dark ? 'Dienas režīms' : 'Nakts režīms'}
      onClick={toggle}
      className={`relative h-8 w-[60px] shrink-0 overflow-hidden rounded-full shadow-inner outline-offset-2 transition-[box-shadow] hover:shadow-[0_0_0_3px_rgba(217,29,43,.25)] ${className}`}
    >
      {/* Debesis */}
      <span className="absolute inset-0 transition-opacity duration-500" style={{ background: 'linear-gradient(180deg,#5db8f5 0%,#a9dcff 100%)', opacity: dark ? 0 : 1 }} />
      <span className="absolute inset-0 transition-opacity duration-500" style={{ background: 'linear-gradient(180deg,#0b1026 0%,#1f2a4d 100%)', opacity: dark ? 1 : 0 }} />
      <AnimatePresence initial={false}>
        {dark ? (
          <motion.span key="stars" className="absolute inset-0" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.4 }}>
            {[[8, 7, 2], [16, 18, 1.5], [24, 9, 1.2], [13, 25, 1], [30, 21, 1.6]].map(([x, y, r], i) => (
              <motion.span
                key={i}
                className="absolute rounded-full bg-white"
                style={{ left: x, top: y, width: r * 2, height: r * 2 }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.6 + i * 0.3, repeat: Infinity }}
              />
            ))}
          </motion.span>
        ) : (
          <motion.span key="clouds" className="absolute inset-0" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.4 }}>
            <svg viewBox="0 0 60 32" className="absolute inset-0 h-full w-full" aria-hidden>
              <g fill="#fff">
                <ellipse cx="42" cy="22" rx="9" ry="4.5" opacity=".95" />
                <ellipse cx="47" cy="19" rx="5.5" ry="4.5" opacity=".95" />
                <ellipse cx="38" cy="20" rx="4.5" ry="3.5" opacity=".95" />
                <ellipse cx="52" cy="27" rx="8" ry="3.2" opacity=".8" />
              </g>
            </svg>
          </motion.span>
        )}
      </AnimatePresence>
      {/* Saule / mēness */}
      <motion.span
        className="absolute top-1 h-6 w-6 rounded-full"
        animate={{ x: dark ? 32 : 4, rotate: dark ? 0 : 180 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        style={{
          background: dark ? 'radial-gradient(circle at 35% 35%,#fbfbff,#cfd3e6)' : 'radial-gradient(circle at 40% 40%,#fff1a8,#ffc21a)',
          boxShadow: dark ? '0 0 10px 2px rgba(210,215,255,.45)' : '0 0 12px 4px rgba(255,200,40,.6)',
        }}
      >
        {dark && (
          <>
            <span className="absolute left-[5px] top-[6px] h-[5px] w-[5px] rounded-full bg-[#b6bbd2]" />
            <span className="absolute left-[13px] top-[13px] h-[4px] w-[4px] rounded-full bg-[#b6bbd2]" />
            <span className="absolute left-[12px] top-[4px] h-[3px] w-[3px] rounded-full bg-[#c3c7db]" />
          </>
        )}
      </motion.span>
    </button>
  );
}

