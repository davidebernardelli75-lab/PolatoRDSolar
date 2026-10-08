BEGIN;

ALTER TABLE public.panels
  DROP CONSTRAINT IF EXISTS panels_serial_number_not_blank;

ALTER TABLE public.panels
  ADD CONSTRAINT panels_serial_number_not_blank
  CHECK (btrim(serial_number) <> '')
  NOT VALID;

ALTER TABLE public.panels
  VALIDATE CONSTRAINT panels_serial_number_not_blank;

CREATE UNIQUE INDEX IF NOT EXISTS panels_serial_number_normalized_uidx
  ON public.panels ((upper(btrim(serial_number))));

COMMIT;
