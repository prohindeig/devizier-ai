/**
 * Seed — populați baza de date cu catalogul de materiale (prețuri
 * ORIENTATIVE, marcate „indicativ") și tarifele de manoperă.
 * Rulează: bun scripts/seed.ts
 */
import { PrismaClient } from '@prisma/client'
import { MATERIAL_CATALOG, LABOR_CATALOG, CURRENCY_RATES_DEFAULT } from '../src/lib/calc/catalog'

const db = new PrismaClient()

async function main() {
  const priceDate = new Date().toISOString().slice(0, 10)

  // Curățăm cataloagele (păstrăm proiectele!)
  await db.material.deleteMany({})
  await db.laborRate.deleteMany({})

  for (const m of MATERIAL_CATALOG) {
    await db.material.create({
      data: {
        code: m.code,
        name: m.name,
        category: m.category,
        manufacturer: '',
        spec: m.spec ?? '',
        unit: m.unit,
        packageQty: m.packageQty,
        packageLabel: m.packageLabel,
        price: m.defaultPrice,
        priceCurrency: 'MDL',
        supplier: 'Catalog orientativ Devizier AI',
        locality: 'Chișinău (indicativ)',
        source: 'indicativ',
        priceDate,
        link: '',
        isPrimary: true,
      },
    })
  }

  for (const l of LABOR_CATALOG) {
    await db.laborRate.create({
      data: {
        code: l.code,
        name: l.name,
        unit: l.unit,
        price: l.defaultPrice,
        source: 'indicativ',
        priceDate,
      },
    })
  }

  await db.appSetting.upsert({
    where: { key: 'currency_rates' },
    update: { value: JSON.stringify(CURRENCY_RATES_DEFAULT) },
    create: { key: 'currency_rates', value: JSON.stringify(CURRENCY_RATES_DEFAULT) },
  })

  console.log(`Seed OK: ${MATERIAL_CATALOG.length} materiale, ${LABOR_CATALOG.length} tarife manoperă.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
