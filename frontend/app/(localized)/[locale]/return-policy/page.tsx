import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { buildSeoMetadata } from '@/lib/seo/metadata';
import { ReturnPolicyZh } from './_components/ReturnPolicyZh';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'zh') permanentRedirect('/return-policy');
  return buildSeoMetadata({
    locale: 'zh',
    title: '退款与退换政策 | Keyvo',
    description: '了解 Keyvo 数字化 AI 视频生成服务和钱包额度的退款规则、生成失败处理、未使用余额审核及消费者权利。',
    englishPath: '/return-policy',
    availableLocales: ['en', 'zh'],
    ogType: 'article',
    imageAlt: 'Keyvo 退款与退换政策',
    titleBranding: 'none',
  });
}

export default async function ReturnPolicyPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== 'zh') permanentRedirect('/return-policy');
  return <ReturnPolicyZh />;
}
