# BRCA1/BRCA2 Genome & Medical Research Database

DBMS Level 3 project (PES University, UE24CS351A). A web app over **MySQL** (relational core) and **MongoDB** (flexible annotations and free-text notes), built with **Next.js**.

## Problem
Researchers studying hereditary breast/ovarian cancer must link patients, families, samples, sequencing runs, genotype calls, variants, conditions, studies, treatments and trials, while respecting patient consent. This project stores that data and enforces consent in the database itself.

## Database choice and justification
| Data | Store | Why |
|---|---|---|
| Patients, families, samples, sequencing runs, genotype results, variants, conditions, studies, trials | **MySQL** | Highly relational with many M:N links; needs foreign keys, constraints, transactions and joins. |
| Variant annotations (nested predictions, population frequencies, variable-length literature lists) | **MongoDB** `variant_annotations` | Document-shaped, structure differs per variant and source, read as a whole; aggregation pipeline and text index. |
| Clinical free-text notes | **MongoDB** `clinical_notes` | Unstructured text; full-text search. Linked to MySQL by `patient_id`. |

## Architecture
```
Browser (Next.js pages, client components)
   |  fetch()
Next.js Route Handlers  /app/api/*   (auth check + role check per route)
   |-- MySQL   (mysql2, parameterised queries, stored procedure / view / function)
   '-- MongoDB (official driver, aggregation + text search)
```
Middleware blocks every page and API route without a valid session cookie (JWT, HttpOnly).

## Requirements checklist
- **SQL (MySQL):** 19 tables, ER-to-relational design, PK/FK/UNIQUE/CHECK/ENUM/DEFAULT, cascading rules: `sql/01_schema.sql`
- **NoSQL (MongoDB):** 2 collections, indexes (unique, single-field, text), aggregation pipeline: `scripts/seed-mongo.js`, `app/api/annotations/*`
- **DDL:** CREATE, ALTER, DROP, indexes, view: `sql/01`, `sql/03`, `sql/04`
- **DML:** INSERT / UPDATE / DELETE / SELECT with JOIN, GROUP BY, HAVING, ORDER BY, aggregates, subqueries, correlated query: `sql/02_data.sql`, `sql/queries_demo.sql`, `sql/03_*`
- **Advanced features (6):** view `v_deidentified_patient`, trigger `trg_block_withdrawn`, stored procedure `sp_enroll_patient`, stored function `fn_patient_age`, transaction (inside the procedure), indexes
- **Next.js UI:** dashboard, patients, variants search/filter, trials + enrolment form, MongoDB annotations/notes search
- **Integration:** all DB access goes through `/app/api/*` route handlers; credentials only from environment variables (`.env`, git-ignored)
- **Auth + roles:** `admin` and `researcher`; passwords stored as bcrypt hashes in `AppUser`
  - admin: identified patient data, trial enrolment, clinical notes
  - researcher: de-identified, consent-filtered patient view only; no enrolment, no notes
- **Data validation/integrity at DB level:** CHECK (allele frequency 0-1, no self-relative), ENUMs, FKs, UNIQUE (one result per run-variant), trigger and procedure checks for consent and trial status
- **Security:** parameterised queries, bcrypt, HttpOnly JWT cookie, server-side role checks, secrets in env

## Setup
Requirements: Node 20+ (for `--env-file`), MySQL 8 and MongoDB 6/7 (or Docker).

```bash
git clone <repo-url> && cd brca-genome-db
cp .env.example .env          # edit passwords; avoid '#' characters in values
npm install

# 1) Databases, either with Docker:
docker compose up -d
#    ...or load the SQL manually, in order:
#    mysql -u root -p < sql/01_schema.sql   (then 02, 03, 04, 05)

# 2) Seed
npm run seed:users            # creates admin + researcher (hashed passwords from .env)
npm run seed:mongo            # builds the MongoDB collections from the MySQL variants/patients

# 3) Run
npm run dev                   # http://localhost:3000
```
Log in as `admin` or `researcher` with the passwords you set in `.env`.

`sql/queries_demo.sql` is a demo script (inserts/deletes a sample patient, calls the procedure) and is **not** loaded automatically.

## Repository layout
```
sql/        schema, data, ALTER/index/function, view+trigger+procedure, auth table, demo queries
scripts/    seed-users.js, seed-mongo.js
lib/        db.js (MySQL pool), mongo.js, auth.js (JWT + roles)
app/api/    route handlers (auth, stats, patients, variants, trials, annotations, notes)
app/        pages (dashboard, patients, variants, trials, annotations, login)
components/ Nav, Table, useFetch
```

## Team contributions
| Member | Responsibilities |
|---|---|
| Zia (PES2UG24CS620) | _fill in_ |
| _Teammate_ | _fill in_ |

## Notes
Patient, sample and result data is synthetic; gene, condition and drug names are real. MongoDB annotation values (frequencies, scores, paper titles) are synthetic placeholders.

