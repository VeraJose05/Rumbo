// @vitest-environment jsdom
// RF-12: tests de componentes de los pasos del recorrido: se pulsa como un usuario y se comprueba
// el perfil que llega al padre.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { perfilInicial } from '../../viaje/perfil';
import { PasoBillete } from './PasoBillete';
import { PasoDestino } from './PasoDestino';
import { PasoEstilo } from './PasoEstilo';
import { PasoGustos } from './PasoGustos';

afterEach(cleanup);

describe('PasoDestino', () => {
  it('elegir una postal cambia el destino', () => {
    const onCambiar = vi.fn();
    render(<PasoDestino perfil={perfilInicial()} onCambiar={onCambiar} />);
    fireEvent.click(screen.getByRole('radio', { name: /Valencia/ }));
    expect(onCambiar).toHaveBeenCalledWith(expect.objectContaining({ destino: 'Valencia' }));
  });

  it('el botón + añade un día y el − no deja bajar de 1', () => {
    const onCambiar = vi.fn();
    const { rerender } = render(<PasoDestino perfil={perfilInicial('Sevilla')} onCambiar={onCambiar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Un día más' }));
    expect(onCambiar).toHaveBeenLastCalledWith(expect.objectContaining({ dias: 4 }));
    rerender(<PasoDestino perfil={{ ...perfilInicial('Sevilla'), dias: 1 }} onCambiar={onCambiar} />);
    expect((screen.getByRole('button', { name: 'Un día menos' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('PasoGustos', () => {
  it('«Me va» añade la carta de arriba (Monumentos) a los gustos', () => {
    vi.useFakeTimers();
    const onCambiar = vi.fn();
    render(<PasoGustos perfil={perfilInicial('Sevilla')} onCambiar={onCambiar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Me va' }));
    vi.advanceTimersByTime(300); // lo que tarda la carta en salir volando
    expect(onCambiar).toHaveBeenCalledWith(expect.objectContaining({ intereses: ['monumentos'] }));
    vi.useRealTimers();
  });

  it('las pegatinas elegidas se pueden quitar', () => {
    const onCambiar = vi.fn();
    render(<PasoGustos perfil={{ ...perfilInicial('Sevilla'), intereses: ['museos', 'playa'] }} onCambiar={onCambiar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Museos' }));
    expect(onCambiar).toHaveBeenCalledWith(expect.objectContaining({ intereses: ['playa'] }));
  });
});

describe('PasoEstilo', () => {
  it('elegir compañía y presupuesto cambia el perfil', () => {
    const onCambiar = vi.fn();
    render(<PasoEstilo perfil={perfilInicial('Sevilla')} onCambiar={onCambiar} />);
    fireEvent.click(screen.getByRole('radio', { name: /En familia/ }));
    expect(onCambiar).toHaveBeenLastCalledWith(expect.objectContaining({ compania: 'familia' }));
    fireEvent.click(screen.getByRole('radio', { name: /Alto/ }));
    expect(onCambiar).toHaveBeenLastCalledWith(expect.objectContaining({ presupuesto: 'alto' }));
  });

  it('el deslizador de ritmo va de tortuga a liebre y cambia los planes al día', () => {
    const onCambiar = vi.fn();
    const { rerender } = render(<PasoEstilo perfil={perfilInicial('Sevilla')} onCambiar={onCambiar} />);
    fireEvent.change(screen.getByRole('slider', { name: 'Ritmo' }), { target: { value: '2' } });
    expect(onCambiar).toHaveBeenLastCalledWith(expect.objectContaining({ ritmo: 'intenso' }));
    rerender(<PasoEstilo perfil={{ ...perfilInicial('Sevilla'), ritmo: 'intenso' }} onCambiar={onCambiar} />);
    expect(screen.getByText('4 planes')).toBeTruthy();
  });
});

describe('PasoBillete', () => {
  const perfil = { ...perfilInicial('Sevilla'), intereses: ['museos' as const], compania: 'pareja' as const };

  it('resume el viaje y deja cambiar cada dato', () => {
    render(<PasoBillete perfil={perfil} onSellar={() => {}} />);
    expect(screen.getByText('Sevilla')).toBeTruthy();
    expect(screen.getByText('En pareja')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Cambiar gustos' }).getAttribute('href')).toBe('#/viaje/gustos');
  });

  it('al sellar espera a la animación del sello y no deja sellar dos veces', () => {
    vi.useFakeTimers();
    const onSellar = vi.fn();
    render(<PasoBillete perfil={perfil} onSellar={onSellar} />);
    const boton = screen.getByRole('button', { name: /Sellar/ });
    fireEvent.click(boton);
    fireEvent.click(boton);
    expect(onSellar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(onSellar).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
