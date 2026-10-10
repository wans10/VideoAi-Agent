'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {StudioConversationTimeline} from '@/lib/studio/conversation-editing-contract';
import type {ConversationTimelineCommand} from '@/lib/studio/conversation-timeline-editing';
import {retainConversationMediaAccess} from '@/lib/studio/conversation-preview-access';
import type {WorkspaceProjectSettings,WorkspaceTimelineItem} from '../../../_shared/_lib/workspace-types';

export type ConversationTimelineView = {data: StudioConversationTimeline;settings: WorkspaceProjectSettings;items: WorkspaceTimelineItem[]};
export function useConversationTimeline(projectId: string,refreshKey: unknown) {
  const [view,setView] = useState<ConversationTimelineView | null>(null);
  const [legacy,setLegacy] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState<string | null>(null);
  const [editError,setEditError] = useState<string | null>(null);
  const active = useRef(true);
  const pending = useRef(false);
  const epoch = useRef(0);
  const renewing = useRef<Promise<void> | null>(null);
  const invalidate = useCallback(() => {epoch.current++;},[]);
  const path = `/api/studio/projects/${encodeURIComponent(projectId)}/conversation-timeline`;
  const refresh = useCallback(async (options?: {renewMediaId?: string}) => {
    const renewal = Boolean(options?.renewMediaId);
    if (!renewal && renewing.current) return false;
    while (renewing.current) await renewing.current;
    let finishRenewal: (() => void) | undefined;
    if (renewal) renewing.current = new Promise<void>(resolve => {finishRenewal = resolve;});
    const request = ++epoch.current;
    try {
      const response = await fetch(path+'?preview=1',{cache: 'no-store'});
      const result = await response.json();
      if (!active.current || request !== epoch.current) return false;
      if (result.error === 'STUDIO_CONNECTED_PROJECT_REQUIRED') {setLegacy(true);return false;}
      if (!response.ok || !result.ok) throw new Error(result.error ?? 'TIMELINE_UNAVAILABLE');
      setLegacy(false);setError(null);setView(previous => ({...result.result,items: retainConversationMediaAccess(previous?.items ?? [],result.result.items,Date.now(),options?.renewMediaId)}));
      return true;
    } catch (failure) {if (active.current && request === epoch.current) setError(failure instanceof Error ? failure.message : 'TIMELINE_UNAVAILABLE');return false;}
    finally {if (renewal) {renewing.current = null;finishRenewal?.();}}
  },[path]);
  useEffect(() => {active.current = true;return () => {active.current = false;invalidate();};},[refresh,invalidate]);
  // A parent conversation poll is a read trigger, not a hook lifetime change.
  // Its cleanup must not invalidate the forced renewal it is forbidden to replace.
  useEffect(() => {void refresh();},[refresh,refreshKey]);
  useEffect(() => {const timer = window.setInterval(() => {if (!pending.current && !document.hidden) void refresh();},20000);return () => window.clearInterval(timer);},[refresh]);
  const edit = useCallback(async (command: ConversationTimelineCommand['edit']) => {
    if (!view || pending.current) return;
    pending.current = true;setBusy(true);setEditError(null);epoch.current++;
    try {
      const response = await fetch(path,{method: 'POST',headers: {'content-type': 'application/json'},body: JSON.stringify({sequenceId: view.data.sequenceId,expectedRevision: view.data.revision,idempotencyKey: crypto.randomUUID(),edit: command})});
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? 'TIMELINE_UNAVAILABLE');
    } catch (failure) {if (active.current) setEditError(failure instanceof Error ? failure.message : 'TIMELINE_UNAVAILABLE');}
    finally {
      // An accepted command changes the revision. Its read must not be skipped
      // by an in-flight decoder renewal, or the next edit would use stale state.
      while (renewing.current) await renewing.current;
      if (active.current) await refresh();
      pending.current = false;
      if (active.current) setBusy(false);
    }
  },[path,refresh,view]);
  return {view,legacy,busy,error:editError??error,edit,refresh};
}
