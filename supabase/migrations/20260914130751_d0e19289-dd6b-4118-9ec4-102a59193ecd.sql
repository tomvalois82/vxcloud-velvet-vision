GRANT SELECT, INSERT, UPDATE, DELETE ON public.vx_compras TO authenticated;
GRANT ALL ON public.vx_compras TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vx_compras_acerto TO authenticated;
GRANT ALL ON public.vx_compras_acerto TO service_role;
ALTER TABLE public.vx_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vx_compras_acerto ENABLE ROW LEVEL SECURITY;