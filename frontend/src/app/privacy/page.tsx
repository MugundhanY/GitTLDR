'use client';
import Link from "next/link";
import SmoothScrollProvider from "../SmoothScrollProvider";
import React, { useState } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export default function Privacy() {
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  const sections = [
  {
    title: "Information We Collect",
    items: [
      {
        subtitle: "GitHub Account Data",
        text: "When you sign in with GitHub, we access your public profile, email, and repository information as permitted by your authorization.",
      },
      {
        subtitle: "Repository Data",
        text: "We may access repository metadata, file contents, commit history, and webhooks to provide summarization and insights.",
      },
      {
        subtitle: "Usage Data",
        text: "We collect anonymized usage statistics to improve our service.",
      },
    ],
  },
  {
    title: "How We Use Your Data",
    items: [
      {
        subtitle: "Repository Features",
        text: "To provide repository summarization, code insights, and team collaboration features.",
      },
      {
        subtitle: "Personalization",
        text: "To personalize your experience and improve GitTLDR.",
      },
      {
        subtitle: "Communication",
        text: "To communicate with you about updates or support.",
      },
    ],
  },
  {
    title: "Data Sharing & Third-Party Services",
    items: [
      {
        subtitle: "No Selling",
        text: "We do not sell your data to third parties.",
      },
      {
        subtitle: "Third-Party Services",
        text: "We may use third-party services for storage (e.g., Backblaze B2), analytics, and AI-powered summarization (e.g., OpenAI, Gemini, DeepSeek, Qdrant, Redis).",
      },
      {
        subtitle: "Minimum Necessary Data",
        text: "These services only receive the minimum data necessary to provide their functionality.",
      },
    ],
  },
  {
    title: "Security",
    items: [
      {
        subtitle: "",
        text: "We use industry-standard security measures to protect your data. However, no method of transmission or storage is 100% secure.",
      },
    ],
  },
  {
    title: "Your Choices",
    items: [
      {
        subtitle: "Disconnect GitHub",
        text: "You can disconnect your GitHub account at any time from your account settings.",
      },
      {
        subtitle: "Data Deletion",
        text: "You may request deletion of your data by contacting us.",
      },
    ],
  },
  {
    title: "Changes to This Policy",
    items: [
      {
        subtitle: "",
        text: "We may update this Privacy Policy from time to time. Continued use of GitTLDR constitutes acceptance of the new policy.",
      },
    ],
  },
];


  return ( 
    <SmoothScrollProvider>
  <div style={{ background: '#07090E', minHeight: '100vh', width: '100vw', scrollBehavior: 'smooth' }}>
    <Navbar />
    <section 
      className="relative w-full max-w-[850px] mx-auto rounded-2xl overflow-hidden flex flex-col items-start justify-start py-[11.5rem] px-6 md:px-12 shadow-lg"
      style={{ minHeight: 500,}}
      id="privacy-policy"
    >
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-6xl font-medium text-white mb-5 tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-white/40">Last updated: 26th of August, 2025</p>
      </div>

      {/* Content Sections */}
      <div className="space-y-12 w-full">
        {sections.map((section, idx) => (
          <div key={idx}>
            <h3 className="font-medium text-white mb-3 tracking-tighter" style={{ fontSize: '28px'}}>{section.title}</h3>
            {section.items.map((item, jdx) => (
              <React.Fragment key={jdx}>
                {item.subtitle && (
                  <h4 className="text-base tracking-normal font-normal text-white mb-4">{item.subtitle}</h4>
                )}
                <p className={`text-white/60 ${item.subtitle ? ' mb-4' : ''} font-normal text-base leading-[1.3em]`}>{item.text}</p>
              </React.Fragment>
            ))}
          </div>
        ))}
        <div>
        <h3 className="font-medium text-white mb-3 tracking-tighter" style={{ fontSize: '28px'}}>Contact Us</h3>
        <p className={`text-white/60 mb-4 font-normal text-base leading-[1.3em]`}>If you have questions about this Privacy Policy or your data, please contact us.</p>
        <p className={`text-white/60 mb-4 font-normal text-base leading-[1.3em]`}>Email: support@gittldr.com</p>
        </div>
      </div>
    </section>
    <Footer />
  </div>
  </SmoothScrollProvider>
  );
}
