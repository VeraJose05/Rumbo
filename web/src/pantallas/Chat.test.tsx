// @vitest-environment jsdom
// RF-02, RF-12: la libreta saluda, reenvía el estado de la entrevista y, con el perfil completo,
// pasa a preparar el viaje.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { perfilInicial } from '../viaje/perfil';
import { Chat } from './Chat';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

const respuesta = (result: unknown) => ({ ok: true, json: async () => ({ result }) });

/** Simula la API: /info (aviso de privacidad) y las respuestas de la entrevista, en orden. */
function api(...turnos: unknown[]) {
  return vi.fn(async (url: string, _opciones?: RequestInit) => (url === '/info' ? { ok: true, json: async () => ({ proveedores: [] }) } : respuesta(turnos.shift())));
}
const llamadasEntrevista = (f: ReturnType<typeof api>) => f.mock.calls.filter(([url]) => url === '/entrevistaFlow');

describe('Chat', () => {
  it('saluda, reenvía el estado y con el perfil completo llama a onPerfil', async () => {
    const perfil = { ...perfilInicial('Valencia'), intereses: ['museos' as const] };
    const fetchSimulado = api(
      { estado: { paso: 1 }, respuesta: '¿A dónde te gustaría ir?', perfil: null },
      { estado: { paso: 2 }, respuesta: '¡Perfecto! Preparo tu itinerario.', perfil },
    );
    vi.stubGlobal('fetch', fetchSimulado);
    const onPerfil = vi.fn();
    render(<Chat onPerfil={onPerfil} />);

    await waitFor(() => expect(screen.getByText('¿A dónde te gustaría ir?')).toBeTruthy());
    fireEvent.change(screen.getByRole('textbox', { name: 'Tu mensaje' }), { target: { value: 'Valencia, sí' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(screen.getByText('¡Perfecto! Preparo tu itinerario.')).toBeTruthy());

    expect(JSON.parse(llamadasEntrevista(fetchSimulado)[1]![1]!.body as string).data).toEqual({ estado: { paso: 1 }, mensaje: 'Valencia, sí' });
    await waitFor(() => expect(onPerfil).toHaveBeenCalledWith(perfil), { timeout: 2000 });
  });

  it('pinta los enlaces de la guía como enlaces', async () => {
    vi.stubGlobal('fetch', api({ estado: {}, respuesta: 'Cuesta 8,75 €. ([Wikivoyage](https://es.wikivoyage.org/wiki/Sevilla))', perfil: null }));
    render(<Chat onPerfil={() => {}} />);
    const enlace = await screen.findByRole('link', { name: 'Wikivoyage' });
    expect(enlace.getAttribute('href')).toBe('https://es.wikivoyage.org/wiki/Sevilla');
  });
});
