-- =============================================================================
-- TAAK 5: Mutable search_path op daily_checkins_validate_top3 (Supabase Advisor)
-- =============================================================================
-- Function body gebruikt alleen public.* en trigger-NEW; search_path leeg houdt
-- session search_path buiten spel.
-- =============================================================================

ALTER FUNCTION public.daily_checkins_validate_top3()
  SET search_path = '';
