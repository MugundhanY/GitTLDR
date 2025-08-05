import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy - GitTLDR',
  description: 'Learn how GitTLDR handles your data, GitHub account, and privacy.'
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-emerald-100 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950 flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/40 p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-700 via-purple-700 to-emerald-600 bg-clip-text text-transparent mb-6 text-center">Privacy Policy</h1>
        <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
          <p>Your privacy is important to us. This Privacy Policy explains how <b>GitTLDR</b> collects, uses, and protects your information, including your GitHub account data.</p>

          <h2>1. Information We Collect</h2>
          <ul>
            <li><b>GitHub Account Data:</b> When you sign in with GitHub, we access your public profile, email, and repository information as permitted by your authorization.</li>
            <li><b>Repository Data:</b> We may access repository metadata, file contents, commit history, and webhooks to provide summarization and insights.</li>
            <li><b>Usage Data:</b> We collect anonymized usage statistics to improve our service.</li>
          </ul>

          <h2>2. How We Use Your Data</h2>
          <ul>
            <li>To provide repository summarization, code insights, and team collaboration features.</li>
            <li>To personalize your experience and improve GitTLDR.</li>
            <li>To communicate with you about updates or support.</li>
          </ul>

          <h2>3. Data Sharing & Third-Party Services</h2>
          <ul>
            <li>We do <b>not</b> sell your data to third parties.</li>
            <li>We may use third-party services for storage (e.g., Backblaze B2), analytics, and AI-powered summarization (e.g., OpenAI, Gemini, DeepSeek, Qdrant, Redis).</li>
            <li>These services only receive the minimum data necessary to provide their functionality.</li>
          </ul>

          <h2>4. Security</h2>
          <p>We use industry-standard security measures to protect your data. However, no method of transmission or storage is 100% secure.</p>

          <h2>5. Your Choices</h2>
          <ul>
            <li>You can disconnect your GitHub account at any time from your account settings.</li>
            <li>You may request deletion of your data by contacting us.</li>
          </ul>

          <h2>6. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. Continued use of GitTLDR constitutes acceptance of the new policy.</p>

          <h2>7. Contact</h2>
          <p>If you have questions about this Privacy Policy or your data, please <Link href="/support">contact us</Link>.</p>
        </div>
        <div className="mt-8 text-center">
          <Link href="/auth" className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
