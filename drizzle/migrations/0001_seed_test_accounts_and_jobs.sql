-- Test accounts (password for all: Test1234!)
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token)
SELECT '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('Test1234!', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, u.meta, now(), now(), '', '', '', ''
FROM (VALUES
  ('11111111-1111-4111-8111-111111111111'::uuid, 'user_a@test.local', '{"account_type":"seeker","full_name":"Aisyah Rahman","phone":"012-345 6789"}'::jsonb),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'user_b@test.local', '{"account_type":"seeker","full_name":"Benjamin Lim","phone":"016-555 1234"}'::jsonb),
  ('33333333-3333-4333-8333-333333333333'::uuid, 'employer_1@test.local', '{"account_type":"employer","full_name":"Mr. Wong","company_name":"Kedai Kopi Old Town Ipoh","phone":"05-241 1111"}'::jsonb),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'employer_2@test.local', '{"account_type":"employer","full_name":"Ms. Devi","company_name":"Kinta Hardware Sdn Bhd","phone":"05-255 2222"}'::jsonb),
  ('55555555-5555-4555-8555-555555555555'::uuid, 'employer_pending@test.local', '{"account_type":"employer","full_name":"Mr. Tan","company_name":"Greentown Bakery","phone":"05-246 3333"}'::jsonb),
  ('66666666-6666-4666-8666-666666666666'::uuid, 'admin@test.local', '{"full_name":"Site Admin"}'::jsonb)
) AS u(id, email, meta);

INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
FROM auth.users u
WHERE u.email IN ('user_a@test.local','user_b@test.local','employer_1@test.local','employer_2@test.local','employer_pending@test.local','admin@test.local');

-- Admin role
INSERT INTO public.user_roles (user_id, role) VALUES ('66666666-6666-4666-8666-666666666666', 'admin');

-- Approve employer_1 and employer_2
UPDATE public.employers SET status = 'approved', reviewed_at = now(),
  address = CASE user_id WHEN '33333333-3333-4333-8333-333333333333' THEN 'Jalan Bandar Timah, Ipoh Old Town' ELSE 'Jalan Raja Musa Aziz, Ipoh' END,
  about = CASE user_id WHEN '33333333-3333-4333-8333-333333333333' THEN 'Family-run kopitiam serving Ipoh white coffee since 1988.' ELSE 'Hardware and building supplies for homes and contractors around Kinta.' END
WHERE user_id IN ('33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444');

UPDATE public.employers SET address = 'Taman Greentown, Ipoh', about = 'Neighbourhood bakery opening soon.'
WHERE user_id = '55555555-5555-4555-8555-555555555555';

-- Jobs J1 and J2
INSERT INTO public.jobs (id, employer_id, title, description, job_type, area, salary_min, salary_max) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '33333333-3333-4333-8333-333333333333',
   'Barista & Counter Staff',
   'Make our famous white coffee, take orders and keep the counter tidy. Morning shift 7am–3pm, 6 days a week. No experience needed — we will train you. Free meals during shift.',
   'full_time', 'Ipoh Old Town', 1700, 2200),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '44444444-4444-4444-8444-444444444444',
   'Part-time Store Assistant',
   'Help customers find products, restock shelves and handle the cashier on weekends. Basic Malay and English needed; Cantonese is a plus. Saturday and Sunday, 9am–6pm.',
   'part_time', 'Ipoh Garden', 10, 12);

-- Resumes + applications
UPDATE public.profiles SET resume_path = '11111111-1111-4111-8111-111111111111/resume.pdf', resume_name = 'Aisyah_Rahman_Resume.pdf'
WHERE id = '11111111-1111-4111-8111-111111111111';
UPDATE public.profiles SET resume_path = '22222222-2222-4222-8222-222222222222/resume.pdf', resume_name = 'Benjamin_Lim_Resume.pdf'
WHERE id = '22222222-2222-4222-8222-222222222222';

INSERT INTO public.applications (job_id, seeker_id, message, resume_path, resume_name) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111',
   'Hi! I worked 1 year at a café in Bercham and love making coffee. I can start next week.',
   '11111111-1111-4111-8111-111111111111/resume.pdf', 'Aisyah_Rahman_Resume.pdf'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '22222222-2222-4222-8222-222222222222',
   'I am a college student looking for weekend work. I speak Malay, English and Cantonese.',
   '22222222-2222-4222-8222-222222222222/resume.pdf', 'Benjamin_Lim_Resume.pdf');