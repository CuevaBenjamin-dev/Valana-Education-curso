/** Regenerate the neutral social placeholder with: node scripts/generate-og.mjs. */
import sharp from 'sharp';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#20221f"/>
<g stroke="#f2f0e9" stroke-opacity=".16"><path d="M64 98h1072M64 552h1072M869 98v454M64 98v454M1136 98v454"/></g>
<g font-family="Arial, sans-serif" fill="#f2f0e9"><text x="64" y="66" font-size="34" font-weight="700" letter-spacing="-2">ESCS</text><text x="869" y="61" font-size="12" letter-spacing="2" fill="#b4b7ae">FORMACIÓN PRÁCTICA</text>
<text x="64" y="157" font-size="12" letter-spacing="3" fill="#d7f0b2">APRENDER PARA HACER.</text>
<text x="59" y="254" font-size="70" font-weight="700" letter-spacing="-3">INTELIGENCIA</text><text x="59" y="336" font-size="80" font-weight="700" letter-spacing="-3">ARTIFICIAL<tspan fill="#d7f0b2">.</tspan></text><text x="64" y="396" font-size="43" font-weight="700" letter-spacing="-1">Y DIGITALIZACIÓN</text>
<text x="65" y="446" font-size="17" letter-spacing="1">PARA EL TRABAJO Y LOS NEGOCIOS</text>
<text x="65" y="516" font-size="14" fill="#b4b7ae">Desde cero · Aplicación práctica · Con Benjamín Cueva</text>
<text x="894" y="363" font-size="180" font-weight="700" letter-spacing="-15" fill="#404639">IA</text><text x="888" y="516" font-size="10" letter-spacing="1" fill="#b4b7ae">TECNOLOGÍA CON PROPÓSITO</text>
<text x="64" y="594" font-size="11" letter-spacing="2" fill="#b4b7ae">EL FUTURO TAMBIÉN SE APRENDE.</text><text x="1098" y="594" font-size="25" fill="#d7f0b2">↗</text></g></svg>`;
await sharp(Buffer.from(svg)).png().toFile(new URL('../public/og-course.png', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
console.log('public/og-course.png · 1200 × 630');
