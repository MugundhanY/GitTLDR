import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Sign In - GitTLDR',
  description: 'Sign in to your GitTLDR account',
};

export default function SigninPage() {
  // Server-side redirect to the unified auth page
  redirect('/auth');
}
