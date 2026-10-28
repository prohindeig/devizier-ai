// ─────────────────────────────────────────────────────────────
// DEVIZIER AI — Catalog de materiale & norme de consum
//
// Prețurile „default" sunt ORIENTATIVE (indicative) pentru piața
// din Republica Moldova și TREBUIE verificate/actualizate de
// utilizator în modulul „Prețuri". Aplicația le marchează clar
// ca „indicativ" și NU le prezintă ca oferte comerciale reale.
//
// Fiecare material are: cod, categorie, unitate, ambalaj comercial
// și norma de consum implicită (folosită de motorul de calcul).
// ─────────────────────────────────────────────────────────────

export type PricingMode = 'package' | 'continuous'

export interface MaterialDef {
  code: string
  name: string
  category: string
  unit: string
  packageQty: number // cantitatea pe ambalaj comercial (în unitatea materialului)
  packageLabel: string
  defaultPrice: number // MDL, ORIENTATIV
  spec?: string
  wastePct: number // pierderi tehnologice implicite (%)
  pricing?: PricingMode // continuous = fără rotunjire la ambalaj (ex: tâmplărie pe m²)
}

export const CATEGORIES = [
  'Pregătire teren',
  'Beton & armătură',
  'Cofraj',
  'Hidroizolație & drenaj',
  'Zidărie',
  'Structură',
  'Acoperiș',
  'Tâmplărie',
  'Instalații electrice',
  'Instalații sanitare & termice',
  'Izolație & fațadă',
  'Finisaje interioare',
  'Exterior',
  'Consumabile',
] as const

