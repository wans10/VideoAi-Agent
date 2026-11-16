import type { Metadata } from 'next';
import { AccountDeletionScreen } from './_components/AccountDeletionScreen';

export const metadata: Metadata = {
  title: '账号已申请注销',
  robots: { index: false, follow: false },
};

export default function AccountDeletionPage() {
  return <AccountDeletionScreen />;
}
