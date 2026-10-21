/** Logo du site : chevrons de code `</>` — identité "développeur web". */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="11,7 3,16 11,25" />
        <polyline points="21,7 29,16 21,25" />
        <line x1="18" y1="5" x2="14" y2="27" />
      </g>
    </svg>
  );
}
