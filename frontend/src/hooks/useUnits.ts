import { useEffect, useState } from 'react';
import { unitsApi, Unit } from '@/modules/settings/services/units.api';

let cache: Unit[] | null = null;
let inflight: Promise<Unit[]> | null = null;
const subscribers = new Set<(u: Unit[]) => void>();

function notify(u: Unit[]) {
  cache = u;
  subscribers.forEach((cb) => cb(u));
}

export async function loadUnits(force = false): Promise<Unit[]> {
  if (!force && cache) return cache;
  if (inflight && !force) return inflight;
  inflight = unitsApi.list({ active: true }).then((list) => {
    notify(list);
    inflight = null;
    return list;
  }).catch((e) => {
    inflight = null;
    throw e;
  });
  return inflight;
}

export function invalidateUnitsCache() {
  cache = null;
}

export function useUnits() {
  const [units, setUnits] = useState<Unit[]>(cache || []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    subscribers.add(setUnits);
    if (!cache) {
      loadUnits().then((u) => {
        setUnits(u);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
    return () => { subscribers.delete(setUnits); };
  }, []);

  const getLabel = (code?: string | null) => {
    if (!code) return '';
    const u = units.find((x) => x.code === code);
    return u ? u.name : code;
  };

  return { units, loading, getLabel };
}
