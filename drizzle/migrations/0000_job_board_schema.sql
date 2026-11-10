-- ===== Types =====
CREATE TYPE public.app_role AS ENUM ('admin', 'employer', 'seeker');
CREATE TYPE public.employer_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.job_status AS ENUM ('open', 'closed', 'removed');
CREATE TYPE public.job_type AS ENUM ('full_time', 'part_time', 'contract', 'internship');
CREATE TYPE public.application_status AS ENUM ('submitted', 'shortlisted', 'rejected', 'hired', 'withdrawn');

-- ===== Profiles =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  resume_path text,
  resume_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_name_len CHECK (char_length(full_name) <= 120),
  CONSTRAINT profiles_phone_len CHECK (phone IS NULL OR char_length(phone) <= 30)
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===== Roles =====
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ===== Employers =====
CREATE TABLE public.employers (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  phone text,
  address text,
  about text,
  status public.employer_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  CONSTRAINT employers_name_len CHECK (char_length(company_name) BETWEEN 1 AND 120),
  CONSTRAINT employers_phone_len CHECK (phone IS NULL OR char_length(phone) <= 30),
  CONSTRAINT employers_address_len CHECK (address IS NULL OR char_length(address) <= 300),
  CONSTRAINT employers_about_len CHECK (about IS NULL OR char_length(about) <= 1000)
);
GRANT SELECT ON public.employers TO authenticated;
GRANT UPDATE (company_name, phone, address, about) ON public.employers TO authenticated;
GRANT ALL ON public.employers TO service_role;
ALTER TABLE public.employers ENABLE ROW LEVEL SECURITY;

-- ===== Jobs =====
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.employers(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  job_type public.job_type NOT NULL DEFAULT 'full_time',
  area text NOT NULL DEFAULT 'Ipoh',
  salary_min integer,
  salary_max integer,
  status public.job_status NOT NULL DEFAULT 'open',
  removed_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jobs_title_len CHECK (char_length(title) BETWEEN 3 AND 120),
  CONSTRAINT jobs_desc_len CHECK (char_length(description) BETWEEN 10 AND 5000),
  CONSTRAINT jobs_area_len CHECK (char_length(area) BETWEEN 1 AND 80),
  CONSTRAINT jobs_salary CHECK (
    (salary_min IS NULL OR salary_min >= 0) AND (salary_max IS NULL OR salary_max >= 0)
    AND (salary_min IS NULL OR salary_max IS NULL OR salary_max >= salary_min)
  )
);
CREATE INDEX jobs_employer_idx ON public.jobs(employer_id);
CREATE INDEX jobs_status_idx ON public.jobs(status, created_at DESC);
GRANT SELECT, DELETE ON public.jobs TO authenticated;
GRANT INSERT (employer_id, title, description, job_type, area, salary_min, salary_max) ON public.jobs TO authenticated;
GRANT UPDATE (title, description, job_type, area, salary_min, salary_max, status, updated_at) ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- ===== Applications =====
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  seeker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  resume_path text NOT NULL,
  resume_name text,
  status public.application_status NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT applications_msg_len CHECK (char_length(message) BETWEEN 1 AND 1000)
);
CREATE UNIQUE INDEX applications_one_active_per_job
  ON public.applications(job_id, seeker_id) WHERE status <> 'withdrawn';
CREATE INDEX applications_seeker_idx ON public.applications(seeker_id);
GRANT SELECT ON public.applications TO authenticated;
GRANT INSERT (job_id, seeker_id, message, resume_path, resume_name) ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- ===== Helper functions =====
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_approved_employer(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.employers WHERE user_id = _user_id AND status = 'approved')
$$;

CREATE OR REPLACE FUNCTION public.is_job_open(_job_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs j JOIN public.employers e ON e.user_id = j.employer_id
    WHERE j.id = _job_id AND j.status = 'open' AND e.status = 'approved'
  )
$$;

CREATE OR REPLACE FUNCTION public.owns_job(_job_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.jobs WHERE id = _job_id AND employer_id = _user_id)
$$;

