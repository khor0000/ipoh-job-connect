# Ipoh Job Connect

I want to start a small job website for shops and companies around Ipoh. Companies sign up as employers, but I want to check them first, so they can only post jobs after I approve them. Job seekers sign up, upload their resume (PDF) and apply for jobs with a short message. Each employer should see the people who applied to their own jobs only, download their resumes, and mark each one as "shortlisted", "rejected" or "hired". Job seekers can see their own applications and the status, and withdraw if they change their mind. Anyone can browse the open jobs without signing up. I need an admin page where I approve new employers and remove fake or rude job posts. It should look clean and simple, and work on phones.

My friend said I should use Supabase for the database.

Accounts: user_a, user_b (job seekers); employer_1, employer_2 (approved employers); employer_pending (not approved); admin — all @test.local. Sample data: employer_1 posts job J1; employer_2 posts job J2. user_a uploads a resume and applies to J1. user_b uploads a resume and applies to J2.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6b96670a-7f16-43d3-844a-2ca3878ef121).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
