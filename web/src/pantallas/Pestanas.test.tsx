// @vitest-environment jsdom
// RF-12: barra de navegación (Viajes · Nuevo viaje · Pasaporte).
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Pestanas } from './Pestanas';

afterEach(cleanup);

describe('Pestanas', () => {
  it('tiene tres destinos y marca el actual', () => {
    render(<Pestanas activa="pasaporte" guardados={0} />);
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual(['Viajes', 'Nuevo viaje', 'Pasaporte']);
    expect(screen.getByRole('link', { name: 'Pasaporte' }).getAttribute('aria-current')).toBe('page');
  });

  it('el itinerario abierto cuenta como «Viajes», con el número de guardados', () => {
    render(<Pestanas activa="itinerario" guardados={2} />);
    const viajes = screen.getByRole('link', { name: /Viajes/ });
    expect(viajes.getAttribute('aria-current')).toBe('page');
    expect(viajes.textContent).toContain('2');
  });
});
