# Devizier AI — Publicare online (Supabase + Vercel)

Aplicația rulează **online 24/7** pe orice dispozitiv (Windows, Android, iPhone/iPad) ca PWA,
cu baza de date **PostgreSQL în cloud (Supabase)** și găzduire **Vercel**.

Ghidul complet, cu capturi de pași, e în fișierul `Ghid-Publicare-Devizier-AI.pdf`.

## Deploy rapid cu Vercel CLI (varianta cea mai simplă — 10 minute)

Nu ai nevoie de GitHub. Doar de un cont gratuit pe **vercel.com** (aceeași cu care ai publicat AgroMD).

```bash
# 0. o singură dată, pe calculatorul tău:
npm install -g vercel

# 1. intră în folderul cu aplicația și conectează-te (contul tău Vercel):
cd devizier-ai
vercel login

# 2. creează proiectul pe Vercel (răspunde: Set up and deploy → Y, scope-ul tău,
#    numele proiectului: devizier-ai, codul sursă: ./ ):
vercel link

# 3. adaugă cele 6 variabile de mediu (le ai în Vercel-Coduri-Conectare.txt):
#    pentru fiecare rulează comanda, apoi lipește VALOAREA și apasă Enter.
#    Prima dată pentru Production, apoi pentru Preview:
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add AUTH_SECRET production
vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY production
vercel env add VAPID_PRIVATE_KEY production
vercel env add VAPID_SUBJECT production

# 4. publică în producție:
vercel --prod
```

La final primești linkul public: **https://devizier-ai.vercel.app** (sau similar,
vizibil în dashboard → proiectul *devizier-ai* → Domains). De acolo aplicația se
instalează pe telefon ca PWA exact ca AgroMD. La fiecare versiune nouă: actualizezi
folderele și rulezi din nou `vercel --prod`.

## Ce e nou în v3.0.0 (octombrie 2026)

1. **Ecran de înregistrare** — aplicația se deschide pe pagina de creare cont (Nume, Prenume, telefon, e-mail, parolă).
2. **Confirmare e-mail cu cod (OTP)** — la înregistrare se trimite un cod din 6 cifre; contul se activează doar după confirmare.
3. **Recuperare parolă** — „Ai uitat parola?" prin e-mail SAU număr de telefon (cod pe e-mail + parolă nouă).
4. **Meniu deviz detaliat** — metraj teren, geamuri total, uși total, tip metal/armare (grilă standard, consolidată, profile + kg/m³ manual), fundație, cărămidă/beton, acoperiș — orice număr liber.
5. **Design nou** — taburi cu iconițe, ecran de autentificare modern, formular pe secțiuni.
6. **Logo nou** — iconițe regenerate pentru Android/iPhone (PWA).
7. **Tab „Export PDF"** — tot devizul într-un PDF, un singur click.

## Migrare bază existentă (Supabase) la v3.0.0

Dacă baza Supabase există deja (ai rulat vechiul `01-schema.sql` + `02-data.sql`),
rulează în Supabase → SQL Editor scriptul **`04-migratie-v3.sql`** (idempotent —
poate fi rulat de mai multe ori). Adaugă coloanele noi pentru User/Project și
creează tabelul `VerificationCode`. Instalaților noi le ajung `01-schema.sql` + `02-data.sql`
(schema completă include deja tot).

## E-mailuri reale (SMTP) — opțional, dar recomandat în producție

Fără SMTP, aplicația funcționează în **mod demo**: codul de confirmare/resetare
se afișează direct în interfață (fluxul poate fi parcurs complet). Pentru coduri
trimise real pe e-mail, adaugă în Vercel → Settings → Environment Variables:

| Variabilă | Exemplu | Note |
|---|---|---|
| `SMTP_HOST` | `smtp.gmail.com` | orice furnizor SMTP |
| `SMTP_PORT` | `587` | `465` = SSL |
| `SMTP_USER` | `cont@gmail.com` | |
| `SMTP_PASS` | parola de aplicație | Gmail: parolă de aplicație (nu parola contului) |
| `SMTP_FROM` | `Devizier AI <cont@gmail.com>` | expeditorul afișat |

La completarea lor, codurile pleacă automat pe e-mail (HTML branduit) și bannerul
„Mod demo" dispare din interfață.

## Ce s-a schimbat pentru deployment (v2.2.0)

