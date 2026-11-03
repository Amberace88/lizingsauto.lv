'use client';
import { createContext, useContext } from 'react';
import { DEFAULT_BADGE_STYLE, type BadgeStyle } from '@/lib/badges';

const Ctx = createContext<BadgeStyle>(DEFAULT_BADGE_STYLE);

/** Zīmju izskats visā lapā: secība, krāsas, novietojums, forma (no admina iestatījumiem). */
export function BadgeStyleProvider({ value, children }: { value: BadgeStyle; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useBadgeStyle = () => useContext(Ctx);
export const useBadgeOrder = () => useContext(Ctx).order;
