# Devizier AI — Publicare online (Supabase + Vercel)

Aplicația rulează **online 24/7** pe orice dispozitiv (Windows, Android, iPhone/iPad) ca PWA,
cu baza de date **PostgreSQL în cloud (Supabase)** și găzduire **Vercel**.

Ghidul complet, cu capturi de pași, e în fișierul `Ghid-Publicare-Devizier-AI.pdf`.

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
