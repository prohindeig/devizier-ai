// Generează pictogramele PWA Devizier AI din SVG (sharp)
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

const OUT = "/home/z/my-project/public/icons";
mkdirSync(OUT, { recursive: true });

// Pictogramă: casă cu acoperiș portocaliu + linii de deviz (identitate: navy #1e3a5f / portocaliu #f97316)
const glyph = (scale = 1, pad = 0) => {
  // canvas 512, conținut scalat în jurul centrului
  return `
  <g transform="translate(${256 * (1 - scale) + pad} ${256 * (1 - scale) + pad}) scale(${scale})">
    <path d="M256 84 L430 222 L82 222 Z" fill="#f97316"/>
    <rect x="132" y="222" width="248" height="210" rx="14" fill="#ffffff"/>
    <rect x="164" y="258" width="128" height="20" rx="10" fill="#1e3a5f"/>
    <rect x="164" y="296" width="184" height="20" rx="10" fill="#b6c2cf"/>
    <rect x="164" y="334" width="96" height="20" rx="10" fill="#f97316"/>
    <rect x="164" y="372" width="152" height="20" rx="10" fill="#b6c2cf"/>
  </g>`;
};

const iconAny = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#1e3a5f"/>
  ${glyph(1)}
</svg>`;

// maskable: fundal integral (fără colțuri rotunjite), conținut în zona sigură (~80%)
const iconMaskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1e3a5f"/>
  ${glyph(0.78)}
</svg>`;

writeFileSync(path.join(OUT, "app-icon.svg"), iconAny);
writeFileSync(path.join(OUT, "app-icon-maskable.svg"), iconMaskable);

const jobs = [
  { svg: iconAny, size: 512, file: "icon-512.png" },
  { svg: iconAny, size: 192, file: "icon-192.png" },
  { svg: iconMaskable, size: 512, file: "maskable-512.png" },
  { svg: iconMaskable, size: 180, file: "apple-touch-icon.png" }, // iOS: full-bleed, fără transparență
  { svg: iconAny, size: 96, file: "icon-96.png" },
];

for (const j of jobs) {
  await sharp(Buffer.from(j.svg))
    .resize(j.size, j.size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, j.file));
  console.log("OK", j.file, j.size);
}
console.log("Pictograme generate în", OUT);
