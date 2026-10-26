// RF-09 (semilla): la misma pregunta sin RAG (C0) y con RAG básico (C1)
// (npm run comparar -- "pregunta"; destino con DESTINO=Sevilla).
import { preguntaFlow, pruebaFlow } from '../index.js';

const pregunta = process.argv.slice(2).join(' ') || '¿Qué ver en un día en Sevilla?';
const destino = process.env.DESTINO || 'Sevilla';

// Al modelo solo también se le dice el destino, para que la comparación sea justa.
const sinRag = await pruebaFlow({ pregunta: `${pregunta} (destino: ${destino})` });
const conRag = await preguntaFlow({ pregunta, destino });

console.log(`Pregunta: «${pregunta}»\n`);
console.log('──── C0 · Solo el modelo (sin RAG) ────');
console.log(`${sinRag.respuesta}\n`);
console.log('──── C1 · RAG básico ────');
console.log(`${conRag.respuesta}\n`);
console.log('Recomendaciones:');
for (const r of conRag.recomendaciones) {
  console.log(`  ${r.verificada ? '✓' : '✗'} ${r.lugar} [${r.citas.join(', ')}]: ${r.detalle}`);
}
if (!conRag.recomendaciones.length) console.log('  (ninguna)');
console.log('\nFuentes:');
for (const f of conRag.fuentes) console.log(`  [${f.cita}] ${f.seccion} · ${f.fuente}, ${f.url} (${f.licencia})`);
if (!conRag.fuentes.length) console.log('  (ninguna)');
