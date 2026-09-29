'use client';
import { createContext, useContext } from 'react';
import { DEFAULT_BADGE_ORDER } from '@/lib/format';

const Ctx = createContext<string[]>(DEFAULT_BADGE_ORDER);

/** Lapas noklusētā zīmju svarīguma secība (no admina iestatījumiem). */
export function BadgeOrderProvider({ order, children }: { order: string[]; children: React.ReactNode }) {
  return <Ctx.Provider value={order}>{children}</Ctx.Provider>;
}

export const useBadgeOrder = () => useContext(Ctx);
