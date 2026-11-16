import assert from 'node:assert/strict';
import test from 'node:test';
import { bundleClientFlow, createClientFlowDom } from './helpers/client-flow-dom';
import zh from '../frontend/messages/zh.json';

const settings = zh.workspace.settings;
const boundaries = {
  '@/lib/authFetch': 'export const authFetch=(url,init)=>window.authFetchImpl(url,init);',
  '@/lib/supabase-auth-cleanup': 'export const clearStaleBrowserAuthState=async()=>{window.signedOut=(window.signedOut||0)+1};',
  '@/lib/i18n/I18nProvider': 'export const useI18n=()=>({locale:"zh",t:(key,fallback)=>window.messages[key]??fallback});',
};
const bundle = bundleClientFlow(`
import React,{act}from'react';import{createRoot}from'react-dom/client';
import{DataExportPanel}from'./app/(core)/settings/_components/DataExportPanel';
import{AccountDeletionPanel}from'./app/(core)/settings/_components/AccountDeletionPanel';
import{AccountDeletionScreen}from'./app/(core)/account/deletion/_components/AccountDeletionScreen';
const root=createRoot(document.getElementById('root'));window.IS_REACT_ACT_ENVIRONMENT=true;
window.fx={act,
 renderSettings:()=>root.render(<><DataExportPanel copy={window.settingsCopy.dataExport} locale="zh"/><AccountDeletionPanel copy={window.settingsCopy.deletion} locale="zh"/></>),
 renderScreen:()=>root.render(<AccountDeletionScreen/>),unmount:()=>root.unmount()};
`, boundaries);

type W = any;
async function settle(w: W, ok: () => boolean, label: string) {
  for (let i = 0; i < 80; i++) { if (ok()) return; await w.fx.act(async () => new Promise((r) => setTimeout(r, 5))); }
  assert.fail(label);
}
const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });
function setValue(w: W, input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new w.Event('input', { bubbles: true }));
}
const button = (w: W, text: string) => [...w.document.querySelectorAll('button')].find((b: any) => b.textContent.includes(text)) as HTMLButtonElement | undefined;

test('the privacy tab exports data with progress, link, expiry and explicit errors (zh)', async () => {
  const dom = createClientFlowDom('/settings?tab=privacy'), w = dom.window as W;
  w.messages = {}; w.settingsCopy = settings.privacy;
  const calls: string[] = [];
  let mode: 'ok' | 'limited' | 'storage' = 'ok';
  w.authFetchImpl = async (url: string) => {
    calls.push(url);
    if (mode === 'limited') return json(429, { ok: false, code: 'rate_limited', retryAfterSeconds: 540 });
    if (mode === 'storage') return json(503, { ok: false, code: 'storage_unavailable' });
    return json(200, { ok: true, url: 'https://files.example/x.json.gz?sig=1', expiresAt: '2026-12-03T10:00:00.000Z' });
  };
  w.eval(await bundle);
  try {
    await w.fx.act(async () => w.fx.renderSettings());
    assert.ok(w.document.body.textContent.includes('导出我的数据'));
    await w.fx.act(async () => button(w, '导出我的数据')!.click());
    await settle(w, () => Boolean(w.document.querySelector('a[download]')), 'download link');
    assert.equal(w.document.querySelector('a[download]').getAttribute('href'), 'https://files.example/x.json.gz?sig=1');
    assert.ok(w.document.querySelector('[role=status]').textContent.includes('链接有效期至'));
    assert.deepEqual(calls, ['/api/account/export']);
    mode = 'limited';
    await w.fx.act(async () => button(w, '导出我的数据')!.click());
    await settle(w, () => Boolean(w.document.querySelector('[role=alert]')), 'rate limit message');
    assert.ok(w.document.querySelector('[role=alert]').textContent.includes('9 分钟'));
    mode = 'storage';
    await w.fx.act(async () => button(w, '导出我的数据')!.click());
    await settle(w, () => w.document.querySelector('[role=alert]')?.textContent.includes('暂未开通'), 'storage unavailable message');
  } finally { await w.fx.act(async () => w.fx.unmount()); dom.window.close(); }
});

