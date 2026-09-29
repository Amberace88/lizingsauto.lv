'use client';
import { createContext, useContext } from 'react';
import { DEFAULT_BADGE_ORDER, type BadgeStyle } from '@/lib/format';

const DEFAULT: BadgeStyle = { order: DEFAULT_BADGE_ORDER, colors: {}, position: 'top', shape: 'pill' };
const Ctx = createContext<BadgeStyle>(DEFAULT);

/** Zīmju izskats visā lapā: secība, krāsas, novietojums, forma (no admina iestatījumiem). */
export function BadgeStyleProvider({ value, children }: { value: BadgeStyle; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useBadgeStyle = () => useContext(Ctx);
export const useBadgeOrder = () => useContext(Ctx).order;
