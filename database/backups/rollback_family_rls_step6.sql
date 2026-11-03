-- Emergency rollback only. Restores the original insecure PUBLIC policies.
-- Do not run unless rolling back step 6 due to a verified outage.
CREATE POLICY family_members_select ON public.family_members FOR SELECT TO public USING (true);
CREATE POLICY family_members_insert ON public.family_members FOR INSERT TO public WITH CHECK (true);
CREATE POLICY family_members_update ON public.family_members FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY family_members_delete ON public.family_members FOR DELETE TO public USING (true);
CREATE POLICY family_name_days_select ON public.family_name_days FOR SELECT TO public USING (true);
CREATE POLICY family_name_days_insert ON public.family_name_days FOR INSERT TO public WITH CHECK (true);
CREATE POLICY family_name_days_update ON public.family_name_days FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY family_name_days_delete ON public.family_name_days FOR DELETE TO public USING (true);
