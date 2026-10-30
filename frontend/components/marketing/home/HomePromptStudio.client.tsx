'use client';

import { useCallback, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import Image from 'next/image';
import { buildWorkspacePromptHref, WORKSPACE_PROMPT_PARAM } from '@/lib/workspace-prompt-link';
import type { HomeShowcaseCopy } from './home-showcase-copy';
import styles from './home-showcase.module.css';

/** About 3,600 percent-encoded characters of Chinese text; longer prompts are written in the studio. */
const PROMPT_MAX_CHARS = 400;

export type HomeScenePoster = { id: string; posterUrl: string };

export function HomePromptStudio({ copy, scenePosters }: { copy: HomeShowcaseCopy; scenePosters: HomeScenePoster[] }) {
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const posterById = new Map(scenePosters.map((poster) => [poster.id, poster.posterUrl]));

  const fill = useCallback((text: string) => {
    setPrompt(text.slice(0, PROMPT_MAX_CHARS));
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(node.value.length, node.value.length);
    });
  }, []);

  const open = useCallback((value: string) => {
    window.location.assign(buildWorkspacePromptHref(value));
  }, []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    open(prompt);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    // Chinese and Japanese input methods use Enter to confirm a candidate; that must not submit.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    open(prompt);
  };

  return (
    <>
      <div className={styles.inner}>
        {/* Without JavaScript the form still opens the studio with the prompt (a plain GET). */}
        <form action="/app" method="get" className={styles.composer} onSubmit={onSubmit} data-home-prompt-form>
          <textarea
            ref={textareaRef}
            name={WORKSPACE_PROMPT_PARAM}
            className={styles.textarea}
            value={prompt}
            maxLength={PROMPT_MAX_CHARS}
            placeholder={copy.placeholder}
            aria-label={copy.placeholder}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={onKeyDown}
            rows={3}
          />
          <div className={styles.composerFoot}>
            <p className={styles.hint}>{copy.hint}</p>
            <button
              type="submit"
              className={styles.submit}
              data-analytics-event="hero_start_render_click"
              data-analytics-cta-name="start_render"
              data-analytics-cta-location="home_prompt_hero"
            >
              {copy.submit}
            </button>
          </div>
        </form>
        <div className={styles.chips} role="group" aria-label={copy.chipsLabel}>
          <span className={styles.chipsLabel}>{copy.chipsLabel}</span>
          {copy.chips.map((chip) => (
            <button key={chip.label} type="button" className={styles.chip} onClick={() => fill(chip.prompt)}>
              {chip.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.scenes}>
        <p className={styles.scenesLabel}>{copy.scenesLabel}</p>
        <div className={styles.sceneGrid}>
          {copy.scenes.map((scene, index) => {
            const posterUrl = posterById.get(scene.id);
            return (
              <button key={scene.id} type="button" className={styles.scene} onClick={() => fill(scene.prompt)}>
                {posterUrl ? (
                  <Image
                    src={posterUrl}
                    alt=""
                    fill
                    className={styles.sceneImage}
                    sizes="(max-width: 767px) 50vw, 25vw"
                    quality={52}
                    priority={index === 0}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    fetchPriority={index === 0 ? 'high' : undefined}
                  />
                ) : null}
                <span className={styles.sceneShade} aria-hidden="true" />
                <span className={styles.sceneText}>
                  <span className={styles.sceneLabel}>{scene.label}</span>
                  <span className={styles.sceneDescription}>{scene.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
