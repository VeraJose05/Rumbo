// F5: tabla de resultados por modo y grupo, a partir de las ejecuciones (npm run evaluar) y los
// juicios (npm run juzgar) guardados. Las métricas que no aplican (null) no cuentan en la media.
import type { MetricasItinerario } from './metricas.js';

interface Registro {
  perfilId: string;
  grupo: string;
  modo: string;
  segundos: number;
  modelos: { llm: string };
  metricas: MetricasItinerario;
}

interface JuicioGuardado {
  perfilId: string;
  modo: string;
  llm: string;
  juez: string;
  metrica: string;
  nota: number;
}

export interface Fila {
  modo: string;
  grupo: string;
  perfiles: number;
  planificados: number;
  fidelidad: number | null;
  fidelidadLaxa: number | null;
  coberturaCitas: number | null;
  ritmoCumplido: number | null;
  relevancia: number | null;
  viabilidad: number | null;
  segundos: number | null;
}

const ORDEN_GRUPOS = ['todos', 'normal', 'poco-cubierto', 'contradictorio', 'fuera-corpus'];

function media(valores: (number | null | undefined)[]): number | null {
  const presentes = valores.filter((v): v is number => typeof v === 'number');
  return presentes.length ? presentes.reduce((a, b) => a + b, 0) / presentes.length : null;
}

export function agregar(registros: Registro[], juicios: JuicioGuardado[], juez: string): Fila[] {
  const nota = (r: Registro, metrica: string) =>
    juicios.find((j) => j.juez === juez && j.metrica === metrica && j.perfilId === r.perfilId && j.modo === r.modo && j.llm === r.modelos.llm)
      ?.nota;

  const modos = [...new Set(registros.map((r) => r.modo))].sort();
  const filas: Fila[] = [];
  for (const grupo of ORDEN_GRUPOS) {
    for (const modo of modos) {
      const elegidos = registros.filter((r) => r.modo === modo && (grupo === 'todos' || r.grupo === grupo));
      if (!elegidos.length) continue;
      filas.push({
        modo,
        grupo,
        perfiles: elegidos.length,
        planificados: elegidos.filter((r) => r.metricas.planificado).length,
        fidelidad: media(elegidos.map((r) => r.metricas.fidelidad)),
        fidelidadLaxa: media(elegidos.map((r) => r.metricas.fidelidadLaxa)),
        coberturaCitas: media(elegidos.map((r) => r.metricas.coberturaCitas)),
        ritmoCumplido: media(elegidos.map((r) => r.metricas.ritmoCumplido)),
        relevancia: media(elegidos.map((r) => nota(r, 'relevancia'))),
        viabilidad: media(elegidos.map((r) => nota(r, 'viabilidad'))),
        segundos: media(elegidos.map((r) => r.segundos)),
      });
    }
  }
  return filas;
}

// Con coma decimal, como se escribirá en la memoria.
const numero = (valor: number | null, decimales: number) => (valor === null ? '—' : valor.toFixed(decimales).replace('.', ','));

export function tablaMarkdown(filas: Fila[]): string {
  const lineas = [
    '| Grupo | Modo | Planifica | Fidelidad (estricta–laxa) | Citas | Ritmo | Relevancia (1-5) | Viabilidad (1-5) | Segundos |',
    '|---|---|---|---|---|---|---|---|---|',
  ];
  for (const f of filas) {
    const fidelidad = f.fidelidad === null ? '—' : `${numero(f.fidelidad, 2)}–${numero(f.fidelidadLaxa, 2)}`;
    lineas.push(
      `| ${f.grupo} | ${f.modo} | ${f.planificados}/${f.perfiles} | ${fidelidad} | ${numero(f.coberturaCitas, 2)} | ` +
        `${numero(f.ritmoCumplido, 2)} | ${numero(f.relevancia, 1)} | ${numero(f.viabilidad, 1)} | ${numero(f.segundos, 0)} |`,
    );
  }
  return lineas.join('\n');
}