| Fișier | Rol |
|---|---|
| `prisma/schema.prisma` | Schema **PostgreSQL/Supabase** (implicită; folosită automat de Vercel) |
| `prisma/schema.sqlite.prisma` | Schema SQLite — DOAR pentru dezvoltare 100% locală, fără cloud |
| `supabase/01-schema.sql` | Creează tabelele în Supabase (SQL Editor) |
| `supabase/02-data.sql` | Importă datele existente: 1 proiect demo, 5 camere, 120 materiale, 36 tarife |
| `scripts/dump-sqlite-to-sql.mjs` | Regenerează `02-data.sql` din SQLite local (`npm run deploy:dump`) |
| `.env.example` | Model pentru variabilele de mediu (DATABASE_URL, DIRECT_URL, AUTH_SECRET) |

## Pașii scurți

1. **GitHub** — cont nou → `github.com/new` → repo `devizier-ai` (Private) → upload folder.
2. **Supabase** — cont → proiect nou (regiune Frankfurt) → păstrează parola DB.
3. **Populare bază** — în Supabase SQL Editor rulează `01-schema.sql`, apoi `02-data.sql`.
4. **Vercel** — `vercel.com/new` → importă repo-ul → la *Environment Variables* adaugi:
   - `DATABASE_URL` = Transaction pooler (port **6543**) + `?pgbouncer=true&connection_limit=1`
   - `DIRECT_URL` = Session pooler / Direct connection (port **5432**)
   - `AUTH_SECRET` = string random lung (ex. `openssl rand -hex 32`)
   → Deploy.
5. **Instalare PWA** — Windows/Android: butonul „Instalează aplicația" din aplicație.
   iPhone/iPad: Safari → Share → „Adaugă la ecranul principal".

## Comenzi utile (doar dacă lucrezi local cu Node)

```bash
npm install                    # instalează + generează clientul Prisma (PostgreSQL)
npm run db:push:pg             # creează tabelele direct din Prisma (alternativă la 01-schema.sql)
npm run deploy:dump            # regenerează supabase/02-data.sql din SQLite-ul local
npm run deploy:seed            # importă 02-data.sql în Supabase (alternativă la SQL Editor)
npm run dev                    # dezvoltare locală (folosește .env)
```

Pentru dezvoltare locală pe SQLite (fără Supabase): setează `DATABASE_URL="file:../db/custom.db"`
în `.env` și rulează `npm run db:generate:sqlite && npm run db:push`, apoi `npm run dev`.

## Note

- **AI-ul asistent** (chat + citirea planurilor din poză) rulează doar în mediul sandbox Z.ai;
  pe Vercel primești un mesaj prietenos, iar modul **Text** din importul de planuri funcționează identic.
- **Backup-urile locale** (SQLite) nu se transferă în cloud — aplicația își creează automat altele noi.
- Proiectele Supabase pe planul gratuit se pun în pauză după ~7 zile de inactivitate —
  se reactivează cu un click din dashboard.

## v3.1.0 — Verifică versiune + update automat + notificări push

Tab-ul nou **„Verifică versiune”** (ultima poziție în meniu) face trei lucruri:

1. **Verificare versiune** — arată versiunea instalată și compară cu serverul.
   Poți apăsa „Verifică acum” oricând; automat se verifică la fiecare deschidere
   (max. o dată la 30 de minute) și la revenirea în aplicație.
2. **Instalare automată** — dacă există o versiune nouă, se instalează singură în
   câteva secunde (banner „Se instalează automat…”), apoi aplicația se reîncarcă
   și afișează confirmarea „Actualizat la versiunea X”. Datele nu se ating.
3. **Notificare push pe telefon** — comutatorul din tab cere permisiunea și
   salvează subscripția. Când publici o versiune nouă, telefoanele cu aplicația
   închisă primesc notificarea în fereastra plutitoare (Android; iPhone cu
   aplicația instalată din Safari, iOS 16.4+).

### Pași de configurare (o singură dată, pentru Vercel)

1. **Supabase** — SQL Editor → rulează `download/05-push-subscriptions.sql`
   (creează tabelul `PushSubscription`; idempotent, sigur la re-rulare).
2. **Vercel** — Settings → Environment Variables → adaugă cele 3 coduri noi din
   `download/Vercel-Coduri-Conectare.txt` (nr. 4–6: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
   `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).
3. **Cron zilnic** — fișierul `vercel.json` din proiect definește deja verificarea
   zilnică (ora 8:00 UTC) care trimite notificările push. Nu cere nicio setare în plus.

Notă: dacă NU adaugi cele 3 coduri VAPID, aplicația rulează normal — doar
notificările push de versiune nouă rămân inactive (codul are valori de rezervă).

### Cum publici o versiune nouă (checklist)

1. Incrementează `APP_VERSION` + `APP_CHANGELOG` în `src/lib/version.ts`.
2. Incrementează `CACHE` (`devizier-v7`…) și `APP_VERSION` în `public/sw.js`.
3. Deploy pe Vercel → telefoanele deschise se actualizează singure la prima
   verificare; cele închise primesc notificarea push.
