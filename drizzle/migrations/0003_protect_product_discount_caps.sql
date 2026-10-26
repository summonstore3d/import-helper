CREATE OR REPLACE FUNCTION public.validate_product_discount_state() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF (TG_OP <> 'INSERT' AND OLD.domain LIKE 'discount:%') OR (TG_OP <> 'DELETE' AND NEW.domain LIKE 'discount:%') THEN
  IF auth.uid() IS NOT NULL AND NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente')) THEN RAISE EXCEPTION 'Only managers and administrators can change discount caps'; END IF;
  IF TG_OP <> 'DELETE' THEN
   IF jsonb_typeof(NEW.payload->'cap') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Discount cap must be numeric'; END IF;
   IF (NEW.payload->>'cap')::numeric < 0 OR (NEW.payload->>'cap')::numeric > 0.10 THEN RAISE EXCEPTION 'Discount cap must be between 0 and 10 percent'; END IF;
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END; $$;
CREATE TRIGGER validate_product_discount_state BEFORE INSERT OR UPDATE OR DELETE ON public.system_state FOR EACH ROW EXECUTE FUNCTION public.validate_product_discount_state();
CREATE OR REPLACE FUNCTION public.validate_simulation_discount() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE cap numeric; discount numeric; base numeric;
BEGIN
 IF NEW.calculation ? 'discount' THEN
  IF jsonb_typeof(NEW.calculation->'discount') IS DISTINCT FROM 'number' OR jsonb_typeof(NEW.calculation->'basePrice') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Invalid discount calculation'; END IF;
  SELECT (payload->>'cap')::numeric INTO cap FROM public.system_state WHERE domain='discount:' || split_part(NEW.product,' - ',1);
  cap=least(coalesce(cap,0.10),0.10);
  discount=(NEW.calculation->>'discount')::numeric; base=(NEW.calculation->>'basePrice')::numeric;
  IF discount<0 OR discount>cap THEN RAISE EXCEPTION 'Discount exceeds product cap'; END IF;
  IF base<0 OR abs(NEW.price-round(base*(1-discount),2))>0.001 THEN RAISE EXCEPTION 'Discounted price mismatch'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER validate_simulation_discount BEFORE INSERT OR UPDATE ON public.price_simulations FOR EACH ROW EXECUTE FUNCTION public.validate_simulation_discount();