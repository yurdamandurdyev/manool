import { useEffect, useRef, type ReactNode } from 'react';

type DockProps = {
  items: { icon?: ReactNode; label: string; href?: string }[];
  magnification?: number;
  distance?: number;
  springOptions?: { stiffness?: number; damping?: number };
  activePath?: string;
};

/** Text-friendly Dock with a distance-based spring and native navigation links. */
export function Dock({ items, magnification = 1.22, distance = 120, springOptions, activePath }: DockProps) {
  const root = useRef<HTMLElement>(null);
  const stiffness = springOptions?.stiffness ?? 400;
  const damping = springOptions?.damping ?? 25;
  useEffect(() => {
    const nav = root.current!;
    const anchors = Array.from(nav.querySelectorAll<HTMLAnchorElement>('.dock-link'));
    const states = anchors.map(() => ({ value: 1, velocity: 0, target: 1 }));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const fine = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 801px)');
    let frame = 0, previous = 0;
    const animate = (time: number) => {
      const dt = Math.min((time - previous) / 1000 || 1 / 60, 1 / 60); previous = time;
      let running = false;
      states.forEach((state, i) => {
        state.velocity += (stiffness * (state.target - state.value) - damping * state.velocity) * dt;
        state.value += state.velocity * dt;
        if (Math.abs(state.value - state.target) < .001 && Math.abs(state.velocity) < .001) { state.value = state.target; state.velocity = 0; }
        else running = true;
        anchors[i].style.transform = `translateY(${-(state.value - 1) * 25}px) scale(${state.value})`;
      });
      frame = running ? requestAnimationFrame(animate) : 0;
    };
    const start = () => { if (!frame) { previous = 0; frame = requestAnimationFrame(animate); } };
    const reset = () => { states.forEach(state => state.target = 1); start(); };
    const move = (event: PointerEvent) => {
      if (!fine.matches || reduced.matches || event.pointerType === 'touch') return;
      anchors.forEach((anchor, i) => {
        // Measure stationary slots to prevent hover feedback as the button scales.
        const rect = anchor.parentElement!.getBoundingClientRect();
        const proximity = Math.max(0, 1 - Math.abs(event.clientX - rect.left - rect.width / 2) / Math.max(1, distance));
        states[i].target = 1 + (Math.max(1, magnification) - 1) * proximity * proximity;
      });
      start();
    };
    nav.addEventListener('pointermove', move); nav.addEventListener('pointerleave', reset);
    reduced.addEventListener('change', reset); fine.addEventListener('change', reset);
    return () => { cancelAnimationFrame(frame); nav.removeEventListener('pointermove', move); nav.removeEventListener('pointerleave', reset); reduced.removeEventListener('change', reset); fine.removeEventListener('change', reset); };
  }, [magnification, distance, stiffness, damping]);
  return <nav className="manool-dock" aria-label="Основная навигация" ref={root}>{items.map((item, i) => <div className="dock-slot" key={item.href ?? item.label}><a className="dock-link" href={item.href ?? '#'} aria-current={item.href === activePath ? 'page' : undefined}><span className="dock-index" aria-hidden="true">{item.icon ?? `0${i + 1}`}</span><span>{item.label}</span><span className="dock-arrow" aria-hidden="true">↗</span></a></div>)}</nav>;
}
