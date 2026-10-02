import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function ModelNotFound() {
  const zh = (await getLocale()) === 'zh';
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-semibold text-text-primary sm:text-5xl">{zh ? '模型不可用' : 'Model unavailable'}</h1>
      <p className="text-sm text-text-secondary">{zh ? '当前模型列表中没有此模型。' : 'We couldn’t find that model in the current roster.'}</p>
      <Link href={{ pathname: '/models' }} className="text-sm font-semibold text-brand hover:text-brandHover">
        {zh ? '返回模型列表' : 'Back to models'}
      </Link>
    </div>
  );
}
