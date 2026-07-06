import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../../../core/context/AppContext';

export default function useReportPeriods() {
  const { services } = useApp();
  const rs = services.reports;

  const [periods, setPeriods]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activePeriod, setActive] = useState(null);

  const load = useCallback(async () => {
    if (!rs) return;
    try {
      setLoading(true);
      setError(null);
      const data = await rs.getPeriods();
      setPeriods(data);
      if (!activePeriod && data.length > 0) {
        const open = data.find(p => p.status === 'open') || data[0];
        setActive(open);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [rs]);

  useEffect(() => { load(); }, [load]);

  const createPeriod = useCallback(async (periodData) => {
    const p = await rs.createPeriod(periodData);
    await rs.openPeriod(p.id);
    setPeriods(prev => [p, ...prev]);
    setActive(p);
    return p;
  }, [rs]);

  const updatePeriod = useCallback(async (id, updates) => {
    const p = await rs.updatePeriod(id, updates);
    setPeriods(prev => prev.map(x => x.id === id ? p : x));
    if (activePeriod?.id === id) setActive(p);
    return p;
  }, [rs, activePeriod]);

  return { periods, loading, error, activePeriod, setActivePeriod: setActive, createPeriod, updatePeriod, refresh: load };
}
