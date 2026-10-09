-- Not applied to production: Supabase connector write requests failed on 2026-10-09.
-- Run as database owner in a transaction. No application rows are modified.
BEGIN;
SET lock_timeout = '5s';
CREATE POLICY "member_month_management_write_insert" ON public."member_of_month" FOR INSERT TO authenticated  WITH CHECK (is_management());
CREATE POLICY "member_month_management_write_update" ON public."member_of_month" FOR UPDATE TO authenticated USING (is_management()) WITH CHECK (is_management());
CREATE POLICY "member_month_management_write_delete" ON public."member_of_month" FOR DELETE TO authenticated USING (is_management()) ;
DROP POLICY "member_month_management_write" ON public."member_of_month";
CREATE POLICY "poll_options_management_write_insert" ON public."poll_options" FOR INSERT TO authenticated  WITH CHECK (is_management());
CREATE POLICY "poll_options_management_write_update" ON public."poll_options" FOR UPDATE TO authenticated USING (is_management()) WITH CHECK (is_management());
CREATE POLICY "poll_options_management_write_delete" ON public."poll_options" FOR DELETE TO authenticated USING (is_management()) ;
DROP POLICY "poll_options_management_write" ON public."poll_options";
CREATE POLICY "polls_management_write_insert" ON public."polls" FOR INSERT TO authenticated  WITH CHECK (is_management());
CREATE POLICY "polls_management_write_update" ON public."polls" FOR UPDATE TO authenticated USING (is_management()) WITH CHECK (is_management());
CREATE POLICY "polls_management_write_delete" ON public."polls" FOR DELETE TO authenticated USING (is_management()) ;
DROP POLICY "polls_management_write" ON public."polls";
CREATE POLICY "sanctions_management_write_insert" ON public."sanctions" FOR INSERT TO authenticated  WITH CHECK (is_management());
CREATE POLICY "sanctions_management_write_update" ON public."sanctions" FOR UPDATE TO authenticated USING (is_management()) WITH CHECK (is_management());
CREATE POLICY "sanctions_management_write_delete" ON public."sanctions" FOR DELETE TO authenticated USING (is_management()) ;
DROP POLICY "sanctions_management_write" ON public."sanctions";
CREATE POLICY "announcements_management_write_insert" ON public."site_announcements" FOR INSERT TO authenticated  WITH CHECK (is_management());
CREATE POLICY "announcements_management_write_update" ON public."site_announcements" FOR UPDATE TO authenticated USING (is_management()) WITH CHECK (is_management());
CREATE POLICY "announcements_management_write_delete" ON public."site_announcements" FOR DELETE TO authenticated USING (is_management()) ;
DROP POLICY "announcements_management_write" ON public."site_announcements";
CREATE POLICY "site_pages_management_write_insert" ON public."site_pages" FOR INSERT TO authenticated  WITH CHECK (is_management());
CREATE POLICY "site_pages_management_write_update" ON public."site_pages" FOR UPDATE TO authenticated USING (is_management()) WITH CHECK (is_management());
CREATE POLICY "site_pages_management_write_delete" ON public."site_pages" FOR DELETE TO authenticated USING (is_management()) ;
DROP POLICY "site_pages_management_write" ON public."site_pages";
DROP POLICY "Kullanıcı kendi profilini güncelleyebilir" ON public.profiles;
ALTER POLICY "Aktif ilanlar herkese açık" ON public.listings TO anon;
ALTER POLICY "İlanlar moderatör tarafından görüntülenebilir" ON public.listings USING ((((status = 'active'::text) OR (( SELECT auth.uid() AS uid) = user_id))) OR (((( SELECT auth.uid() AS uid) = user_id) OR is_moderator())));
ALTER POLICY "Aktif ilan fotoğrafları herkese açık" ON public.listing_images TO anon;
ALTER POLICY "İlan fotoğrafları sahip ve moderatör" ON public.listing_images USING (((EXISTS ( SELECT 1
   FROM listings l
  WHERE ((l.id = listing_images.listing_id) AND (l.status = 'active'::text))))) OR ((EXISTS ( SELECT 1
   FROM listings l
  WHERE ((l.id = listing_images.listing_id) AND ((l.user_id = ( SELECT auth.uid() AS uid)) OR is_moderator()))))));
CREATE OR REPLACE FUNCTION public.protect_profile_system_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF current_user IN ('anon','authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.role := 'member';
      NEW.is_admin := false;
      NEW.is_moderator := false;
      NEW.premium_until := NULL;
      NEW.violation_count := 0;
      NEW.listing_blocked_until := NULL;
    ELSIF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
       OR NEW.is_moderator IS DISTINCT FROM OLD.is_moderator
       OR NEW.premium_until IS DISTINCT FROM OLD.premium_until
       OR NEW.violation_count IS DISTINCT FROM OLD.violation_count
       OR NEW.listing_blocked_until IS DISTINCT FROM OLD.listing_blocked_until THEN
      RAISE EXCEPTION 'Bu alan kullanıcı tarafından değiştirilemez.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
