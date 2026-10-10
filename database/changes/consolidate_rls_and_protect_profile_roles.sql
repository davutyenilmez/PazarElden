-- Consolidate overlapping policies while preserving public, owner, moderator, and management access.
SET lock_timeout = '5s';
CREATE POLICY "member_month_management_write_insert" ON public.member_of_month FOR INSERT TO authenticated WITH CHECK (is_management());
CREATE POLICY "member_month_management_write_update" ON public.member_of_month FOR UPDATE TO authenticated USING (is_management()) WITH CHECK (is_management());
CREATE POLICY "member_month_management_write_delete" ON public.member_of_month FOR DELETE TO authenticated USING (is_management());
DROP POLICY "member_month_management_write" ON public.member_of_month;
CREATE POLICY "poll_options_management_write_insert" ON public.poll_options FOR INSERT TO authenticated WITH CHECK (is_management());
CREATE POLICY "poll_options_management_write_update" ON public.poll_options FOR UPDATE TO authenticated USING (is_management()) WITH CHECK (is_management());
CREATE POLICY "poll_options_management_write_delete" ON public.poll_options FOR DELETE TO authenticated USING (is_management());
DROP POLICY "poll_options_management_write" ON public.poll_options;
CREATE POLICY "polls_management_write_insert" ON public.polls FOR INSERT TO authenticated WITH CHECK (is_management());
CREATE POLICY "polls_management_write_update" ON public.polls FOR UPDATE TO authenticated USING (is_management()) WITH CHECK (is_management());
CREATE POLICY "polls_management_write_delete" ON public.polls FOR DELETE TO authenticated USING (is_management());
DROP POLICY "polls_management_write" ON public.polls;
CREATE POLICY "sanctions_management_write_insert" ON public.sanctions FOR INSERT TO authenticated WITH CHECK (is_management());
CREATE POLICY "sanctions_management_write_update" ON public.sanctions FOR UPDATE TO authenticated USING (is_management()) WITH CHECK (is_management());
CREATE POLICY "sanctions_management_write_delete" ON public.sanctions FOR DELETE TO authenticated USING (is_management());
DROP POLICY "sanctions_management_write" ON public.sanctions;
CREATE POLICY "announcements_management_write_insert" ON public.site_announcements FOR INSERT TO authenticated WITH CHECK (is_management());
CREATE POLICY "announcements_management_write_update" ON public.site_announcements FOR UPDATE TO authenticated USING (is_management()) WITH CHECK (is_management());
CREATE POLICY "announcements_management_write_delete" ON public.site_announcements FOR DELETE TO authenticated USING (is_management());
DROP POLICY "announcements_management_write" ON public.site_announcements;
CREATE POLICY "site_pages_management_write_insert" ON public.site_pages FOR INSERT TO authenticated WITH CHECK (is_management());
CREATE POLICY "site_pages_management_write_update" ON public.site_pages FOR UPDATE TO authenticated USING (is_management()) WITH CHECK (is_management());
CREATE POLICY "site_pages_management_write_delete" ON public.site_pages FOR DELETE TO authenticated USING (is_management());
DROP POLICY "site_pages_management_write" ON public.site_pages;
DROP POLICY "Kullanıcı kendi profilini güncelleyebilir" ON public.profiles;
ALTER POLICY "member_month_public_read" ON public.member_of_month TO anon, authenticated USING (candidate OR winner OR is_management());
ALTER POLICY "poll_options_public_read" ON public.poll_options TO anon, authenticated USING (true);
ALTER POLICY "polls_public_read" ON public.polls TO anon, authenticated USING (active OR is_management());
ALTER POLICY "sanctions_own_or_management" ON public.sanctions TO authenticated USING (user_id = (SELECT auth.uid()) OR is_management());
ALTER POLICY "announcements_public_read" ON public.site_announcements TO anon, authenticated USING (active OR is_management());
ALTER POLICY "site_pages_public_read" ON public.site_pages TO anon, authenticated USING (true);
ALTER POLICY "Aktif ilanlar herkese açık" ON public.listings TO anon USING (status = 'active' OR (SELECT auth.uid()) = user_id);
ALTER POLICY "İlanlar moderatör tarafından görüntülenebilir" ON public.listings TO authenticated USING (((SELECT auth.uid()) = user_id) OR is_moderator());
ALTER POLICY "Aktif ilan fotoğrafları herkese açık" ON public.listing_images TO anon USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_images.listing_id AND l.status = 'active'));
ALTER POLICY "İlan fotoğrafları sahip ve moderatör" ON public.listing_images TO authenticated USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_images.listing_id AND ((l.user_id = (SELECT auth.uid())) OR is_moderator())));
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
