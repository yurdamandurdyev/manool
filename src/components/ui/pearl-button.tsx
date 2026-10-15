import React from 'react';

type PearlButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { label?: string };
export const PearlButton: React.FC<PearlButtonProps> = ({ label = 'Pearl Button', className = '', ...props }) => (
  <button className={`pearl-button ${className}`} {...props}>
    <span className="wrap"><span className="pearl-label"><span aria-hidden="true" className="spark">✧</span><span aria-hidden="true" className="spark-hover">✦</span>{label}</span></span>
  </button>
);

// Navigation retains native link behavior: keyboard, new tabs and no JavaScript required.
export function PearlLink({ label, href, active = false }: { label: string; href: string; active?: boolean }) {
  return <a className={`pearl-button${active ? ' is-active' : ''}`} href={href} aria-current={active ? 'page' : undefined}><span className="wrap"><span className="pearl-label"><span aria-hidden="true" className="spark">✧</span><span aria-hidden="true" className="spark-hover">✦</span>{label}</span></span></a>;
}
