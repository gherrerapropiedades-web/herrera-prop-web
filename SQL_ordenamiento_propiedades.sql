-- Herrera Estudio Inmobiliario
-- Ejecutar UNA SOLA VEZ en Supabase > SQL Editor.
-- Crea el orden manual y conserva el orden actual de las publicaciones existentes.

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS sort_order INTEGER;

WITH ordered AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY created_at DESC NULLS LAST, id DESC) AS new_order
    FROM public.properties
    WHERE sort_order IS NULL
)
UPDATE public.properties AS p
SET sort_order = ordered.new_order
FROM ordered
WHERE p.id = ordered.id;

CREATE INDEX IF NOT EXISTS properties_sort_order_idx
ON public.properties (sort_order ASC, created_at DESC);
