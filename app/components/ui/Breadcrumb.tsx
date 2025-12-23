import Link from 'next/link';

interface BreadcrumbProps {
  items: string[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="mb-6">
      <ol className="flex items-center gap-2 text-sm font-[family-name:var(--font-inter)] text-[var(--color-gray)]">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            {index > 0 && <span>/</span>}
            {index === items.length - 1 ? (
              <span className="text-[var(--color-dark)] font-medium">{item}</span>
            ) : (
              <Link href="/" className="hover:text-[var(--color-secondary)] transition-colors">
                {item}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
