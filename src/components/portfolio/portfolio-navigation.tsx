/** Lien de navigation avec soulignement animé + état actif (scrollspy). */
export function NavLink({
  href,
  label,
  active,
  className = "",
}: {
  href: string;
  label: string;
  active: boolean;
  className?: string;
}) {
  return (
    <a
      href={href}
      aria-current={active ? "true" : undefined}
      className={`relative inline-flex min-h-11 items-center px-2 transition-colors after:absolute after:bottom-1.5 after:left-2 after:h-px after:w-[calc(100%-1rem)] after:origin-left after:bg-primary after:transition-transform after:duration-300 hover:text-foreground hover:after:scale-x-100 ${
        active ? "text-foreground after:scale-x-100" : "after:scale-x-0"
      } ${className}`}
    >
      {label}
    </a>
  );
}

/** Static SSR-friendly count: meaningful even with JavaScript disabled. */
export function Counter({ to, suffix }: { to: number; suffix?: string }) {
  return (
    <span>
      {to}
      {suffix ?? ""}
    </span>
  );
}
