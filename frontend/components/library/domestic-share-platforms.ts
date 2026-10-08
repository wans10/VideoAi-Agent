/** Creator portals, not upload APIs. Files and captions are attached by the user. */
export const DOMESTIC_SHARE_PLATFORMS = [
  { id: 'douyin', label: '抖音', url: 'https://creator.douyin.com/' },
  { id: 'xiaohongshu', label: '小红书', url: 'https://creator.xiaohongshu.com/' },
  { id: 'kuaishou', label: '快手', url: 'https://cp.kuaishou.com/' },
] as const;

export type DomesticShareTarget = (typeof DOMESTIC_SHARE_PLATFORMS)[number]['id'];
