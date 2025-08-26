'use client';
import React, { useState } from "react";

const faqs = [
  {
    question: "What is GitTLDR and how does it work?",
    answer:
      "GitTLDR is an AI-powered repository intelligence platform that transforms how development teams understand and collaborate on code. It analyzes your repositories, generates intelligent summaries, transcribes meetings, and provides real-time team coordination to make repository management actually efficient.",
  },
  {
    question: "Can I use GitTLDR for free?",
    answer:
      "Yes! GitTLDR offers a free plan that includes up to 3 repositories, basic AI-powered commit summaries, repository activity dashboard, and GitHub integration. Perfect for individual developers and small projects.",
  },
  {
    question: "What makes GitTLDR's AI different?",
    answer:
      "GitTLDR uses advanced AI models (Gemini and DeepSeek) combined with vector embeddings to provide context-aware repository analysis. Instead of keyword search, you get semantic understanding of code relationships, intelligent summaries, and answers that actually understand your codebase.",
  },
  {
    question: "How does the meeting transcription feature work?",
    answer:
      "GitTLDR automatically transcribes your development meetings and intelligently links decisions and discussions back to specific code changes or repository events. This ensures team knowledge doesn't get lost and provides context for future code reviews.",
  },
  {
    question: "Is my code and repository data secure?",
    answer:
      "Absolutely. GitTLDR uses industry-standard security practices including data encryption, secure API connections, and follows GitHub's security protocols. Your code is processed securely and we never store sensitive repository content longer than necessary for analysis.",
  },
];

export default function FAQ() {
  const [openIdxs, setOpenIdxs] = useState<number[]>([]);
  const toggleIdx = (idx: number) => {
    setOpenIdxs((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };
  return (
    <section className="w-full flex flex-col items-center justify-center md:pt-20 pt-20 pb-16 px-4" style={{ position: 'relative' }} id="faq">
      <div className="w-full flex flex-col lg:flex-row lg:items-start lg:justify-center md:flex-row md:items-start md:justify-center max-w-7xl mx-auto">
        {/* Left: FAQ Header */}
        <div className="lg:w-1/2 md:w-1/2 flex flex-col justify-center lg:justify-start lg:items-start md:justify-start md:items-start items-center text-center md:text-left lg:text-left mb-8 lg:mb-0 mx-auto px-4 md:mr-auto md:ml-0 lg:mr-auto lg:ml-0">
          {/* Badge */}
          <div className="flex justify-center md:lg:justify-start mb-6">
            <div 
              className="px-3 py-2"
              style={{
                backdropFilter: 'blur(15px)',
                backgroundColor: 'rgba(51, 153, 255, 0.08)',
                borderRadius: '25px',
                border: '1px solid rgba(51, 153, 255, 0.18)',
              }}
            >
              <p
                className="text-sm font-inter text-center font-semibold"
                style={{
                  backgroundImage: 'linear-gradient(90deg, #3399FF 0%, #66CCFF 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: 'transparent',
                  fontWeight: 400,
                }}
              >
                FAQ
              </p>
            </div>
          </div>
          {/* Headline */}
          <h1
            className="text-white font-inter font-medium lg:text-5xl text-3xl md:text-4xl mb-4 max-w-lg lg:max-w-md md:max-w-xs"
            style={{ lineHeight: 1.1 }}
          >
            {['Got', 'questions?', "We've", 'got', 'answers.'].map((word, index) => (
              <span 
                key={word} 
                className="inline-block mr-2" 
                style={{ letterSpacing: '-0.05em' }}
              >
                {word}
              </span>
            ))}
          </h1>
          {/* Subheadline */}
          <p className="text-white/60 font-inter font-normal text-base mb-12 max-w-xl lg:max-w-xl md:max-w-lg sm:mb-6">
            Find answers to common questions about GitTLDR&apos;s AI-powered repository intelligence platform.
          </p>
        </div>
        {/* Right: FAQ List */}
        <div className="lg:w-1/2 md:w-1/2 flex flex-col gap-4 w-full sm:max-w-full max-w-2xl mx-auto px-4 md:ml-auto md:mr-0 lg:ml-auto lg:mr-0">
          {faqs.map((faq, idx) => (
            <button
              key={idx}
              tabIndex={0}
              type="button"
              onClick={() => toggleIdx(idx)}
              className="w-full text-left backdrop-blur-[5px] rounded-[17px] border border-white/10 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.2),inset_0_-1px_2px_0_rgba(255,255,255,0.05)] bg-[radial-gradient(67.8%_100%_at_50%_100%,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.02)_100%)] p-6 focus:outline-none transition-transform duration-300 hover:scale-[1.025]"
              style={{
                background: openIdxs.includes(idx) ? 'radial-gradient(67.8117% 100% at 50% 100%, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.02) 100%)' : 'radial-gradient(67.8117% 100% at 50% 100%, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.02) 100%)',
                boxShadow: `
      rgba(0, 255, 166, 0) 0px -40px 60px -40px inset,
      rgba(255, 255, 255, 0.2) 0px 1px 1px 0px inset,
      rgba(255, 255, 255, 0.05) 0px -1px 2px 0px inset
    `,
              }}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-white font-inter text-lg font-medium">
                  {faq.question}
                </h4>
                <span className="ml-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    width={24}
                    height={24}
                    style={{ color: "#fff", transform: openIdxs.includes(idx) ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </div>
              {openIdxs.includes(idx) && (
                <p className="text-white/60 font-inter text-base mt-4 transition-all duration-300 ease-in-out animate-fade-in">
                  {faq.answer}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