export const MATERIAL_CATALOG: MaterialDef[] = [
  // ── Pregătire teren ──────────────────────────────────────
  { code: 'nisip', name: 'Nisip de râu (livrat)', category: 'Pregătire teren', unit: 'm³', packageQty: 1, packageLabel: 'vrac / m³', defaultPrice: 300, wastePct: 0, spec: 'Fracțiune 0–4 mm' },
  { code: 'piatris', name: 'Piatriș / balast (livrat)', category: 'Pregătire teren', unit: 'm³', packageQty: 1, packageLabel: 'vrac / m³', defaultPrice: 420, wastePct: 0, spec: 'Fracțiune 5–40 mm' },
  { code: 'geotextil', name: 'Geotextil 200 g/m²', category: 'Pregătire teren', unit: 'm²', packageQty: 25, packageLabel: 'rolă 25 m²', defaultPrice: 14, wastePct: 10 },

  // ── Beton & armătură ─────────────────────────────────────
  { code: 'beton_c15_20', name: 'Beton C15/20 livrat autobetonieră', category: 'Beton & armătură', unit: 'm³', packageQty: 1, packageLabel: 'vrac / m³', defaultPrice: 1650, wastePct: 2, spec: 'Clasa C15/20, consistență S3' },
  { code: 'beton_c20_25', name: 'Beton C20/25 livrat autobetonieră', category: 'Beton & armătură', unit: 'm³', packageQty: 1, packageLabel: 'vrac / m³', defaultPrice: 1780, wastePct: 2, spec: 'Clasa C20/25, consistență S3' },
  { code: 'ciment', name: 'Ciment CEM II/A-LL 42,5', category: 'Beton & armătură', unit: 'sac', packageQty: 1, packageLabel: 'sac 25 kg', defaultPrice: 98, wastePct: 5, spec: 'Sac 25 kg' },
  { code: 'armatura_d10', name: 'Armătură AIII Ø10 mm', category: 'Beton & armătură', unit: 'kg', packageQty: 1000, packageLabel: 'set 1 tonă', defaultPrice: 17.5, wastePct: 8, spec: 'Oțel BSt500S' },
  { code: 'armatura_d12', name: 'Armătură AIII Ø12 mm', category: 'Beton & armătură', unit: 'kg', packageQty: 1000, packageLabel: 'set 1 tonă', defaultPrice: 17, wastePct: 8, spec: 'Oțel BSt500S' },
  { code: 'sarma_legat', name: 'Sârmă de legat armătură Ø1,2 mm', category: 'Beton & armătură', unit: 'kg', packageQty: 5, packageLabel: 'mănunchi 5 kg', defaultPrice: 45, wastePct: 0 },
  { code: 'distantiere', name: 'Distanțieri beton pentru armătură (orizontale)', category: 'Beton & armătură', unit: 'buc', packageQty: 100, packageLabel: 'pachet 100 buc', defaultPrice: 2.5, wastePct: 5 },

  // ── Cofraj ───────────────────────────────────────────────
  { code: 'scanduri_cofraj', name: 'Scânduri cofraj tala molid 25 mm', category: 'Cofraj', unit: 'm²', packageQty: 1, packageLabel: 'm²', defaultPrice: 185, wastePct: 10 },
  { code: 'lemn_structura', name: 'Cherestea structurală tala (căpriori, pane, șipci)', category: 'Cofraj', unit: 'm³', packageQty: 1, packageLabel: 'm³', defaultPrice: 7800, wastePct: 8 },
  { code: 'cuie', name: 'Cuie construcții 80 mm', category: 'Consumabile', unit: 'kg', packageQty: 5, packageLabel: 'pachet 5 kg', defaultPrice: 48, wastePct: 0 },
  { code: 'antiseptic', name: 'Antiseptic / impregnare lemn', category: 'Consumabile', unit: 'L', packageQty: 10, packageLabel: 'canistră 10 L', defaultPrice: 78, wastePct: 0 },

  // ── Hidroizolație & drenaj ───────────────────────────────
  { code: 'membrana_bitum', name: 'Membrană hidroizolatoare bituminoasă', category: 'Hidroizolație & drenaj', unit: 'm²', packageQty: 10, packageLabel: 'rolă 10 m²', defaultPrice: 48, wastePct: 15, spec: 'SBS, 4 mm' },
  { code: 'folie_plastic', name: 'Folie din plastic 200 µm', category: 'Hidroizolație & drenaj', unit: 'm²', packageQty: 40, packageLabel: 'rolă 40 m²', defaultPrice: 9, wastePct: 10 },
  { code: 'tub_dren', name: 'Țeavă drenaj PVC Ø110 perforată', category: 'Hidroizolație & drenaj', unit: 'm', packageQty: 1, packageLabel: 'm', defaultPrice: 58, wastePct: 5 },
  { code: 'piatris_sor', name: 'Piatriș sor 5–20 (drenaj)', category: 'Hidroizolație & drenaj', unit: 'm³', packageQty: 1, packageLabel: 'vrac / m³', defaultPrice: 460, wastePct: 0 },

  // ── Zidărie ──────────────────────────────────────────────
  { code: 'bloc_bc_25', name: 'Bloc beton celular 600×250×250 mm, D500', category: 'Zidărie', unit: 'buc', packageQty: 40, packageLabel: 'palet 40 buc', defaultPrice: 72, wastePct: 5, spec: '0,0375 m³/buc' },
  { code: 'bloc_bc_20', name: 'Bloc beton celular 600×250×200 mm, D500', category: 'Zidărie', unit: 'buc', packageQty: 50, packageLabel: 'palet 50 buc', defaultPrice: 58, wastePct: 5, spec: '0,03 m³/buc' },
  { code: 'bloc_bc_10', name: 'Bloc beton celular 600×250×100 mm, D500', category: 'Zidărie', unit: 'buc', packageQty: 100, packageLabel: 'palet 100 buc', defaultPrice: 30, wastePct: 5, spec: '0,015 m³/buc' },
  { code: 'caramida_et', name: 'Cărămidă eficientă (CT) 250×120×88', category: 'Zidărie', unit: 'buc', packageQty: 300, packageLabel: 'palet 300 buc', defaultPrice: 13, wastePct: 6, spec: 'Cu goluri, M100' },
  { code: 'caramida_pl', name: 'Cărămidă plină 250×120×65', category: 'Zidărie', unit: 'buc', packageQty: 400, packageLabel: 'palet 400 buc', defaultPrice: 10, wastePct: 6 },
  { code: 'adeziv_bc', name: 'Adeziv pentru beton celular', category: 'Zidărie', unit: 'sac', packageQty: 1, packageLabel: 'sac 25 kg', defaultPrice: 110, wastePct: 5 },
  { code: 'mortar_zidarie', name: 'Amestec uscat mortar zidărie M100', category: 'Zidărie', unit: 'kg', packageQty: 25, packageLabel: 'sac 25 kg', defaultPrice: 2.9, wastePct: 5 },
  { code: 'plasa_armare', name: 'Plasă de armare zidărie (ochiuri 50×50)', category: 'Zidărie', unit: 'm', packageQty: 25, packageLabel: 'rolă 25 m', defaultPrice: 18, wastePct: 10, spec: 'Lățime 25 cm' },
  { code: 'buiandrug_25', name: 'Buiandrug prefabricat 6000×250×175', category: 'Zidărie', unit: 'm', packageQty: 1, packageLabel: 'buc 6 m', defaultPrice: 95, wastePct: 0 },
  { code: 'buiandrug_20', name: 'Buiandrug prefabricat 2000×200×175', category: 'Zidărie', unit: 'm', packageQty: 1, packageLabel: 'buc 2 m', defaultPrice: 88, wastePct: 0 },

  // ── Structură ────────────────────────────────────────────
  { code: 'osb_3', name: 'Placă OSB-3 12 mm', category: 'Structură', unit: 'm²', packageQty: 2.97, packageLabel: 'foaie 1250×2500', defaultPrice: 145, wastePct: 10 },
  { code: 'profil_metalic_cadru', name: 'Profil metalic cadru LT (141×60×2)', category: 'Structură', unit: 'm', packageQty: 6, packageLabel: 'buc 6 m', defaultPrice: 78, wastePct: 8 },
  { code: 'vata_cadru', name: 'Vată minerală pentru cadre 200 mm', category: 'Structură', unit: 'm²', packageQty: 7.2, packageLabel: 'pachet 7,2 m²', defaultPrice: 145, wastePct: 5 },

  // ── Acoperiș ─────────────────────────────────────────────
  { code: 'tigla_metal', name: 'Țiglă metalică 0,5 mm', category: 'Acoperiș', unit: 'm²', packageQty: 1, packageLabel: 'm² (panou tăiat la comandă)', defaultPrice: 395, wastePct: 10, pricing: 'continuous', spec: 'Cu polimer, grosime 0,5 mm' },
  { code: 'carton_ondulat', name: 'Carton ondulat bituminos (Onduline)', category: 'Acoperiș', unit: 'm²', packageQty: 1, packageLabel: 'foaie 1,95×0,89 m', defaultPrice: 225, wastePct: 12, pricing: 'continuous' },
  { code: 'tabla_seam', name: 'Tablă cu cută dublă 0,55 mm', category: 'Acoperiș', unit: 'm²', packageQty: 1, packageLabel: 'm² (panou tăiat la comandă)', defaultPrice: 355, wastePct: 8, pricing: 'continuous' },
  { code: 'tigla_ceramica', name: 'Țiglă ceramică', category: 'Acoperiș', unit: 'm²', packageQty: 1, packageLabel: 'm²', defaultPrice: 640, wastePct: 8, pricing: 'continuous' },
  { code: 'folie_acoperis', name: 'Folie hidroizolatoare sub acoperiș', category: 'Acoperiș', unit: 'm²', packageQty: 75, packageLabel: 'rolă 75 m²', defaultPrice: 19, wastePct: 15 },
  { code: 'surub_acoperis', name: 'Șuruburi pentru învelitoare 4,8×35 cu garnitură EPDM', category: 'Acoperiș', unit: 'buc', packageQty: 250, packageLabel: 'cutie 250 buc', defaultPrice: 2.4, wastePct: 5 },
  { code: 'coama', name: 'Element de coamă (față și față)', category: 'Acoperiș', unit: 'm', packageQty: 1, packageLabel: 'buc 2 m', defaultPrice: 98, wastePct: 10 },
  { code: 'dolie', name: 'Dolie / elemente de planșă', category: 'Acoperiș', unit: 'buc', packageQty: 1, packageLabel: 'buc', defaultPrice: 95, wastePct: 0 },
  { code: 'jgheab', name: 'Jgheab metalic Ø125', category: 'Acoperiș', unit: 'm', packageQty: 3, packageLabel: 'buc 3 m', defaultPrice: 55, wastePct: 8 },
  { code: 'burlan', name: 'Burlan Ø90', category: 'Acoperiș', unit: 'm', packageQty: 3, packageLabel: 'buc 3 m', defaultPrice: 48, wastePct: 8 },
  { code: 'conector_lemn', name: 'Conectori metalici pentru lemn (plăci, suporturi, unghiuri)', category: 'Acoperiș', unit: 'buc', packageQty: 1, packageLabel: 'buc', defaultPrice: 38, wastePct: 5 },
  { code: 'vata_15', name: 'Vată minerală 150 mm (izolație planșeu/mansardă)', category: 'Acoperiș', unit: 'm²', packageQty: 4.8, packageLabel: 'pachet 4,8 m²', defaultPrice: 155, wastePct: 5 },
  { code: 'folie_vapori', name: 'Folie barieră de vapori', category: 'Acoperiș', unit: 'm²', packageQty: 70, packageLabel: 'rolă 70 m²', defaultPrice: 17, wastePct: 12 },

  // ── Tâmplărie ────────────────────────────────────────────
  { code: 'fereastra_pvc', name: 'Fereastră PVC cu geam termopan (2 camere)', category: 'Tâmplărie', unit: 'm²', packageQty: 1, packageLabel: 'm² (configurat pe dimensiune)', defaultPrice: 3300, wastePct: 0, pricing: 'continuous', spec: 'Profil 5 camere; montaj inclus în manoperă separat' },
  { code: 'usa_ext', name: 'Ușă metalică exterior cu izolație', category: 'Tâmplărie', unit: 'buc', packageQty: 1, packageLabel: 'set complet', defaultPrice: 11000, wastePct: 0 },
  { code: 'usa_int', name: 'Ușă interior cu toc și canat', category: 'Tâmplărie', unit: 'buc', packageQty: 1, packageLabel: 'set (fără mâner)', defaultPrice: 3600, wastePct: 0 },
  { code: 'maner_usa', name: 'Mâner ușă interior', category: 'Tâmplărie', unit: 'buc', packageQty: 1, packageLabel: 'buc', defaultPrice: 130, wastePct: 0 },
  { code: 'glaf', name: 'Glaf PIR/PVC exterior', category: 'Tâmplărie', unit: 'm', packageQty: 1, packageLabel: 'm (buc tăiat)', defaultPrice: 135, wastePct: 10 },
  { code: 'spuma_montaj', name: 'Spumă poliuretanică 750 ml', category: 'Tâmplărie', unit: 'buc', packageQty: 1, packageLabel: 'tub 750 ml', defaultPrice: 68, wastePct: 5 },
  { code: 'banda_etansare', name: 'Bandă de etanșare PSUL 25 mm', category: 'Tâmplărie', unit: 'm', packageQty: 20, packageLabel: 'rolă 20 m', defaultPrice: 4.8, wastePct: 10 },

  // ── Instalații electrice ─────────────────────────────────
  { code: 'cablu_3x25', name: 'Cablu NYM 3×2,5 mm²', category: 'Instalații electrice', unit: 'm', packageQty: 100, packageLabel: 'rolă 100 m', defaultPrice: 62, wastePct: 10 },
  { code: 'cablu_3x15', name: 'Cablu NYM 3×1,5 mm²', category: 'Instalații electrice', unit: 'm', packageQty: 100, packageLabel: 'rolă 100 m', defaultPrice: 41, wastePct: 10 },
  { code: 'cablu_5x4', name: 'Cablu NYM 5×4 mm² (plit electric)', category: 'Instalații electrice', unit: 'm', packageQty: 50, packageLabel: 'rolă 50 m', defaultPrice: 118, wastePct: 10 },
  { code: 'tub_ondulat', name: 'Tub ondulat PVC Ø16 mm', category: 'Instalații electrice', unit: 'm', packageQty: 100, packageLabel: 'rolă 100 m', defaultPrice: 13, wastePct: 8 },
  { code: 'doza_instal', name: 'Doză instalație încastrată Ø68', category: 'Instalații electrice', unit: 'buc', packageQty: 20, packageLabel: 'pachet 20 buc', defaultPrice: 13, wastePct: 5 },
  { code: 'priza', name: 'Priză dublă cu rame', category: 'Instalații electrice', unit: 'buc', packageQty: 1, packageLabel: 'set', defaultPrice: 105, wastePct: 3 },
  { code: 'intrerupator', name: 'Întrerupător (set mecanism + ramă)', category: 'Instalații electrice', unit: 'buc', packageQty: 1, packageLabel: 'set', defaultPrice: 95, wastePct: 3 },
  { code: 'tablou_electric', name: 'Tablou electric 24 module cu ramă', category: 'Instalații electrice', unit: 'buc', packageQty: 1, packageLabel: 'buc', defaultPrice: 1400, wastePct: 0 },
  { code: 'disjunctor', name: 'Disjunctor modular bipol C16', category: 'Instalații electrice', unit: 'buc', packageQty: 1, packageLabel: 'buc', defaultPrice: 105, wastePct: 0 },
  { code: 'diferential', name: 'Dispozitiv diferențial 40 A / 30 mA', category: 'Instalații electrice', unit: 'buc', packageQty: 1, packageLabel: 'buc', defaultPrice: 720, wastePct: 0 },
  { code: 'impamintare', name: 'Set împământare (3 bare + conductor)', category: 'Instalații electrice', unit: 'set', packageQty: 1, packageLabel: 'set', defaultPrice: 1050, wastePct: 0 },
  { code: 'corp_iluminat', name: 'Corp de iluminat LED încorporabil', category: 'Instalații electrice', unit: 'buc', packageQty: 1, packageLabel: 'buc', defaultPrice: 380, wastePct: 0 },
  { code: 'clema_wago', name: 'Clemă conector 2–3 intrări', category: 'Instalații electrice', unit: 'buc', packageQty: 50, packageLabel: 'pachet 50 buc', defaultPrice: 13, wastePct: 5 },

  // ── Instalații sanitare & termice ────────────────────────
  { code: 'teava_ppr', name: 'Țeavă PPR PN20 Ø25 mm', category: 'Instalații sanitare & termice', unit: 'm', packageQty: 4, packageLabel: 'buc 4 m', defaultPrice: 34, wastePct: 8 },
  { code: 'fiting_ppr', name: 'Fiting PPR (cot, teu, racord)', category: 'Instalații sanitare & termice', unit: 'buc', packageQty: 1, packageLabel: 'buc', defaultPrice: 22, wastePct: 5 },
  { code: 'robinet', name: 'Robinet sferă 1/2" cu piulițe', category: 'Instalații sanitare & termice', unit: 'buc', packageQty: 1, packageLabel: 'buc', defaultPrice: 105, wastePct: 0 },
  { code: 'distribuitor', name: 'Distribuitor (colector) 2–4 circuite', category: 'Instalații sanitare & termice', unit: 'buc', packageQty: 1, packageLabel: 'buc', defaultPrice: 520, wastePct: 0 },
  { code: 'sifon', name: 'Sifon cu prelungitor', category: 'Instalații sanitare & termice', unit: 'buc', packageQty: 1, packageLabel: 'buc', defaultPrice: 95, wastePct: 0 },
  { code: 'teava_canal_110', name: 'Țeavă canalizare PVC Ø110', category: 'Instalații sanitare & termice', unit: 'm', packageQty: 2, packageLabel: 'buc 2 m', defaultPrice: 52, wastePct: 8 },
  { code: 'teava_canal_50', name: 'Țeavă canalizare PVC Ø50', category: 'Instalații sanitare & termice', unit: 'm', packageQty: 2, packageLabel: 'buc 2 m', defaultPrice: 25, wastePct: 8 },
  { code: 'cot_canal_110', name: 'Cot canalizare 87° Ø110', category: 'Instalații sanitare & termice', unit: 'buc', packageQty: 1, packageLabel: 'buc', defaultPrice: 42, wastePct: 5 },
  { code: 'te_canal_50', name: 'Te / revizie canalizare Ø50', category: 'Instalații sanitare & termice', unit: 'buc', packageQty: 1, packageLabel: 'buc', defaultPrice: 28, wastePct: 5 },
  { code: 'izolatie_teava', name: 'Izolație pentru țevi spumă PE 13 mm', category: 'Instalații sanitare & termice', unit: 'm', packageQty: 2, packageLabel: 'buc 2 m', defaultPrice: 16, wastePct: 8 },
  { code: 'centrala', name: 'Centrală termică pe gaz 24 kW', category: 'Instalații sanitare & termice', unit: 'buc', packageQty: 1, packageLabel: 'buc', defaultPrice: 24000, wastePct: 0 },
  { code: 'radiator', name: 'Radiator panou tip 22, 500×1000', category: 'Instalații sanitare & termice', unit: 'buc', packageQty: 1, packageLabel: 'buc', defaultPrice: 2700, wastePct: 0 },
  { code: 'teava_pex', name: 'Țeavă PE-RT/PEX Ø16 mm (încălzire în pardoseală)', category: 'Instalații sanitare & termice', unit: 'm', packageQty: 100, packageLabel: 'rolă 100 m', defaultPrice: 24, wastePct: 5 },
  { code: 'vas_wc', name: 'Vas WC monobloc cu rezervor', category: 'Instalații sanitare & termice', unit: 'set', packageQty: 1, packageLabel: 'set', defaultPrice: 4600, wastePct: 0 },
  { code: 'lavoar', name: 'Lavoar ceramică cu sifon', category: 'Instalații sanitare & termice', unit: 'set', packageQty: 1, packageLabel: 'set', defaultPrice: 1950, wastePct: 0 },
  { code: 'bideu', name: 'Bideu ceramică cu robinet', category: 'Instalații sanitare & termice', unit: 'set', packageQty: 1, packageLabel: 'set', defaultPrice: 2600, wastePct: 0 },
  { code: 'cada_dus', name: 'Cadă / cabină de dus', category: 'Instalații sanitare & termice', unit: 'set', packageQty: 1, packageLabel: 'set', defaultPrice: 6800, wastePct: 0 },
  { code: 'baterie', name: 'Baterie sanitară', category: 'Instalații sanitare & termice', unit: 'buc', packageQty: 1, packageLabel: 'buc', defaultPrice: 1050, wastePct: 0 },
  { code: 'chiuveta_bucatarie', name: 'Chiuvetă inox cu sifon', category: 'Instalații sanitare & termice', unit: 'set', packageQty: 1, packageLabel: 'set', defaultPrice: 2100, wastePct: 0 },

  // ── Izolație & fațadă ────────────────────────────────────
  { code: 'polistiren_5', name: 'Polistiren expandat EPS70 50 mm', category: 'Izolație & fațadă', unit: 'm²', packageQty: 12, packageLabel: 'pachet 12 m²', defaultPrice: 58, wastePct: 6 },
  { code: 'polistiren_10', name: 'Polistiren expandat EPS70 100 mm', category: 'Izolație & fațadă', unit: 'm²', packageQty: 6, packageLabel: 'pachet 6 m²', defaultPrice: 105, wastePct: 6 },
  { code: 'vata_10', name: 'Vată minerală fațadă 100 mm', category: 'Izolație & fațadă', unit: 'm²', packageQty: 7.2, packageLabel: 'pachet 7,2 m²', defaultPrice: 148, wastePct: 5 },
  { code: 'adeziv_termosistem', name: 'Adeziv termosistem (fixare + plasă)', category: 'Izolație & fațadă', unit: 'sac', packageQty: 1, packageLabel: 'sac 25 kg', defaultPrice: 118, wastePct: 5 },
  { code: 'dibluri_termo', name: 'Dibluri termo cu cui metalic 10×120', category: 'Izolație & fațadă', unit: 'buc', packageQty: 100, packageLabel: 'pachet 100 buc', defaultPrice: 3.4, wastePct: 3 },
  { code: 'plasa_fatada', name: 'Plasă de armare fațadă 5×5 mm', category: 'Izolație & fațadă', unit: 'm²', packageQty: 50, packageLabel: 'rolă 50 m²', defaultPrice: 24, wastePct: 10 },
  { code: 'profil_start', name: 'Profil de start (bordură) 2000 mm', category: 'Izolație & fațadă', unit: 'm', packageQty: 2, packageLabel: 'buc 2 m', defaultPrice: 15, wastePct: 5 },
  { code: 'coltar_profil', name: 'Profil colțar cu plasă 2500 mm', category: 'Izolație & fațadă', unit: 'buc', packageQty: 1, packageLabel: 'buc 2,5 m', defaultPrice: 20, wastePct: 8 },
  { code: 'grund_aderent', name: 'Grund aderent cu cuarț', category: 'Izolație & fațadă', unit: 'L', packageQty: 10, packageLabel: 'canistră 10 L', defaultPrice: 34, wastePct: 0 },
  { code: 'tencuiala_deco', name: 'Tencuială decorativă granulație 1,5 mm', category: 'Izolație & fațadă', unit: 'kg', packageQty: 25, packageLabel: 'găleată 25 kg', defaultPrice: 21, wastePct: 5 },
  { code: 'vopsea_fatada', name: 'Vopsea fațadă silicatică', category: 'Izolație & fațadă', unit: 'L', packageQty: 15, packageLabel: 'găleată 15 L', defaultPrice: 82, wastePct: 0 },

  // ── Finisaje interioare ──────────────────────────────────
  { code: 'tencuiala_int', name: 'Tencuială interioară gips', category: 'Finisaje interioare', unit: 'kg', packageQty: 30, packageLabel: 'sac 30 kg', defaultPrice: 5.4, wastePct: 5 },
  { code: 'glet_pasta', name: 'Pasta glet fină', category: 'Finisaje interioare', unit: 'kg', packageQty: 25, packageLabel: 'găleată 25 kg', defaultPrice: 17, wastePct: 3 },
  { code: 'grund_abs', name: 'Grund de absorbție interior', category: 'Finisaje interioare', unit: 'L', packageQty: 10, packageLabel: 'canistră 10 L', defaultPrice: 28, wastePct: 0 },
  { code: 'vopsea_interioara', name: 'Vopsea lavabilă interioară', category: 'Finisaje interioare', unit: 'L', packageQty: 14, packageLabel: 'găleată 14 L', defaultPrice: 58, wastePct: 0 },
  { code: 'gips_placa', name: 'Placă gips-carton 1200×2500×12,5', category: 'Finisaje interioare', unit: 'm²', packageQty: 3, packageLabel: 'foaie 3 m²', defaultPrice: 96, wastePct: 10 },
  { code: 'profil_cd', name: 'Profil CD 60×27, 3000 mm', category: 'Finisaje interioare', unit: 'm', packageQty: 3, packageLabel: 'buc 3 m', defaultPrice: 17, wastePct: 8 },
  { code: 'profil_ud', name: 'Profil UD 28×27, 3000 mm', category: 'Finisaje interioare', unit: 'm', packageQty: 3, packageLabel: 'buc 3 m', defaultPrice: 12, wastePct: 8 },
  { code: 'surub_gips', name: 'Șuruburi gips-carton 3,5×25', category: 'Finisaje interioare', unit: 'buc', packageQty: 1000, packageLabel: 'cutie 1000 buc', defaultPrice: 0.22, wastePct: 5 },
  { code: 'banda_rost', name: 'Bandă pentru rosturi (serpyankă)', category: 'Finisaje interioare', unit: 'm', packageQty: 90, packageLabel: 'rolă 90 m', defaultPrice: 1.1, wastePct: 8 },
  { code: 'chit_rosturi', name: 'Chit pentru rosturi gips-carton', category: 'Finisaje interioare', unit: 'kg', packageQty: 5, packageLabel: 'sac 5 kg', defaultPrice: 19, wastePct: 3 },
  { code: 'adeziv_gresie', name: 'Adeziv pentru gresie și faianță', category: 'Finisaje interioare', unit: 'kg', packageQty: 25, packageLabel: 'sac 25 kg', defaultPrice: 5.2, wastePct: 5 },
  { code: 'gresie', name: 'Gresie ceramică clasa I', category: 'Finisaje interioare', unit: 'm²', packageQty: 1.44, packageLabel: 'cutie 1,44 m²', defaultPrice: 340, wastePct: 10, pricing: 'continuous' },
  { code: 'faianta', name: 'Faianță ceramică', category: 'Finisaje interioare', unit: 'm²', packageQty: 1.5, packageLabel: 'cutie 1,5 m²', defaultPrice: 310, wastePct: 12, pricing: 'continuous' },
  { code: 'chit_gresie', name: 'Chit pentru rosturi gresie', category: 'Finisaje interioare', unit: 'kg', packageQty: 5, packageLabel: 'sac 5 kg', defaultPrice: 32, wastePct: 3 },
  { code: 'crosete', name: 'Croșete de egalizare (barete)', category: 'Finisaje interioare', unit: 'buc', packageQty: 100, packageLabel: 'pachet 100 buc', defaultPrice: 2, wastePct: 5 },
  { code: 'laminat', name: 'Laminat clasa 32, 8 mm', category: 'Finisaje interioare', unit: 'm²', packageQty: 2.22, packageLabel: 'pachet 2,22 m²', defaultPrice: 330, wastePct: 7, pricing: 'continuous' },
  { code: 'parchet_inginerie', name: 'Parchet inginerie stejar', category: 'Finisaje interioare', unit: 'm²', packageQty: 2.2, packageLabel: 'pachet 2,2 m²', defaultPrice: 880, wastePct: 7, pricing: 'continuous' },
  { code: 'substrat_pardoseala', name: 'Substrat spumă pentru pardoseli 3 mm', category: 'Finisaje interioare', unit: 'm²', packageQty: 15, packageLabel: 'rolă 15 m²', defaultPrice: 24, wastePct: 5 },
  { code: 'plinta', name: 'Plintă MDF 2400 mm', category: 'Finisaje interioare', unit: 'm', packageQty: 2.4, packageLabel: 'buc 2,4 m', defaultPrice: 32, wastePct: 8 },
  { code: 'profil_tranzitie', name: 'Profil de tranziție 900 mm', category: 'Finisaje interioare', unit: 'buc', packageQty: 1, packageLabel: 'buc 0,9 m', defaultPrice: 42, wastePct: 0 },
  { code: 'silicon', name: 'Silicon sanitar', category: 'Finisaje interioare', unit: 'buc', packageQty: 1, packageLabel: 'tub 280 ml', defaultPrice: 60, wastePct: 0 },
  { code: 'tavan_extensibil', name: 'Tavan extensibil cu montaj', category: 'Finisaje interioare', unit: 'm²', packageQty: 1, packageLabel: 'm² (montaj inclus)', defaultPrice: 195, wastePct: 0, pricing: 'continuous' },

  // ── Exterior ─────────────────────────────────────────────
  { code: 'pavaj', name: 'Pavaj beton 60 mm', category: 'Exterior', unit: 'm²', packageQty: 0.96, packageLabel: 'm² (pietre 0,24 m²/buc)', defaultPrice: 275, wastePct: 8, pricing: 'continuous' },
  { code: 'bordura', name: 'Bordură drum 1000×200×80', category: 'Exterior', unit: 'm', packageQty: 1, packageLabel: 'buc 1 m', defaultPrice: 92, wastePct: 5 },
  { code: 'gard_profil', name: 'Gard tablă profilat H=1,8 m (set pe metru liniar)', category: 'Exterior', unit: 'm', packageQty: 1, packageLabel: 'm liniar', defaultPrice: 780, wastePct: 3, pricing: 'continuous' },
  { code: 'poarta', name: 'Poartă culisantă 4 m cu automatizare', category: 'Exterior', unit: 'set', packageQty: 1, packageLabel: 'set', defaultPrice: 27000, wastePct: 0 },
]