-- Is _profile_id an active applicant to any job owned by _employer_id?
CREATE OR REPLACE FUNCTION public.is_applicant_of(_profile_id uuid, _employer_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.applications a JOIN public.jobs j ON j.id = a.job_id
    WHERE a.seeker_id = _profile_id AND j.employer_id = _employer_id AND a.status <> 'withdrawn'
  )
$$;

-- Can _user_id read the resume file at _path?
CREATE OR REPLACE FUNCTION public.can_read_resume(_path text, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.applications a JOIN public.jobs j ON j.id = a.job_id
    WHERE a.resume_path = _path AND j.employer_id = _user_id AND a.status <> 'withdrawn'
  )
$$;

-- ===== Policies: profiles =====
CREATE POLICY "Own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY "Employers read their applicants" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_applicant_of(id, auth.uid()));
CREATE POLICY "Admins read profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND (resume_path IS NULL OR resume_path LIKE auth.uid()::text || '/%'));

-- ===== Policies: user_roles =====
CREATE POLICY "Own roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ===== Policies: employers =====
CREATE POLICY "Own employer read" ON public.employers FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins read employers" ON public.employers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Own employer update" ON public.employers FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ===== Policies: jobs =====
CREATE POLICY "Employers read own jobs" ON public.jobs FOR SELECT TO authenticated
  USING (employer_id = auth.uid());
CREATE POLICY "Admins read jobs" ON public.jobs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Approved employers post jobs" ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (employer_id = auth.uid() AND public.is_approved_employer(auth.uid()));
CREATE POLICY "Employers edit own jobs" ON public.jobs FOR UPDATE TO authenticated
  USING (employer_id = auth.uid() AND status <> 'removed' AND public.is_approved_employer(auth.uid()))
  WITH CHECK (employer_id = auth.uid() AND status IN ('open', 'closed'));
CREATE POLICY "Employers delete own jobs" ON public.jobs FOR DELETE TO authenticated
  USING (employer_id = auth.uid() AND status <> 'removed');

-- ===== Policies: applications =====
CREATE POLICY "Seekers read own applications" ON public.applications FOR SELECT TO authenticated
  USING (seeker_id = auth.uid());
CREATE POLICY "Employers read applications to own jobs" ON public.applications FOR SELECT TO authenticated
  USING (status <> 'withdrawn' AND public.owns_job(job_id, auth.uid()));
CREATE POLICY "Seekers apply to open jobs" ON public.applications FOR INSERT TO authenticated
  WITH CHECK (
    seeker_id = auth.uid()
    AND public.has_role(auth.uid(), 'seeker')
    AND public.is_job_open(job_id)
    AND resume_path LIKE auth.uid()::text || '/%'
  );

-- ===== Storage policies: resumes bucket =====
CREATE POLICY "Seekers upload own resume" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text
              AND lower(name) LIKE '%.pdf');
CREATE POLICY "Seekers read own resume" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Seekers delete own resume" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Employers read applicant resumes" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND public.can_read_resume(name, auth.uid()));

-- ===== Timestamps =====
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER jobs_touch BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER applications_touch BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== Signup: create profile + role (+ pending employer) =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _type text := NEW.raw_user_meta_data ->> 'account_type';
  _company text := nullif(trim(coalesce(NEW.raw_user_meta_data ->> 'company_name', '')), '');
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    left(coalesce(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''), 120),
    left(nullif(NEW.raw_user_meta_data ->> 'phone', ''), 30)
  );
  IF _type = 'employer' AND _company IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'employer');
    INSERT INTO public.employers (user_id, company_name, phone)
    VALUES (NEW.id, left(_company, 120), left(nullif(NEW.raw_user_meta_data ->> 'phone', ''), 30));
  ELSIF _type = 'seeker' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'seeker');
  END IF;
  -- Otherwise (e.g. Google sign-in) the user picks a type in onboarding.
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== RPCs =====
-- Onboarding for users without an account type yet (one-time)
CREATE OR REPLACE FUNCTION public.choose_account_type(_type text, _company_name text DEFAULT NULL, _phone text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Account type already chosen';
  END IF;
  IF _type = 'seeker' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'seeker');
  ELSIF _type = 'employer' THEN
    IF nullif(trim(coalesce(_company_name, '')), '') IS NULL THEN
      RAISE EXCEPTION 'Company name is required';
    END IF;
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'employer');
    INSERT INTO public.employers (user_id, company_name, phone)
    VALUES (auth.uid(), left(trim(_company_name), 120), left(nullif(trim(coalesce(_phone, '')), ''), 30));
  ELSE
    RAISE EXCEPTION 'Invalid account type';
  END IF;
