import type { ReactNode } from 'react';

/** Layout primitives for the Chinese legal articles: numbered sections with numbered clauses. */
export function LegalZhArticle({ children }: { children: ReactNode }) {
  return <article className="space-y-6 text-base leading-relaxed text-text-secondary">{children}</article>;
}

export function LegalZhSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

export function LegalZhClauses({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ol>
  );
}

export function LegalZhList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="ml-5 list-disc space-y-1.5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
