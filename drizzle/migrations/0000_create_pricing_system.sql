CREATE TABLE public.system_state (
  domain text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  version bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.system_state TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.system_state TO authenticated;
GRANT ALL ON public.system_state TO service_role;
ALTER TABLE public.system_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pricing state" ON public.system_state FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated users can insert pricing state" ON public.system_state FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL AND updated_by = auth.uid());
CREATE POLICY "Authenticated users can update pricing state" ON public.system_state FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (updated_by = auth.uid());
CREATE POLICY "Authenticated users can delete pricing state" ON public.system_state FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  user_email text,
  module text NOT NULL,
  record_label text NOT NULL,
  field_name text NOT NULL,
  previous_value text NOT NULL DEFAULT '—',
  new_value text NOT NULL DEFAULT '—',
  reason text NOT NULL
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read audit log" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can append audit log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.price_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  product text NOT NULL,
  scenario text NOT NULL,
  cost numeric NOT NULL CHECK (cost >= 0),
  margin numeric NOT NULL CHECK (margin >= 0 AND margin < 1),
  price numeric NOT NULL CHECK (price >= 0),
  calculation jsonb NOT NULL,
  status text NOT NULL DEFAULT 'Simulação' CHECK (status IN ('Vigente','Substituída','Simulação'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_simulations TO authenticated;
GRANT ALL ON public.price_simulations TO service_role;
ALTER TABLE public.price_simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read simulations" ON public.price_simulations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can add simulations" ON public.price_simulations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update simulations" ON public.price_simulations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can delete simulations" ON public.price_simulations FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_system_state()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$;
CREATE TRIGGER system_state_touch BEFORE UPDATE ON public.system_state FOR EACH ROW EXECUTE FUNCTION public.touch_system_state();

INSERT INTO public.system_state(domain, payload) VALUES
('settings', '{"expenseMethod":"weighted","adjustedExpenseRate":0.22894826434794963,"source":"Adjusted workbook 2026-10-05"}'::jsonb),
('materials', '[]'::jsonb),
('bom', '[]'::jsonb),
('costCenters', '{"sectors":[],"routes":[],"labor":[],"maintenance":[]}'::jsonb),
('expenses', '{"months":[],"accounts":[],"footer":[],"adjustedExpenseRate":0.22894826434794963}'::jsonb)
ON CONFLICT (domain) DO NOTHING;