// Generează o poză-sintetică de plan cu dimensiuni și testează /api/ai/plan
import sharp from 'sharp'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
  <rect width="600" height="400" fill="white"/>
  <rect x="40" y="40" width="300" height="200" fill="none" stroke="black" stroke-width="4"/>
  <text x="120" y="150" font-size="28" fill="black">Living 5.5x4.2</text>
  <rect x="360" y="40" width="180" height="130" fill="none" stroke="black" stroke-width="4"/>
  <text x="390" y="110" font-size="22" fill="black">Baie 2.4x2.0</text>
  <rect x="40" y="260" width="500" height="100" fill="none" stroke="black" stroke-width="4"/>
  <text x="220" y="320" font-size="26" fill="black">Dormitor 4x3.5</text>
</svg>`

const png = await sharp(Buffer.from(svg)).png().toBuffer()
const b64 = png.toString('base64')

const res = await fetch('http://localhost:3000/api/ai/plan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ image: b64 }),
})
console.log('HTTP', res.status)
const data = await res.json()
console.log(JSON.stringify(data, null, 2).slice(0, 1200))
