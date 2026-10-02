import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/locales';
import { getScreeningRoomCopy } from '../_lib/screening-room-copy';
import styles from './ScreeningRoom.module.css';

export function ScreeningRoomNotes({ locale }: { locale: AppLocale }) {
  const c = getScreeningRoomCopy(locale);
  const destinations = ['/tools/angle', '/app/tools/storyboard', '/tools/character-builder'];
  return <section className={styles.notes}><header><h2>{c.notes}</h2><p>{c.intro}</p></header>
    <ol>{c.rows.map(([title, body, action], index) => <li key={title}><span aria-hidden="true">0{index + 1}</span><h3>{title}</h3><p>{body}</p><Link href={destinations[index]} prefetch={false}>{action} ↗</Link></li>)}</ol>
  </section>;
}
