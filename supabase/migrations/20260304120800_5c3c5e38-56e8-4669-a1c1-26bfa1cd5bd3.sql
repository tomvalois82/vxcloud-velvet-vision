
CREATE TABLE public.vx_acesso_paginas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo text NOT NULL,
  pagina text NOT NULL,
  permitido boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(cargo, pagina)
);

ALTER TABLE public.vx_acesso_paginas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso geral vx_acesso_paginas" ON public.vx_acesso_paginas
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
