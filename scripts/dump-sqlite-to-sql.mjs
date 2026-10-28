/**
 * dump-sqlite-to-sql.mjs — Exportă datele din baza SQLite locală în fișier SQL
 * PostgreSQL (supabase/02-data.sql), pregătit pentru Supabase SQL Editor.
 *
 * Ce transferă: Project, Room, Material, LaborRate, AppSetting, User
 * Ce NU transferă: Backup (istoricul local de versiuni — aplicația recreează
 * automat backup-uri noi după migrare).
 *
 * Rulare:  node scripts/dump-sqlite-to-sql.mjs
 * Necesită: clientul Prisma generat pentru schema SQLite (schema.sqlite.prisma)
 */
import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'supabase', '02-data.sql')

const db = new PrismaClient()

/** Escape valoare pentru PostgreSQL */
function sqlVal(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') {
    if (!isFinite(v)) throw new Error('Valoare numerică invalidă: ' + v)
    return String(v)
  }
  if (v instanceof Date) return `'${v.toISOString()}'`
  if (typeof v === 'bigint') return String(v)
  // string
  return `'${String(v).replace(/'/g, "''")}'`
}

function quoteIdent(name) {
  return `"${name}"`
}

async function dumpTable(model, tableName, orderBy) {
  const rows = await db[model].findMany(orderBy ? { orderBy } : undefined)
  if (rows.length === 0) {
    return { sql: `-- Tabela ${tableName}: 0 rânduri (nimic de importat)\n`, count: 0 }
  }
  const cols = Object.keys(rows[0])
  const colList = cols.map(quoteIdent).join(', ')
  const values = rows.map((row) => {
    const vals = cols.map((c) => sqlVal(row[c])).join(', ')
    return `(${vals})`
  })
  // max ~100 rânduri per INSERT e ok; le punem individual pentru lizibilitate și siguranță
  const stmts = values.map((v) => `INSERT INTO ${quoteIdent(tableName)} (${colList}) VALUES ${v};`)
  return { sql: stmts.join('\n') + '\n', count: rows.length }
}

async function main() {
  console.log('Citesc datele din SQLite...')
  const parts = []
  const summary = []

  const tables = [
    ['project', 'Project', null],
    ['room', 'Room', null],
    ['material', 'Material', null],
    ['laborRate', 'LaborRate', null],
    ['appSetting', 'AppSetting', null],
    ['user', 'User', null],
  ]

  for (const [model, table, orderBy] of tables) {
    const { sql, count } = await dumpTable(model, table, orderBy)
    parts.push(`\n-- ── ${table} ──\n${sql}`)
    summary.push(`${table}: ${count} rânduri`)
    console.log(`  ${table}: ${count}`)
  }

  const header = `-- ═══════════════════════════════════════════════════════════════
-- DEVIZIER AI — 02-data.sql
-- Date exportate din baza locală SQLite pe ${new Date().toISOString()}
--
-- ⚠️  Rulează DOAR pe o bază de date Supabase NOUĂ și GOALĂ
--     (după 01-schema.sql), în ordinea: 01 → 02.
--
-- Conținut: ${summary.join(' | ')}
-- Backup-urile locale NU se transferă (aplicația creează altele noi).
-- ═══════════════════════════════════════════════════════════════

BEGIN;

SET search_path = public;
`

  const footer = `
COMMIT;

-- Verificare rapidă (opțional, rulează separat după COMMIT):
-- SELECT 'Project' AS t, COUNT(*) FROM "Project"
-- UNION ALL SELECT 'Room', COUNT(*) FROM "Room"
-- UNION ALL SELECT 'Material', COUNT(*) FROM "Material"
-- UNION ALL SELECT 'LaborRate', COUNT(*) FROM "LaborRate";
`

  writeFileSync(OUT, header + parts.join('\n') + footer, 'utf8')
  console.log('Scris: ' + OUT)
  console.log(summary.join(' | '))
  await db.$disconnect()
}

main().catch((e) => {
  console.error('Eroare dump:', e)
  process.exit(1)
})
