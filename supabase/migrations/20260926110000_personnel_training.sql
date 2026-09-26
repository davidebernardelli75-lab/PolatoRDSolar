-- Install only on the original Polato R&D Solar Supabase project.
-- Non-destructive: creates three new tables; does not touch plant/vehicle data.
-- Confirm who should access staff data: policies below match the current
-- single-company app and permit all signed-in application users.
BEGIN;

CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL CHECK (char_length(btrim(first_name)) BETWEEN 1 AND 100),
  last_name text NOT NULL CHECK (char_length(btrim(last_name)) BETWEEN 1 AND 100),
  job_title text,
  active boolean NOT NULL DEFAULT true,
  hired_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_custom_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL UNIQUE CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  course_name text NOT NULL CHECK (char_length(btrim(course_name)) BETWEEN 1 AND 160),
  completed_on date,
  expires_on date,
  provider text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_course_unique UNIQUE (employee_id, course_name),
  CONSTRAINT employee_course_date_check CHECK (
    completed_on IS NULL OR expires_on IS NULL OR expires_on >= completed_on
  )
);

CREATE INDEX IF NOT EXISTS employees_last_name_idx
  ON public.employees (last_name, first_name);
CREATE INDEX IF NOT EXISTS employee_courses_employee_id_idx
  ON public.employee_courses (employee_id);
CREATE INDEX IF NOT EXISTS employee_courses_expires_on_idx
  ON public.employee_courses (expires_on) WHERE expires_on IS NOT NULL;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_custom_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_courses ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.employees, public.training_custom_courses, public.employee_courses
  FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.employees TO authenticated;
GRANT SELECT, INSERT ON TABLE public.training_custom_courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.employee_courses TO authenticated;

DROP POLICY IF EXISTS employees_select ON public.employees;
CREATE POLICY employees_select ON public.employees FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS employees_insert ON public.employees;
CREATE POLICY employees_insert ON public.employees FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS employees_update ON public.employees;
CREATE POLICY employees_update ON public.employees FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS custom_courses_select ON public.training_custom_courses;
CREATE POLICY custom_courses_select ON public.training_custom_courses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS custom_courses_insert ON public.training_custom_courses;
CREATE POLICY custom_courses_insert ON public.training_custom_courses FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS employee_courses_select ON public.employee_courses;
CREATE POLICY employee_courses_select ON public.employee_courses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS employee_courses_insert ON public.employee_courses;
CREATE POLICY employee_courses_insert ON public.employee_courses FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS employee_courses_update ON public.employee_courses;
CREATE POLICY employee_courses_update ON public.employee_courses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS employee_courses_delete ON public.employee_courses;
CREATE POLICY employee_courses_delete ON public.employee_courses FOR DELETE TO authenticated USING (true);

NOTIFY pgrst, 'reload schema';
COMMIT;
