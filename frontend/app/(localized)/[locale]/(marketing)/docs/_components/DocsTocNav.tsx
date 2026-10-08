import type { ReactNode } from 'react';
import DocsTocActive from '../components/DocsTocActive';
import type { DocsTocLink } from '../_lib/docs-index-data';

type DocsTocNavProps = { children: ReactNode; title?: string; tocLinks: DocsTocLink[] };

export function DocsTocNav({ children, title, tocLinks }: DocsTocNavProps) {
  return <div className="studio-docs-reader">
    <nav className="studio-docs-index" aria-label={title ?? 'On this page'}>
      <p>{title ?? 'On this page'}</p>
      <ol>{tocLinks.map((link, index) => <li key={link.id}>
        <a href={`#${link.id}`}><span aria-hidden>{String(index + 1).padStart(2, '0')}</span>{link.label}</a>
      </li>)}</ol>
    </nav>
    <div className="stack-gap-lg"><DocsTocActive />{children}</div>
  </div>;
}
