import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // ── Verify caller JWT ─────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: 'Invalid or expired token' }, 401);

    const body = await req.json();
    const { action, schoolId } = body;

    if (!schoolId) return json({ error: 'schoolId is required' }, 400);

    // ── Verify caller is admin/owner of this school ───────────
    const { data: caller, error: callerErr } = await adminClient
      .from('teachers')
      .select('role')
      .eq('user_id', user.id)
      .eq('school_id', schoolId)
      .single();

    if (callerErr || !caller) {
      return json({ error: 'No staff record found for your account in this school' }, 403);
    }

    if (!['admin', 'owner'].includes(caller.role)) {
      return json({ error: `Insufficient permissions. Your role is "${caller.role}". Admin or owner required.` }, 403);
    }

    // ── Action dispatcher ─────────────────────────────────────
    switch (action) {

      // ── Atomic: create auth user + teacher record ──────────
      case 'create_teacher': {
        const { email, password, full_name, role, subjects, class_teacher_for } = body;
        if (!email || !password || !full_name) {
          return json({ error: 'email, password, and full_name are required' }, 400);
        }

        // Duplicate check within this school
        const { data: existing } = await adminClient
          .from('teachers')
          .select('id')
          .eq('email', email)
          .eq('school_id', schoolId)
          .maybeSingle();
        if (existing) {
          return json({ error: 'A staff member with this email already exists in your school.' }, 409);
        }

        // Create auth user
        const { data: authData, error: createErr } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name, role: role || 'teacher' },
        });
        if (createErr) {
          const msg = createErr.message ?? '';
          if (msg.includes('already registered') || msg.includes('already exists')) {
            return json({ error: 'This email is already registered in the system.' }, 409);
          }
          return json({ error: msg || 'Failed to create auth user' }, 400);
        }

        const authUser = authData.user;

        // Insert teacher record — rollback auth user if it fails
        const { data: teacher, error: insertErr } = await adminClient
          .from('teachers')
          .insert([{
            user_id: authUser.id,
            school_id: schoolId,
            full_name,
            email,
            role: role || 'teacher',
            subjects: subjects || [],
            class_teacher_for: class_teacher_for || null,
            is_active: true,
          }])
          .select()
          .single();

        if (insertErr) {
          await adminClient.auth.admin.deleteUser(authUser.id);
          return json({ error: `Failed to create staff record: ${insertErr.message}` }, 500);
        }

        return json({ user: authUser, teacher });
      }

      // ── Atomic: create auth user + parent record ───────────
      case 'create_parent': {
        const { email, password, full_name, phone } = body;
        if (!email || !password || !full_name) {
          return json({ error: 'email, password, and full_name are required' }, 400);
        }

        const { data: existing } = await adminClient
          .from('parents')
          .select('id')
          .eq('email', email)
          .eq('school_id', schoolId)
          .maybeSingle();
        if (existing) {
          return json({ error: 'A parent with this email already exists in your school.' }, 409);
        }

        const { data: authData, error: createErr } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name, role: 'parent' },
        });
        if (createErr) return json({ error: createErr.message }, 400);

        const authUser = authData.user;

        const { data: parent, error: insertErr } = await adminClient
          .from('parents')
          .insert([{
            user_id: authUser.id,
            school_id: schoolId,
            full_name,
            email,
            phone: phone || null,
            status: 'active',
          }])
          .select()
          .single();

        if (insertErr) {
          await adminClient.auth.admin.deleteUser(authUser.id);
          return json({ error: `Failed to create parent record: ${insertErr.message}` }, 500);
        }

        return json({ user: authUser, parent });
      }

      // ── Delete user (auth + cascade via FK) ────────────────
      case 'delete': {
        const { userId } = body;
        if (!userId) return json({ error: 'userId is required' }, 400);

        // Verify target belongs to this school
        const [{ data: tgtTeacher }, { data: tgtParent }] = await Promise.all([
          adminClient.from('teachers').select('id, role').eq('user_id', userId).eq('school_id', schoolId).maybeSingle(),
          adminClient.from('parents').select('id').eq('user_id', userId).eq('school_id', schoolId).maybeSingle(),
        ]);

        if (!tgtTeacher && !tgtParent) {
          return json({ error: 'User not found in this school' }, 404);
        }
        if (tgtTeacher?.role === 'owner') {
          return json({ error: 'Cannot delete the school owner account' }, 403);
        }

        const { error: delErr } = await adminClient.auth.admin.deleteUser(userId);
        if (delErr) return json({ error: delErr.message }, 400);

        return json({ success: true });
      }

      // ── Update auth user ───────────────────────────────────
      case 'update': {
        const { userId, email, password, user_metadata } = body;
        if (!userId) return json({ error: 'userId is required' }, 400);

        const [{ data: tgtTeacher }, { data: tgtParent }] = await Promise.all([
          adminClient.from('teachers').select('id').eq('user_id', userId).eq('school_id', schoolId).maybeSingle(),
          adminClient.from('parents').select('id').eq('user_id', userId).eq('school_id', schoolId).maybeSingle(),
        ]);

        if (!tgtTeacher && !tgtParent) {
          return json({ error: 'User not found in this school' }, 404);
        }

        const updates: Record<string, unknown> = {};
        if (email) updates.email = email;
        if (password) updates.password = password;
        if (user_metadata) updates.user_metadata = user_metadata;

        const { data: updatedUser, error: updateErr } = await adminClient.auth.admin.updateUserById(userId, updates);
        if (updateErr) return json({ error: updateErr.message }, 400);

        return json({ user: updatedUser });
      }

      // ── Legacy: bare auth user creation ───────────────────
      case 'create': {
        const { email, password, metadata } = body;
        if (!email || !password) return json({ error: 'email and password are required' }, 400);

        const { data: authData, error: createErr } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: metadata || {},
        });
        if (createErr) return json({ error: createErr.message }, 400);

        return json({ user: authData.user });
      }

      default:
        return json({ error: `Unknown action: "${action}"` }, 400);
    }
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected server error' }, 500);
  }
});
