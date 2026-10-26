CREATE OR REPLACE FUNCTION public.validate_product_margin_state() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (TG_OP <> 'INSERT' AND OLD.domain LIKE 'margin:%') OR (TG_OP <> 'DELETE' AND NEW.domain LIKE 'margin:%') THEN
    IF auth.uid() IS NOT NULL AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente')) THEN
      RAISE EXCEPTION 'Only managers and administrators can change product margins';
    END IF;
    IF TG_OP <> 'DELETE' THEN
      IF jsonb_typeof(NEW.payload->'margin') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Margin must be numeric'; END IF;
      IF (NEW.payload->>'margin')::numeric < 0 OR (NEW.payload->>'margin')::numeric >= 1 THEN RAISE EXCEPTION 'Margin must be between 0 and less than 100 percent'; END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_product_margin_state BEFORE INSERT OR UPDATE OR DELETE ON public.system_state FOR EACH ROW EXECUTE FUNCTION public.validate_product_margin_state();