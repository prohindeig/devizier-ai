-- ═══════════════════════════════════════════════════════════════
-- DEVIZIER AI — Migrare v3.0.0 (idempotentă — poate fi rulată de mai multe ori)
-- Rulați în Supabase → SQL Editor → New query → Paste → Run
--
-- Adaugă:
--   1. Utilizatori: prenume, nume de familie, telefon, confirmarea e-mailului
--   2. Tabel nou: "VerificationCode" (codurile de verificare „captcha”)
--   3. Proiecte: metraj teren, geamuri total, uși total, tip metal,
--      armare manuală kg/m³
-- ═══════════════════════════════════════════════════════════════

-- 1) Câmpuri noi în "User" ──────────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName"       TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName"        TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone"           TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);

-- 2) Tabel nou pentru codurile de verificare ───────────────────
CREATE TABLE IF NOT EXISTS "VerificationCode" (
    "id"         TEXT NOT NULL,
    "target"     TEXT NOT NULL,          -- e-mail (lowercase) sau telefon
    "channel"    TEXT NOT NULL DEFAULT 'email',
    "purpose"    TEXT NOT NULL,          -- verify_email | reset_password
    "codeHash"   TEXT NOT NULL,          -- SHA-256(code + salt)
    "expiresAt"  TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VerificationCode_target_purpose_idx" ON "VerificationCode"("target", "purpose");
CREATE INDEX IF NOT EXISTS "VerificationCode_createdAt_idx"      ON "VerificationCode"("createdAt");

-- 3) Câmpuri noi în "Project" (meniul deviz detaliat) ──────────
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "landArea"     DOUBLE PRECISION NOT NULL DEFAULT 0;  -- metraj teren, m²
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "windowsCount" INTEGER           NOT NULL DEFAULT 0;  -- geamuri total (0 = automat)
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "doorsCount"   INTEGER           NOT NULL DEFAULT 0;  -- uși total (0 = automat)
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "metalSystem"  TEXT              NOT NULL DEFAULT 'grila_standard';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "metalKgM3"    DOUBLE PRECISION  NOT NULL DEFAULT 0;  -- armare manuală kg/m³
