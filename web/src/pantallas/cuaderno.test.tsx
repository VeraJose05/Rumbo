// @vitest-environment jsdom
// RF-12: pasaporte (sellos, insignias, importar copia) y «Mis viajes» (abrir y borrar).
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Guardado } from '../cuaderno/guardados';
import { copiaPasaporte, type Visita } from '../cuaderno/pasaporte';
import { perfilInicial } from '../viaje/perfil';
import { MisViajes } from './MisViajes';
import { Pasaporte } from './Pasaporte';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const visita = (lugar: string, seccion = 'Ver'): Visita => ({ destino: 'Sevilla', lugar, seccion, fecha: '2026-11-04' });

describe('Pasaporte', () => {
  it('sin visitas, explica cómo conseguir sellos', () => {
    render(<Pasaporte visitas={[]} onCambiar={() => {}} />);
    expect(screen.getByText(/Aún no tienes sellos/)).toBeTruthy();
    expect(screen.getByLabelText('Sevilla: sin sello')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Exportar/ })).toHaveProperty('disabled', true);
  });

  it('con visitas, sella la ciudad y cuenta las insignias', () => {
    render(<Pasaporte visitas={[visita('Catedral'), visita('Alcázar')]} onCambiar={() => {}} />);
    expect(screen.getByLabelText('Sevilla: 2 lugares')).toBeTruthy();
    expect(screen.getByLabelText('2 de 5')).toBeTruthy(); // Explorador
    expect(screen.queryByText(/Aún no tienes sellos/)).toBeNull();
  });

  it('importa una copia y la suma sin duplicar lugares', async () => {
    const onCambiar = vi.fn();
    const { container } = render(<Pasaporte visitas={[visita('Catedral')]} onCambiar={onCambiar} />);
    const copia = new File([copiaPasaporte([visita('Catedral'), visita('Bodega', 'Comer')])], 'pasaporte.json');
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [copia] } });
    await screen.findByText(/Pasaporte importado: 2 lugares/);
    const cambio = onCambiar.mock.calls[0]![0] as (a: Visita[]) => Visita[];
    expect(cambio([visita('Catedral')]).map((v) => v.lugar)).toEqual(['Catedral', 'Bodega']);
  });

  it('avisa si el archivo no es un pasaporte', async () => {
    const onCambiar = vi.fn();
    const { container } = render(<Pasaporte visitas={[]} onCambiar={onCambiar} />);
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [new File(['{"hola":1}'], 'x.json')] } });
    await screen.findByText(/no es una copia del pasaporte/);
    expect(onCambiar).not.toHaveBeenCalled();
  });
});

describe('MisViajes', () => {
  const guardado: Guardado = {
    viaje: {
      id: 'v1',
      perfil: { ...perfilInicial('Granada'), dias: 2 },
      itinerario: { modo: 'C1', hayInformacion: true, dias: [], fuentes: [] } as never,
      quitados: [],
    },
    guardado: '2026-11-04T10:00:00Z',
  };

  it('sin viajes, invita a planear uno', () => {
    render(<MisViajes guardados={[]} actual={null} onAbrir={() => {}} onGuardar={() => {}} onQuitar={() => {}} />);
    expect(screen.getByText(/Aún no tienes viajes/)).toBeTruthy();
  });

  it('abre un viaje guardado y lo borra tras confirmar', async () => {
    const onAbrir = vi.fn();
    const onQuitar = vi.fn();
    vi.stubGlobal('confirm', () => true);
    render(<MisViajes guardados={[guardado]} actual={null} onAbrir={onAbrir} onGuardar={() => {}} onQuitar={onQuitar} />);
    fireEvent.click(screen.getByRole('button', { name: /^Granada/ }));
    expect(onAbrir).toHaveBeenCalledWith(guardado.viaje);
    fireEvent.click(screen.getByRole('button', { name: 'Borrar el viaje a Granada' }));
    await waitFor(() => expect(onQuitar).toHaveBeenCalledWith('v1'));
  });

  it('enseña arriba el viaje abierto sin guardar y permite guardarlo', () => {
    const onGuardar = vi.fn();
    const abierto = { ...guardado.viaje, id: 'v2', perfil: { ...guardado.viaje.perfil, destino: 'Sevilla' } };
    render(<MisViajes guardados={[guardado]} actual={abierto} onAbrir={() => {}} onGuardar={onGuardar} onQuitar={() => {}} />);
    expect(screen.getByText(/Abierto ahora · sin guardar/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar el viaje a Sevilla' }));
    expect(onGuardar).toHaveBeenCalledWith(abierto);
  });

  it('si el viaje abierto ya está guardado, no lo repite: lo marca en la lista', () => {
    render(<MisViajes guardados={[guardado]} actual={guardado.viaje} onAbrir={() => {}} onGuardar={() => {}} onQuitar={() => {}} />);
    expect(screen.queryByText(/sin guardar/)).toBeNull();
    expect(screen.getByText('Abierto ahora')).toBeTruthy();
  });
});
