// @vitest-environment jsdom
// RF-12: barra de pestañas.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Pestanas } from './Pestanas';

afterEach(cleanup);

describe('Pestanas', () => {
  it('marca la pantalla actual y cuenta los viajes guardados', () => {
    render(<Pestanas activa="pasaporte" hayViaje guardados={2} />);
    expect(screen.getByRole('link', { name: 'Pasaporte' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Inicio' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('link', { name: /Mis viajes/ }).textContent).toContain('2');
  });

  it('sin viaje planificado no enseña «Mi viaje»', () => {
    render(<Pestanas activa="portada" hayViaje={false} guardados={0} />);
    expect(screen.queryByRole('link', { name: 'Mi viaje' })).toBeNull();
  });
});
