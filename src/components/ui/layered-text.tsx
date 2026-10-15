'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { gsap } from 'gsap';

interface LayeredTextProps {
  lines?: Array<{ top: string; bottom: string }>;
  fontSize?: string;
  fontSizeMd?: string;
  lineHeight?: number;
  lineHeightMd?: number;
  className?: string;
}
const defaultLines = [
  { top: '\u00A0', bottom: 'ИДЕЯ' },
  { top: 'ИДЕЯ', bottom: 'ФОРМА' },
  { top: 'ФОРМА', bottom: 'СМЫСЛ' },
  { top: 'СМЫСЛ', bottom: 'СТИЛЬ' },
  { top: 'СТИЛЬ', bottom: 'ДИЗАЙН' },
  { top: 'ДИЗАЙН', bottom: 'MANOOL' },
  { top: 'MANOOL', bottom: '\u00A0' },
];

export function LayeredText({ lines = defaultLines, fontSize = '72px', fontSizeMd = '36px', lineHeight = 60, lineHeightMd = 35, className = '' }: LayeredTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const media = gsap.matchMedia();
    media.add({ desktop: '(min-width: 801px)', mobile: '(max-width: 800px)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
      if (context.conditions?.reduced) return;
      const timeline = gsap.timeline({ paused: true }).to(container.querySelectorAll('p'), {
        y: -(context.conditions?.desktop ? lineHeight : lineHeightMd), duration: .8, ease: 'power2.out', stagger: .08,
      });
      const play = () => { timeline.play(); };
      const reverse = () => { timeline.reverse(); };
      const touch = (event: PointerEvent) => { if (event.pointerType === 'touch') timeline.reversed() || timeline.progress() === 0 ? timeline.play() : timeline.reverse(); };
      container.addEventListener('mouseenter', play);
      container.addEventListener('mouseleave', reverse);
      container.addEventListener('focus', play);
      container.addEventListener('blur', reverse);
      container.addEventListener('pointerdown', touch);
      return () => {
        container.removeEventListener('mouseenter', play); container.removeEventListener('mouseleave', reverse);
        container.removeEventListener('focus', play); container.removeEventListener('blur', reverse);
        container.removeEventListener('pointerdown', touch); timeline.kill();
      };
    });
    return () => media.revert();
  }, [lines, lineHeight, lineHeightMd]);
  const label = Array.from(new Set(lines.flatMap(line => [line.top, line.bottom]).filter(text => text.trim()))).join(', ');
  return <div ref={containerRef} className={`layered-text ${className}`} tabIndex={0} role="img" aria-label={label}
    style={{ '--layer-font': fontSize, '--layer-font-mobile': fontSizeMd, '--layer-height': `${lineHeight}px`, '--layer-height-mobile': `${lineHeightMd}px` } as CSSProperties}>
    <ul aria-hidden="true">{lines.map((line, index) => <li key={index} style={{ '--layer-offset': `${(index - Math.floor(lines.length / 2)) * 35}px`, '--layer-offset-mobile': `${(index - Math.floor(lines.length / 2)) * 20}px`, '--layer-skew': index % 2 === 0 ? '60deg, -30deg' : '0deg, -30deg', '--layer-scale': index % 2 === 0 ? .66667 : 1.33333 } as CSSProperties}><p>{line.top}</p><p>{line.bottom}</p></li>)}</ul>
  </div>;
}
