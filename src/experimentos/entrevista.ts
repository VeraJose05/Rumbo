// RF-01: chat de consola para probar la entrevista (npm run entrevista).
// Escribe «salir» para terminar antes de tiempo.
import { createInterface } from 'node:readline/promises';
import { entrevistaFlow } from '../index.js';

const consola = createInterface({ input: process.stdin, output: process.stdout });

let turno = await entrevistaFlow({ mensaje: '' });
while (!turno.perfil) {
  console.log(`\nRumbo: ${turno.respuesta}`);
  console.log(`        (perfil hasta ahora: ${JSON.stringify(turno.estado.perfil)})`);
  const mensaje = await consola.question('Tú: ');
  if (mensaje.trim().toLowerCase() === 'salir') break;
  turno = await entrevistaFlow({ estado: turno.estado, mensaje });
}

if (turno.perfil) {
  console.log(`\nRumbo: ${turno.respuesta}`);
  console.log(`\nPerfil validado:\n${JSON.stringify(turno.perfil, null, 2)}`);
}
consola.close();
process.exit(0);