test('deletion needs the typed word and password, states the rules, and signs the browser out on success', async () => {
  const dom = createClientFlowDom('/settings?tab=privacy'), w = dom.window as W;
  w.messages = {}; w.settingsCopy = settings.privacy;
  const requests: any[] = [];
  let reply: any = json(409, { ok: false, code: 'wallet_not_empty' });
  w.authFetchImpl = async (url: string, init: any) => { requests.push({ url, body: JSON.parse(init.body) }); return reply; };
  w.eval(await bundle);
  try {
    await w.fx.act(async () => w.fx.renderSettings());
    await w.fx.act(async () => button(w, '注销账号…')!.click());
    const dialog = w.document.querySelector('[role=dialog]');
    assert.ok(dialog, 'confirmation dialog');
    for (const text of ['15 天', '余额大于 0', '无法恢复', '订单、支付与账户流水']) assert.ok(dialog.textContent.includes(text), text);
    const submit = button(w, '确认注销')!;
    assert.equal(submit.disabled, true, 'disabled until word and password are given');
    const [confirm, password] = dialog.querySelectorAll('input');
    await w.fx.act(async () => setValue(w, confirm, '注销'));
    assert.equal(button(w, '确认注销')!.disabled, true, 'password still required');
    await w.fx.act(async () => setValue(w, password, 'secret-password'));
    assert.equal(button(w, '确认注销')!.disabled, false);
    await w.fx.act(async () => button(w, '确认注销')!.click());
    await settle(w, () => Boolean(w.document.querySelector('[role=alert]')), 'wallet refusal shown');
    assert.ok(w.document.querySelector('[role=alert]').textContent.includes('账户余额大于 0'));
    assert.equal(w.signedOut, undefined, 'a refusal keeps the session');
    assert.deepEqual(requests, [{ url: '/api/account/delete', body: { confirm: '注销', password: 'secret-password' } }]);
    reply = json(200, { ok: true, purgeAt: '2026-12-17T00:00:00.000Z' });
    await w.fx.act(async () => button(w, '确认注销')!.click());
    await settle(w, () => w.document.querySelector('[role=dialog]')?.textContent.includes('注销申请已提交'), 'success state');
    assert.equal(w.signedOut, 1);
    assert.ok(w.document.querySelector('[role=dialog]').textContent.includes('2026年12月17日'));
    assert.equal(w.document.querySelector('input[type=password]'), null, 'password is dropped from the DOM');
  } finally { await w.fx.act(async () => w.fx.unmount()); dom.window.close(); }
});

test('the scheduled-deletion screen shows the purge date and offers cancel, export and sign-out', async () => {
  const dom = createClientFlowDom('/account/deletion'), w = dom.window as W;
  w.messages = { 'workspace.accountDeletion': zh.workspace.accountDeletion };
  const calls: string[] = [];
  w.authFetchImpl = async (url: string) => {
    calls.push(url);
    if (url.endsWith('/status')) return json(200, { ok: true, scheduled: true, purgeAt: '2026-12-17T00:00:00.000Z' });
    if (url.endsWith('/cancel')) return json(200, { ok: true, wasScheduled: true });
    return json(200, { ok: true });
  };
  w.fetch = async () => json(200, {});
  w.eval(await bundle);
  try {
    await w.fx.act(async () => w.fx.renderScreen());
    await settle(w, () => Boolean(w.document.querySelector('time')), 'status loaded');
    assert.ok(w.document.querySelector('h1').textContent.includes('账号已申请注销'));
    assert.ok(w.document.querySelector('time').textContent.includes('2026年12月17日'));
    for (const label of ['撤销注销', '先导出我的数据', '退出登录']) assert.ok(button(w, label), label);
    await w.fx.act(async () => button(w, '撤销注销')!.click());
    await settle(w, () => w.document.body.textContent.includes('已撤销注销'), 'cancelled');
    assert.deepEqual(calls, ['/api/account/delete/status', '/api/account/delete/cancel']);
  } finally { await w.fx.act(async () => w.fx.unmount()); dom.window.close(); }
});