END $$;

-- Public job board
CREATE OR REPLACE FUNCTION public.list_open_jobs()
RETURNS TABLE (id uuid, title text, description text, job_type public.job_type, area text,
               salary_min integer, salary_max integer, created_at timestamptz, company_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT j.id, j.title, j.description, j.job_type, j.area, j.salary_min, j.salary_max, j.created_at, e.company_name
  FROM public.jobs j JOIN public.employers e ON e.user_id = j.employer_id
  WHERE j.status = 'open' AND e.status = 'approved'
  ORDER BY j.created_at DESC
  LIMIT 500
$$;

CREATE OR REPLACE FUNCTION public.get_open_job(_job_id uuid)
RETURNS TABLE (id uuid, title text, description text, job_type public.job_type, area text,
               salary_min integer, salary_max integer, created_at timestamptz, company_name text,
               company_about text, company_address text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT j.id, j.title, j.description, j.job_type, j.area, j.salary_min, j.salary_max, j.created_at,
         e.company_name, e.about, e.address
  FROM public.jobs j JOIN public.employers e ON e.user_id = j.employer_id
  WHERE j.id = _job_id AND j.status = 'open' AND e.status = 'approved'
$$;

-- Seeker's applications with job + company info
CREATE OR REPLACE FUNCTION public.my_applications()
RETURNS TABLE (id uuid, job_id uuid, status public.application_status, message text, created_at timestamptz,
               updated_at timestamptz, job_title text, job_status public.job_status, company_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.job_id, a.status, a.message, a.created_at, a.updated_at, j.title, j.status, e.company_name
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  JOIN public.employers e ON e.user_id = j.employer_id
  WHERE a.seeker_id = auth.uid()
  ORDER BY a.created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.withdraw_application(_application_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.applications SET status = 'withdrawn'
  WHERE id = _application_id AND seeker_id = auth.uid() AND status IN ('submitted', 'shortlisted');
  IF NOT FOUND THEN RAISE EXCEPTION 'This application cannot be withdrawn'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_application_status(_application_id uuid, _status public.application_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _status NOT IN ('shortlisted', 'rejected', 'hired') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  UPDATE public.applications a SET status = _status
  FROM public.jobs j
  WHERE a.id = _application_id AND j.id = a.job_id AND j.employer_id = auth.uid()
    AND a.status <> 'withdrawn' AND public.is_approved_employer(auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
END $$;

-- Admin actions
CREATE OR REPLACE FUNCTION public.set_employer_status(_employer_id uuid, _status public.employer_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE public.employers SET status = _status, reviewed_at = now() WHERE user_id = _employer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Employer not found'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_remove_job(_job_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE public.jobs SET status = 'removed', removed_reason = left(nullif(trim(coalesce(_reason, '')), ''), 300)
  WHERE id = _job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job not found'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_restore_job(_job_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE public.jobs SET status = 'open', removed_reason = NULL WHERE id = _job_id AND status = 'removed';
  IF NOT FOUND THEN RAISE EXCEPTION 'Job not found'; END IF;
END $$;

-- Function execute permissions
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_open_jobs() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_open_job(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved_employer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_job_open(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_job(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_applicant_of(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_resume(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.choose_account_type(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_applications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_application(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_application_status(uuid, public.application_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_employer_status(uuid, public.employer_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_job(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_job(uuid) TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;