// @vitest-environment jsdom
// RF-11, RF-12: el itinerario cambia de día y pide ajustes a la API (simulada).
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Viaje } from '../viaje/ajustar';
import type { Dia } from '../viaje/itinerario';
import { perfilInicial } from '../viaje/perfil';
import { Itinerario } from './Itinerario';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const dia = (n: number, lugar: string): Dia => ({
  dia: n,
  manana: [{ lugar, descripcion: `Visita ${lugar}`, citas: [1], verificacion: 'verificada' }],
  tarde: [],
  noche: [],
});
const viaje: Viaje = {
  perfil: { ...perfilInicial('Sevilla'), dias: 2, intereses: ['monumentos'] },
  itinerario: {
    modo: 'C1',
    hayInformacion: true,
    dias: [dia(1, 'Catedral de Sevilla'), dia(2, 'Torre del Oro')],
    fuentes: [{ cita: 1, seccion: 'Ver', fuente: 'Wikivoyage', url: 'https://es.wikivoyage.org/wiki/Sevilla', licencia: 'CC BY-SA 4.0' }],
    interesesSinCobertura: ['playa'],
    recuperados: [{ cita: 1, id: 's:1', seccion: 'Ver', texto: '* Catedral de Sevilla - Gótica.\n* Torre del Oro - Torre vigía.' }],
  },
  quitados: [],
};

describe('Itinerario', () => {
  it('enseña un día cada vez y avisa de los gustos que la guía no cubre', () => {
    render(<Itinerario viaje={viaje} onCambiar={() => {}} />);
    expect(screen.getByText('Catedral de Sevilla')).toBeTruthy();
    expect(screen.queryByText('Torre del Oro')).toBeNull();
    // La pestaña del día (también está el botón «Día 2 →» al final del camino).
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Días' })).getByRole('button', { name: 'Día 2' }));
    expect(screen.getByText('Torre del Oro')).toBeTruthy();
    expect(screen.getByText(/no cubre/).textContent).toContain('playa');
  });

  it('pide el ajuste a la API y enseña la respuesta de Rumbo', async () => {
    const ajustado = { ...viaje, quitados: ['Catedral de Sevilla'] };
    const fetchSimulado = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { ...ajustado, respuesta: 'Hecho: he quitado Catedral de Sevilla.' } }),
    });
    vi.stubGlobal('fetch', fetchSimulado);
    const onCambiar = vi.fn();
    render(<Itinerario viaje={viaje} onCambiar={onCambiar} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Ajusta tu plan' }), { target: { value: 'quita la Catedral' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar' }));
    await waitFor(() => expect(screen.getByText('Hecho: he quitado Catedral de Sevilla.')).toBeTruthy());
    expect(onCambiar).toHaveBeenCalledWith(ajustado);
    expect(JSON.parse(fetchSimulado.mock.calls[0]![1].body).data.mensaje).toBe('quita la Catedral');
  });

  it('si se agota la cuota, lo dice en vez de romperse', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({ message: 'Rumbo ha agotado la cuota.' }) }));
    render(<Itinerario viaje={viaje} onCambiar={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Más tranquilo' }));
    await waitFor(() => expect(screen.getByText('Rumbo ha agotado la cuota.')).toBeTruthy());
  });
});
