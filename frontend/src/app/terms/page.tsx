import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service - GitTLDR',
  description: 'Read the terms and conditions for using GitTLDR.'
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-emerald-100 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950 flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/40 p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-700 via-purple-700 to-emerald-600 bg-clip-text text-transparent mb-6 text-center">Terms of Service</h1>
        <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
          <p>Welcome to <b>GitTLDR</b>! By using our platform, you agree to the following terms and conditions. Please read them carefully.</p>

          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using GitTLDR, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use the service.</p>

          <h2>2. Use of Service</h2>
          <ul>
            <li>You must be at least 13 years old to use GitTLDR.</li>
            <li>You are responsible for maintaining the security of your account and password.</li>
            <li>You may not use GitTLDR for any illegal or unauthorized purpose.</li>
          </ul>

          <h2>3. Intellectual Property</h2>
          <p>All content, features, and functionality on GitTLDR are the exclusive property of GitTLDR and its licensors. You may not copy, modify, or distribute any part of the service without permission.</p>

          <h2>4. User Content</h2>
          <ul>
            <li>You retain ownership of any content you submit, but grant GitTLDR a license to use, display, and process it as needed to provide the service.</li>
            <li>You are responsible for the legality and appropriateness of your content.</li>
          </ul>

          <h2>5. Termination</h2>
          <p>We reserve the right to suspend or terminate your access to GitTLDR at any time, for any reason, without notice.</p>

          <h2>6. Disclaimer</h2>
          <p>GitTLDR is provided "as is" and without warranties of any kind. We do not guarantee the accuracy, reliability, or availability of the service.</p>

          <h2>7. Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, GitTLDR shall not be liable for any damages arising from your use of the service.</p>

          <h2>8. Changes to Terms</h2>
          <p>We may update these Terms of Service from time to time. Continued use of GitTLDR constitutes acceptance of the new terms.</p>

          <h2>9. Contact</h2>
          <p>If you have any questions about these Terms, please <Link href="/support">contact us</Link>.</p>
        </div>
        <div className="mt-8 text-center">
          <Link href="/auth" className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
