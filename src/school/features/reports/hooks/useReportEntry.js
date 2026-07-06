import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../../../core/context/AppContext';

export default function useReportEntry(entryId) {
  const { services } = useApp();
  const rs = services.reports;

  const [entry, setEntry]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const save = useCallback(async (updates) => {
    if (!entryId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await rs.saveEntry(entryId, updates);
      setEntry(updated);
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [rs, entryId]);

  return { entry, setEntry, saving, error, save };
}
