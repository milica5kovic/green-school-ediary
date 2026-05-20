-- ============================================================================
-- GDPR TABLES — run in Supabase SQL Editor
-- Creates user_consents and deletion_requests tables with RLS.
-- Safe to run multiple times (uses IF NOT EXISTS).
-- ============================================================================

-- ── user_consents ─────────────────────────────────────────────────────────────
-- Tracks GDPR consent per user. Bumping consent_version in ConsentModal.jsx
-- will cause all users to see the consent modal again on next login.

CREATE TABLE IF NOT EXISTS public.user_consents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_version  TEXT NOT NULL DEFAULT '1.0',
  privacy_policy   BOOLEAN NOT NULL DEFAULT false,
  data_processing  BOOLEAN NOT NULL DEFAULT false,
  consented_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address       TEXT,                          -- optional; only set server-side
  UNIQUE (user_id)                                -- one row per user; upsert on re-consent
);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_consent" ON public.user_consents;
CREATE POLICY "own_consent" ON public.user_consents
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── deletion_requests ─────────────────────────────────────────────────────────
-- Stores self-service account deletion requests from parents/teachers.
-- Admin reviews and processes within 30 days (GDPR Art. 17).

CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id   UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  reason      TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can INSERT their own request and SELECT their own requests
DROP POLICY IF EXISTS "own_deletion_request" ON public.deletion_requests;
CREATE POLICY "own_deletion_request" ON public.deletion_requests
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can see all deletion requests for their school
DROP POLICY IF EXISTS "admin_deletion_requests" ON public.deletion_requests;
CREATE POLICY "admin_deletion_requests" ON public.deletion_requests
  FOR SELECT
  USING (school_id = public.my_school_id());

-- ── indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON public.user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON public.deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_school_id ON public.deletion_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON public.deletion_requests(status) WHERE status = 'pending';

-- ── done ──────────────────────────────────────────────────────────────────────
-- After running this script:
-- 1. All new users will see the GDPR consent modal on first login.
-- 2. Parents can submit deletion requests from Privacy & Your Data page.
-- 3. Admins can review deletion_requests in Supabase Table Editor.
