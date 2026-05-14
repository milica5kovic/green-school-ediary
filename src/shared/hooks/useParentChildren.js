import { useState, useEffect } from 'react';
import { useApp } from '../../core/context/AppContext';

const useParentChildren = () => {
  const { supabase } = useApp();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data: parent } = await supabase.from('parents').select('id').eq('user_id', user.id).single();
        if (!parent) { setLoading(false); return; }
        const { data: links } = await supabase.from('student_parents').select('students(*)').eq('parent_id', parent.id);
        const list = links?.map(l => l.students).filter(Boolean) || [];
        setChildren(list);
        if (list.length > 0) setSelectedChild(list[0]);
      } catch (err) { console.error('useParentChildren error:', err); }
      finally { setLoading(false); }
    })();
  }, [supabase]);

  return { children, selectedChild, setSelectedChild, loading };
};

export default useParentChildren;
