CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'vendedor');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  user_email text,
  role public.app_role NOT NULL DEFAULT 'vendedor',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.role_permissions (
  role public.app_role NOT NULL,
  tab text NOT NULL,
  PRIMARY KEY (role, tab)
);
GRANT SELECT, INSERT, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own role, admins read all" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins change roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins add permissions" ON public.role_permissions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins remove permissions" ON public.role_permissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.ensure_my_role()
RETURNS public.app_role LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.app_role;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT role INTO r FROM public.user_roles WHERE user_id = auth.uid();
  IF r IS NOT NULL THEN RETURN r; END IF;
  PERFORM pg_advisory_xact_lock(42);
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN r := 'admin'; ELSE r := 'vendedor'; END IF;
  INSERT INTO public.user_roles (user_id, user_email, role)
  VALUES (auth.uid(), auth.jwt() ->> 'email', r) ON CONFLICT (user_id) DO NOTHING;
  SELECT role INTO r FROM public.user_roles WHERE user_id = auth.uid();
  RETURN r;
END $$;
REVOKE EXECUTE ON FUNCTION public.ensure_my_role() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.ensure_my_role() TO authenticated;

INSERT INTO public.role_permissions (role, tab)
SELECT 'admin'::public.app_role, t FROM unnest(ARRAY['/','/produtos','/insumos','/bom','/centro-de-custos','/logistica','/despesas','/salarios','/impostos','/precificacao','/historico','/validacoes','/auditoria','/acessos']) t
UNION ALL
SELECT 'gerente'::public.app_role, t FROM unnest(ARRAY['/','/produtos','/insumos','/bom','/centro-de-custos','/logistica','/despesas','/salarios','/impostos','/precificacao','/historico','/validacoes','/auditoria']) t
UNION ALL
SELECT 'vendedor'::public.app_role, t FROM unnest(ARRAY['/','/produtos','/precificacao']) t;