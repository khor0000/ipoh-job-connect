CREATE TYPE public.salary_period AS ENUM ('month', 'day', 'hour');
ALTER TABLE public.jobs ADD COLUMN salary_period public.salary_period NOT NULL DEFAULT 'month';
GRANT INSERT (salary_period) ON public.jobs TO authenticated;
GRANT UPDATE (salary_period) ON public.jobs TO authenticated;
UPDATE public.jobs SET salary_period = 'hour' WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';

DROP FUNCTION public.list_open_jobs();
DROP FUNCTION public.get_open_job(uuid);

CREATE FUNCTION public.list_open_jobs()
RETURNS TABLE (id uuid, title text, description text, job_type public.job_type, area text,
               salary_min integer, salary_max integer, salary_period public.salary_period,
               created_at timestamptz, company_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT j.id, j.title, j.description, j.job_type, j.area, j.salary_min, j.salary_max, j.salary_period,
         j.created_at, e.company_name
  FROM public.jobs j JOIN public.employers e ON e.user_id = j.employer_id
  WHERE j.status = 'open' AND e.status = 'approved'
  ORDER BY j.created_at DESC
  LIMIT 500
$$;

CREATE FUNCTION public.get_open_job(_job_id uuid)
RETURNS TABLE (id uuid, title text, description text, job_type public.job_type, area text,
               salary_min integer, salary_max integer, salary_period public.salary_period,
               created_at timestamptz, company_name text, company_about text, company_address text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT j.id, j.title, j.description, j.job_type, j.area, j.salary_min, j.salary_max, j.salary_period,
         j.created_at, e.company_name, e.about, e.address
  FROM public.jobs j JOIN public.employers e ON e.user_id = j.employer_id
  WHERE j.id = _job_id AND j.status = 'open' AND e.status = 'approved'
$$;

REVOKE EXECUTE ON FUNCTION public.list_open_jobs() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_open_job(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_open_jobs() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_open_job(uuid) TO anon, authenticated, service_role;