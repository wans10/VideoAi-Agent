import type { HomeShowcaseCopy } from './home-showcase-copy';
import { HomePromptStudio, type HomeScenePoster } from './HomePromptStudio.client';
import styles from './home-showcase.module.css';

/** The headline and subtitle are server-rendered text; only the prompt form and scene cards are a client island. */
export function HomePromptHero({ copy, scenePosters }: { copy: HomeShowcaseCopy; scenePosters: HomeScenePoster[] }) {
  return (
    <section className={styles.hero} aria-labelledby="home-title" data-home-prompt-hero>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 id="home-title" className={styles.title}>
          {copy.title.split('\n').map((line, index) => <span key={`${index}-${line}`}>{line}</span>)}
        </h1>
        <p className={styles.subtitle}>{copy.subtitle}</p>
      </div>
      <HomePromptStudio copy={copy} scenePosters={scenePosters} />
    </section>
  );
}
