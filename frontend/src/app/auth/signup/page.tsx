import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Sign Up - GitTLDR',
  description: 'Create a new GitTLDR account',
};

export default function SignupPage() {
  // Server-side redirect to the unified auth page
  redirect('/auth');
}