export interface LaborDef {
  code: string
  name: string
  unit: string
  defaultPrice: number // MDL/unitate, ORIENTATIV
}

export const LABOR_CATALOG: LaborDef[] = [
  { code: 'decopertare', name: 'Decopertarea stratului vegetal', unit: 'm²', defaultPrice: 15 },
  { code: 'sapatura_manuala', name: 'Săpături manuale', unit: 'm³', defaultPrice: 65 },
  { code: 'sapatura_utilaj', name: 'Săpături cu excavator', unit: 'm³', defaultPrice: 45 },
  { code: 'evacuare_pamant', name: 'Evacuarea pământului', unit: 'm³', defaultPrice: 90 },
  { code: 'nivelare', name: 'Nivelarea terenului', unit: 'm²', defaultPrice: 15 },
  { code: 'compactare', name: 'Compactarea straturilor', unit: 'm²', defaultPrice: 12 },
  { code: 'turnare_beton', name: 'Turnarea și vibrarea betonului', unit: 'm³', defaultPrice: 850 },
  { code: 'armare', name: 'Armare (confecționare și montaj rețea)', unit: 't', defaultPrice: 1900 },
  { code: 'cofraj', name: 'Montaj și demontaj cofraj', unit: 'm²', defaultPrice: 130 },
  { code: 'hidroizolatie', name: 'Montaj hidroizolație', unit: 'm²', defaultPrice: 60 },
  { code: 'zidarie_bc', name: 'Zidărie din beton celular', unit: 'm³', defaultPrice: 520 },
  { code: 'zidarie_caramida', name: 'Zidărie din cărămidă', unit: 'm³', defaultPrice: 780 },
  { code: 'zidarie_interioara', name: 'Zidărie pereți interioare subțiri', unit: 'm²', defaultPrice: 95 },
  { code: 'structura_acoperis', name: 'Montaj structură acoperiș (lemn)', unit: 'm²', defaultPrice: 190 },
  { code: 'invelitoare', name: 'Montaj învelitoare', unit: 'm²', defaultPrice: 175 },
  { code: 'jgheaburi', name: 'Montaj jgheaburi și burlane', unit: 'm', defaultPrice: 60 },
  { code: 'montaj_ferestre', name: 'Montaj ferestre', unit: 'm²', defaultPrice: 450 },
  { code: 'montaj_usa_ext', name: 'Montaj ușă exterior', unit: 'buc', defaultPrice: 1300 },
  { code: 'montaj_usa_int', name: 'Montaj ușă interior', unit: 'buc', defaultPrice: 1100 },
  { code: 'electric_punct', name: 'Instalație electrică (punct: priză/întrerupător/iluminat)', unit: 'punct', defaultPrice: 230 },
  { code: 'electric_tablou', name: 'Montaj și conectare tablou electric', unit: 'buc', defaultPrice: 3500 },
  { code: 'sanitar_punct', name: 'Instalație sanitară (punct: obiect/baterie)', unit: 'punct', defaultPrice: 1400 },
  { code: 'montaj_radiator', name: 'Montaj radiator', unit: 'buc', defaultPrice: 900 },
  { code: 'montaj_centrala', name: 'Montaj centrală și punere în funcțiune', unit: 'buc', defaultPrice: 6500 },
  { code: 'izolatie_fatada', name: 'Termoizolație fațadă (adeziv + dibluri + plasă)', unit: 'm²', defaultPrice: 290 },
  { code: 'tencuiala_fatada', name: 'Tencuială decorativă fațadă', unit: 'm²', defaultPrice: 230 },
  { code: 'tencuiala_int', name: 'Tencuială interioară', unit: 'm²', defaultPrice: 190 },
  { code: 'gips_carton', name: 'Montaj gips-carton (perete/tavan)', unit: 'm²', defaultPrice: 250 },
  { code: 'gletuire', name: 'Gletuire (2 straturi)', unit: 'm²', defaultPrice: 90 },
  { code: 'vopsire', name: 'Vopsire (2 straturi)', unit: 'm²', defaultPrice: 75 },
  { code: 'gresie', name: 'Montaj gresie', unit: 'm²', defaultPrice: 310 },
  { code: 'faianta', name: 'Montaj faianță', unit: 'm²', defaultPrice: 350 },
  { code: 'pardoseli', name: 'Montaj laminat / parchet', unit: 'm²', defaultPrice: 150 },
  { code: 'plinte', name: 'Montaj plinte', unit: 'm', defaultPrice: 35 },
  { code: 'pavaj', name: 'Montaj pavaj', unit: 'm²', defaultPrice: 150 },
  { code: 'gard', name: 'Montaj gard', unit: 'm', defaultPrice: 180 },
]

