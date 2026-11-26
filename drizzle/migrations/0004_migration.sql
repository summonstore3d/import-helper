DROP POLICY IF EXISTS "Anyone can read pricing state" ON public.system_state;
DROP POLICY IF EXISTS "Authenticated users can update pricing state" ON public.system_state;
DROP POLICY IF EXISTS "Authenticated users can delete pricing state" ON public.system_state;
REVOKE SELECT ON public.system_state FROM anon;
CREATE POLICY "Signed-in users read pricing state" ON public.system_state FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Managers update pricing state" ON public.system_state FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente'))
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente')) AND updated_by = auth.uid());
CREATE POLICY "Admins delete pricing state" ON public.system_state FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated read permissions" ON public.role_permissions;
CREATE POLICY "Users read own role permissions" ON public.role_permissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), role) OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated users can read audit log" ON public.audit_log;
CREATE POLICY "Own entries or managers read audit log" ON public.audit_log FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente'));

DROP POLICY IF EXISTS "Authenticated users can read simulations" ON public.price_simulations;
CREATE POLICY "Own simulations or managers read" ON public.price_simulations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente'));