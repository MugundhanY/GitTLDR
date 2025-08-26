'use client';
import Link from "next/link";
import SmoothScrollProvider from "../SmoothScrollProvider";
import React, { useState } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export default function Terms() {

  const sections = [
  {
    title: "1. Acceptance of Terms",
    items: [
      {
        subtitle: "",
        text: "By accessing or using GitTLDR, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use the service.",
      },
    ],
  },
  {
    title: "2. Use of Service",
    items: [
      {
        subtitle: "",
        text: "You must be at least 13 years old to use GitTLDR.",
      },
      {
        subtitle: "",
        text: "You are responsible for maintaining the security of your account and password.",
      },
      {
        subtitle: "",
        text: "You may not use GitTLDR for any illegal or unauthorized purpose.",
      },
    ],
  },
  {
    title: "3. Intellectual Property",
    items: [
      {
        subtitle: "",
        text: "All content, features, and functionality on GitTLDR are the exclusive property of GitTLDR and its licensors. You may not copy, modify, or distribute any part of the service without permission.",
      },
    ],
  },
  {
    title: "4. User Content",
    items: [
      {
        subtitle: "",
        text: "You retain ownership of any content you submit, but grant GitTLDR a license to use, display, and process it as needed to provide the service.",
      },
      {
        subtitle: "",
        text: "You are responsible for the legality and appropriateness of your content.",
      },
    ],
  },
  {
    title: "5. Termination",
    items: [
      {
        subtitle: "",
        text: "We reserve the right to suspend or terminate your access to GitTLDR at any time, for any reason, without notice.",
      },
    ],
  },
  {
    title: "6. Disclaimer",
    items: [
      {
        subtitle: "",
        text: "GitTLDR is provided \"as is\" and without warranties of any kind. We do not guarantee the accuracy, reliability, or availability of the service.",
      },
    ],
  },
  {
    title: "7. Limitation of Liability",
    items: [
      {
        subtitle: "",
        text: "To the fullest extent permitted by law, GitTLDR shall not be liable for any damages arising from your use of the service.",
      },
    ],
  },
  {
    title: "8. Changes to Terms",
    items: [
      {
        subtitle: "",
        text: "We may update these Terms of Service from time to time. Continued use of GitTLDR constitutes acceptance of the new terms.",
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
        <h1 className="text-6xl font-medium text-white mb-5 tracking-tight">Terms & Conditions</h1>
        <p className="text-sm text-white/40">Effective Date: 26th of August, 2025</p>
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
                <p className={`text-white/60 mb-4 font-normal text-base leading-[1.3em]`}>{item.text}</p>
              </React.Fragment>
            ))}
          </div>
        ))}
        <div>
        <h3 className="font-medium text-white mb-3 tracking-tighter" style={{ fontSize: '28px'}}>9. Contact Us</h3>
        <p className={`text-white/60 mb-4 font-normal text-base leading-[1.3em]`}>If you have any questions about these Terms and Conditions, please contact us at:</p>
        <p className={`text-white/60 mb-4 font-normal text-base leading-[1.3em]`}>Email: support@gittldr.com</p>
        </div>
      </div>
    </section>
    <Footer />
  </div>
  </SmoothScrollProvider>
  );
}
