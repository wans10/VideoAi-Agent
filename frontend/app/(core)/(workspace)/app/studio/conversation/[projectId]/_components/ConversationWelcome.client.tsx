'use client';
import { conversationCopy } from "@/lib/studio/conversation-copy";

import {ArrowUpRight} from 'lucide-react';
import type {ConversationLocale} from '@/lib/studio/conversation-quote-presentation';
import styles from '../image-conversation.module.css';

export function ConversationWelcome({locale, onDraft,hasDraft=false}: {locale: ConversationLocale; onDraft: (value: string) => void;hasDraft?:boolean}) {
  const t = (en: string, fr: string, zh?: string) => conversationCopy(locale, en, fr, en, zh);
  return <div className={styles.welcome} data-drafting={hasDraft}>
    <h2>{t('What would you like to','Qu’avez-vous envie de','你想')} <span>{t('do?','faire ?','做什么？')}</span></h2>
    <p>{t('Just describe your idea. Milo handles the prompts and tools.','Décrivez simplement votre idée. Milo s’occupe des prompts et des outils.','直接描述你的想法，Milo 会处理提示词和工具。')}</p>
    {!hasDraft&&<div className={styles.starters} aria-label={t('Ways to start','Pour commencer')}>
      <button onClick={() => onDraft(t('I’d like to create a video of ','J’aimerais créer une vidéo de ','我想生成一段视频，内容是 '))}>
        <span>{t('Create a video','Créer une vidéo','生成视频')}</span><ArrowUpRight size={12} aria-hidden="true"/>
      </button>
      <button onClick={() => onDraft(t('Help me develop an idea for ','Aide-moi à développer une idée pour '))}>
        <span>{t('Develop an idea','Développer une idée','打磨一个创意')}</span><ArrowUpRight size={12} aria-hidden="true"/>
      </button>
      <button onClick={() => onDraft(t('I’d like to extend a clip. ','J’aimerais prolonger un clip. ','我想延长一个片段。'))}>
        <span>{t('Extend a clip','Prolonger un clip','延长一个片段')}</span><ArrowUpRight size={12} aria-hidden="true"/>
      </button>
      <button onClick={() => onDraft(t('I’d like to edit an image. ','J’aimerais modifier une image. ','我想编辑一张图片。'))}>
        <span>{t('Edit an image','Modifier une image','编辑图片')}</span><ArrowUpRight size={12} aria-hidden="true"/>
      </button>
    </div>}
  </div>;
}