// Norme de consum documentate (folosite de motorul de calcul).
// Fiecare valoare poate fi suprascrisă în proiect prin opțiuni.
export const NORMS = {
  // Beton
  armaturaFundaBanda: 90, // kg/m³ beton
  armaturaPlaca: 80, // kg/m³ beton (dublu rețea)
  armaturaStalpi: 110, // kg/m³ beton
  armaturaPlanseu: 85, // kg/m³ beton
  sarmaLegat: 0.015, // kg sârmă / kg armătură
  distantiereBanda: 2.5, // buc/m lungime fundație
  distantierePlaca: 4, // buc/m² placă
  cuieCofraj: 0.12, // kg/m² cofraj
  // Fundații — geometrie implicită (estimativ, validare de proiect necesară)
  latimeBanda: 0.4, // m
  inaltimeBanda: 0.8, // m (0,6 sub nivel + 0,2 deasupra)
  grosimePlaca: 0.25, // m
  adancimeSapatura: 1.3, // m
  latimeSapatura: 0.6, // m (spațiu de lucru)
  // Zidărie
  adezivBetonCelular: 27, // kg/m³ zidărie
  mortarCaramida: 320, // kg amestec/m³ zidărie
  blocBcAria: 0.15, // m²/buc (600×250)
  caramidaEtM2: 51, // buc/m² perete 38 cm
  caramidaPlM2: 50, // buc/m² perete 12 cm
  // Acoperiș
  lemnAcoperis: 0.048, // m³ lemn/m² acoperiș (căpriori + pane + șipci)
  suruburiInvelitoare: 8, // buc/m²
  pasSipci: 0.32, // m (țiglă metalică)
  // Fațadă
  adezivFixare: 5, // kg/m²
  adezivPlasa: 4, // kg/m²
  dibluriFatada: 6, // buc/m²
  grundAderent: 0.3, // L/m²
  tencuialaDeco: 3.5, // kg/m²
  vopseaFatada: 0.28, // L/m² (2 straturi)
  // Finisaje interioare
  tencuialaIntKgM2: 12, // kg/m² (grosime ~1 cm)
  gletKgM2: 1.6, // kg/m² (2 straturi)
  grundIntM2: 0.12, // L/m²
  vopseaIntM2: 0.24, // L/m² (2 straturi)
  adezivGresie: 4, // kg/m²
  chitGresie: 0.45, // kg/m²
  surubGipsPerete: 23, // buc/m² placă
  surubGipsTavan: 17, // buc/m² placă
  profilCdTavan: 2.6, // m/m² placă
  profilCdPerete: 2.0, // m/m² placă (ambele fețe)
  bandaRostM2: 0.5, // m bandă/m² placă
  chitRostM2: 0.2, // kg/m² placă
  laminatPierdere: 7, // %
  // Electric
  traseuPriza: 3.5, // m cablu/priză (medie traseu)
  traseuIntrerupator: 2.8, // m
  traseuIluminat: 4.5, // m
  dozePentruPunct: 0.45, // doze/punct
  clemePunct: 1.5, // cleme/punct
  // Sanitar
  teviBaie: 12, // m țevi alimentare/baie
  teviBucatarie: 10, // m
  teviDinCentrala: 8, // m
  fitingPerM: 0.5, // fitinguri/m țeavă
  pexM2Pardoseala: 5.5, // m țeavă/m² încălzire în pardoseală
} as const

export const MATERIAL_DEFS: Record<string, MaterialDef> = Object.fromEntries(
  MATERIAL_CATALOG.map((m) => [m.code, m])
)

export const LABOR_DEFS: Record<string, LaborDef> = Object.fromEntries(
  LABOR_CATALOG.map((l) => [l.code, l])
)

export const CURRENCY_RATES_DEFAULT = {
  MDL: 1,
  EUR: 19.6,
  USD: 17.6,
  RON: 4.42,
} as const

export type CurrencyCode = keyof typeof CURRENCY_RATES_DEFAULT
