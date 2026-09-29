'use client';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

const KEY = 'la_fav_v1';
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}
let snapshot: string[] = [];
let snapshotRaw = '';
function getSnapshot() {
  let raw = '[]';
  try {
    raw = localStorage.getItem(KEY) || '[]';
  } catch {}
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    snapshot = read();
  }
  return snapshot;
}
const empty: string[] = [];
function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, () => empty);
  const toggle = useCallback((id: string) => {
    const cur = read();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    listeners.forEach((l) => l());
  }, []);
  return { ids, toggle, has: (id: string) => ids.includes(id) };
}

/** Salīdzināšana (līdz 3 auto) */
const CKEY = 'la_cmp_v1';
export function useCompare() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      setIds(JSON.parse(localStorage.getItem(CKEY) || '[]'));
    } catch {}
    const on = () => {
      try {
        setIds(JSON.parse(localStorage.getItem(CKEY) || '[]'));
      } catch {}
    };
    window.addEventListener('la-compare', on);
    return () => window.removeEventListener('la-compare', on);
  }, []);
  const toggle = (id: string) => {
    let next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    if (next.length > 3) next = next.slice(-3);
    try {
      localStorage.setItem(CKEY, JSON.stringify(next));
    } catch {}
    setIds(next);
    window.dispatchEvent(new Event('la-compare'));
  };
  const clear = () => {
    try {
      localStorage.removeItem(CKEY);
    } catch {}
    setIds([]);
    window.dispatchEvent(new Event('la-compare'));
  };
  return { ids, toggle, clear, has: (id: string) => ids.includes(id) };
}
