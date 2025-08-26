'use client';
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import Link from 'next/link';
import { useEffect, useState } from 'react';
import SmoothScrollProvider from '../SmoothScrollProvider';

export default function Contact() {
    
    const [isButtonHovered, setIsButtonHovered] = useState(false);
    const stats = [
    { value: '<50ms', label: 'Search Response Time' },
    { value: '10GB', label: 'Max Repository Size' },
    { value: '<5min', label: 'Analysis Time' },
    { value: '99.5%', label: 'Uptime Reliability' },
  ];

  useEffect(() => {
    // This code runs when the component is added to the page (mounts)
    // We are temporarily overriding the body's global style
    document.body.style.overflowX = 'visible';

    // This is the "cleanup" function
    return () => {
      // It runs when the component is removed from the page (unmounts)
      // It removes the inline style, restoring the original global style
      document.body.style.overflowX = ''; 
    };
  }, []);

  return (
    <SmoothScrollProvider>
      <div style={{ background: '#07090E', minHeight: '100vh', width: '100vw', scrollBehavior: 'smooth' }}>
        <Navbar />
        <section className="w-full flex flex-col items-center justify-center md:pt-44 pt-32 pb-16 px-4" style={{ position: 'relative' }}>

                {/* Content Wrapper */}
                <div className="relative z-10 w-full flex flex-col items-center">
                    {/* Badge */}
                    <div className="flex justify-center mb-6">
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
                        Contact
                    </p>
                </div>
            </div>

                    {/* Headline with word-by-word animation */}
                    <h1
                        className="text-center text-white font-inter font-medium lg:text-6xl text-4xl md:text-5xl mb-4 mx-auto max-w-4xl md:pl-24 md:pr-24 lg:pl-4 lg:pr-4"
                        style={{ lineHeight: 1.1 }}
                    >
                        {["Get", " in", "Touch", "with", "Us"].map((word, index) => (
                            <span 
                                key={word} 
                                className="inline-block mr-4" 
                                style={{ 
                                    letterSpacing: '-0.05em',
                                }}
                            >
                                {word}
                            </span>
                        ))}
                    </h1>

                    {/* Subheadline */}
                    <p className="text-center text-white/60 font-inter font-normal lg:text-xl md:text-lg lg:max-w-[38rem] md:max-w-xl sm:max-w-lg">
  <span className="inline-block">Have</span>{' '}
  <span className="inline-block">questions</span>{' '}
  <span className="inline-block">or</span>{' '}
  <span className="inline-block">need</span>{' '}
  <span className="inline-block">assistance?</span>{' '}
  <span className="inline-block">Our</span>{' '}
  <span className="inline-block">team</span>{' '}
  <span className="inline-block">is</span>{' '}
  <span className="inline-block">here</span>{' '}
  <span className="inline-block">to</span>{' '}
  <span className="inline-block">help.</span>{' '}
  <span className="inline-block">Contact</span>{' '}
  <span className="inline-block">us</span>{' '}
  <span className="inline-block">for</span>{' '}
  <span className="inline-block">demos,</span>{' '}
  <span className="inline-block">support,</span>{' '}
  <span className="inline-block">or</span>{' '}
  <span className="inline-block">any</span>{' '}
  <span className="inline-block">inquiries</span>{' '}
  <span className="inline-block">you</span>{' '}
  <span className="inline-block">may</span>{' '}
  <span className="inline-block">have.</span>
</p>


                </div>
  <div className="w-full flex flex-col lg:flex-row md:flex-row items-start justify-center md:max-w-4xl lg:max-w-[68rem] my-24 gap-6 lg:gap-14 md:gap-7 sm:max-w-lg">
    {/* Left: FAQ Header */}
  <div className="flex-1 flex flex-col w-full justify-center items-center md:items-start lg:items-start text-center md:text-left lg:text-left lg:sticky lg:top-48">
          {/* Headline */}
          <div className="bg-[#0c0e13] p-8 rounded-2xl w-full text-white space-y-6 mb-4" style={{
            boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 1px 0px inset, rgba(255, 255, 255, 0.05) 0px -1px 2px 0px inset',
          }}>
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          {/* Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6"
            style={{ verticalAlign: 'middle' }}
          >
            <path d="M 2 6 L 8.913 9.917 C 11.462 11.361 12.538 11.361 15.087 9.917 L 22 6" fill="transparent" strokeWidth="1.5" stroke="rgb(255, 255, 255)" strokeLinejoin="round"></path>
            <path d="M 2.016 13.476 C 2.081 16.541 2.114 18.074 3.245 19.209 C 4.376 20.345 5.95 20.384 9.099 20.463 C 11.039 20.513 12.961 20.513 14.901 20.463 C 18.05 20.384 19.624 20.345 20.755 19.209 C 21.886 18.074 21.919 16.541 21.985 13.476 C 22.005 12.49 22.005 11.51 21.985 10.524 C 21.919 7.459 21.886 5.926 20.755 4.791 C 19.624 3.655 18.05 3.616 14.901 3.537 C 12.967 3.488 11.033 3.488 9.099 3.537 C 5.95 3.616 4.376 3.655 3.245 4.791 C 2.114 5.926 2.081 7.459 2.015 10.524 C 1.994 11.508 1.994 12.492 2.015 13.476 Z" fill="transparent" strokeWidth="1.5" stroke="rgb(255, 255, 255)" strokeLinejoin="round"></path>
          </svg>
          {/* Title */}
          <p className="text-white text-xl font-normal" style={{marginBottom: 0}}>Contact Sales</p>
        </div>

        {/* Body Text */}
        <p className="text-white/60 text-base">
          Connect with us for custom solutions or product insights.
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {/* Action Item */}
        {[
          'Request a demo',
          'Find the right product for your business',
          'Onboarding assistance',
        ].map((text, index) => (
          <div key={index} className="flex items-start space-x-5 group transition-opacity">
            <div className="w-4 h-6 flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-white text-base font-normal">{text}</p>
          </div>
        ))}
      </div>
    </div>
    <div className="bg-[#0c0e13] p-8 rounded-2xl w-full text-white space-y-6" style={{
            boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 1px 0px inset, rgba(255, 255, 255, 0.05) 0px -1px 2px 0px inset',
          }}>
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          {/* Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6"
            style={{ verticalAlign: 'middle' }}
          >
            <path xmlns="http://www.w3.org/2000/svg" d="M 17 10.805 C 17 10.459 17 10.286 17.052 10.132 C 17.203 9.684 17.602 9.511 18.002 9.329 C 18.45 9.124 18.674 9.022 18.897 9.004 C 19.149 8.984 19.402 9.038 19.618 9.159 C 19.904 9.319 20.104 9.625 20.308 9.873 C 21.251 11.019 21.723 11.592 21.895 12.223 C 22.035 12.733 22.035 13.267 21.895 13.776 C 21.644 14.698 20.849 15.47 20.26 16.186 C 19.959 16.551 19.808 16.734 19.618 16.841 C 19.398 16.963 19.147 17.017 18.897 16.996 C 18.674 16.978 18.45 16.876 18.001 16.671 C 17.601 16.489 17.203 16.316 17.052 15.868 C 17 15.714 17 15.541 17 15.195 Z M 7 10.805 C 7 10.369 6.988 9.978 6.636 9.672 C 6.508 9.561 6.338 9.484 5.999 9.329 C 5.55 9.125 5.326 9.022 5.103 9.004 C 4.436 8.95 4.077 9.406 3.693 9.874 C 2.749 11.019 2.277 11.592 2.104 12.224 C 1.965 12.732 1.965 13.269 2.104 13.777 C 2.356 14.698 3.152 15.471 3.74 16.186 C 4.111 16.636 4.466 17.047 5.103 16.996 C 5.326 16.978 5.55 16.876 5.999 16.671 C 6.339 16.517 6.508 16.439 6.636 16.328 C 6.988 16.022 7 15.631 7 15.196 Z" fill="transparent" strokeWidth="1.51" stroke="rgb(255, 255, 255)" strokeMiterlimit="10"/>
            <path xmlns="http://www.w3.org/2000/svg" d="M 5 9 C 5 5.686 8.134 3 12 3 C 15.866 3 19 5.686 19 9" fill="transparent" strokeWidth="1.51" stroke="rgb(255, 255, 255)" strokeLinecap="square" strokeLinejoin="round"/>
            <path xmlns="http://www.w3.org/2000/svg" d="M 19 17 L 19 17.8 C 19 19.567 17.21 21 15 21 L 13 21" fill="transparent" strokeWidth="1.51" stroke="rgb(255, 255, 255)" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {/* Title */}
          <p className="text-white text-xl font-normal" style={{marginBottom: 0}}>Support</p>
        </div>

        {/* Body Text */}
        <p className="text-white/60 text-base mb-2">
          Need help with technical issues or products?
        </p>
      </div>
        <Link
                            href="mailto:support@gittldr.com"
                            className="px-4 flex w-fit py-3 rounded-xl font-medium text-right bg-[#14161a]  text-stone-400 hover:text-white shadow-lg font-inter"
                            style={{
                                boxShadow: "rgba(255,255,255,0.235) 0px 0.6px 3px -1.6px inset, rgba(255,255,255,0.192) 0px 2.2px 11.4px -3.3px inset",
                                lineHeight: '1em',
                                fontSize: '1rem',
                                fontWeight: 500,
                                opacity: 1,
                            }}
                        >
                            support@gittldr.com
                        </Link>
    </div>
    </div>
    {/* Right: FAQ List */}
  <div className="flex-1 flex flex-col gap-4 w-full">
         <form className="relative rounded-2xl px-6 py-4 text-white space-y-6 w-full"
         style={{
            background: "radial-gradient(100% 100% at 50% 0%, #181c26 0%, rgb(16, 18, 25) 51.35135135135135%, rgb(12, 14, 19) 100%);",
            boxShadow: "rgba(255, 255, 255, 0.2) 0px 1px 1px 0px inset, rgba(255, 255, 255, 0.05) 0px -1px 2px 0px inset",
         }}>
      {/* Background Dots Pattern */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage:
            'url(/landing/background.png?scale-down-to=1024)',
          backgroundRepeat: 'repeat',
          backgroundSize: '267.5px',
          backgroundPosition: 'top left',
          mask: "radial-gradient(60% 40% at 50% 0%, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 100%)",
        }}
      />

      {/* Header */}
      <div className='relative text-center space-y-8 flex flex-col items-center'>
      <div className="z-10 w-10 rounded-[10px] backdrop-blur-sm "
      style={{
        background: `radial-gradient(50% 50% at 50% 50%, rgba(51, 153, 255, 0.15) 0%, rgb(9, 11, 17) 100%)`,
        boxShadow: `
          rgba(255, 255, 255, 0.6) 0px 0.5px 2px -1px inset,
          rgba(255, 255, 255, 0.08) 0px 10px 10px -1px inset,
          rgba(0, 0, 0, 0.11) 0px 0.839802px 0.419901px -0.46875px,
          rgba(0, 0, 0, 0.11) 0px 1.99048px 0.99524px -0.9375px,
          rgba(0, 0, 0, 0.106) 0px 3.63084px 1.81542px -1.40625px,
          rgba(0, 0, 0, 0.1) 0px 6.03627px 3.01813px -1.875px,
          rgba(0, 0, 0, 0.098) 0px 9.74808px 4.87404px -2.34375px,
          rgba(0, 0, 0, 0.09) 0px 15.9566px 7.97832px -2.8125px,
          rgba(0, 0, 0, 0.07) 0px 27.4762px 13.7381px -3.28125px,
          rgba(0, 0, 0, 0.04) 0px 50px 25px -3.75px
        `,
      }}>
        {/* Icon */}
        <div className="w-10 h-10 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6"
          >
            <path d="M 2 6 L 8.913 9.917 C 11.462 11.361 12.538 11.361 15.087 9.917 L 22 6" fill="transparent" strokeWidth="1.5" stroke="#3399FF" strokeLinejoin="round"></path>
            <path d="M 2.016 13.476 C 2.081 16.541 2.114 18.074 3.245 19.209 C 4.376 20.345 5.95 20.384 9.099 20.463 C 11.039 20.513 12.961 20.513 14.901 20.463 C 18.05 20.384 19.624 20.345 20.755 19.209 C 21.886 18.074 21.919 16.541 21.985 13.476 C 22.005 12.49 22.005 11.51 21.985 10.524 C 21.919 7.459 21.886 5.926 20.755 4.791 C 19.624 3.655 18.05 3.616 14.901 3.537 C 12.967 3.488 11.033 3.488 9.099 3.537 C 5.95 3.616 4.376 3.655 3.245 4.791 C 2.114 5.926 2.081 7.459 2.015 10.524 C 1.994 11.508 1.994 12.492 2.015 13.476 Z" fill="transparent" strokeWidth="1.5" stroke="rgb(255, 255, 255)" strokeLinejoin="round"></path>
          </svg>
        </div>

        {/* Title */}

      </div>
        <h3 className="text-2xl font-medium pb-3">Tell us how we can help</h3>
    </div>
      {/* Input Fields */}
      <div className="relative z-10 space-y-5">
        {/* Full Name */}
        <label className="flex flex-col space-y-1">
          <p className="text-sm font-medium text-white/60 pb-[5px]">Full Name</p>
         <input
  type="text"
  name="Name"
  placeholder="Mugundhan"
  className="
    w-full
    bg-[rgba(11,13,18,0.4)]
    border
    border-[rgba(255,255,255,0.06)]
    rounded-[10px]
    p-4
    text-[16px]
    font-normal
    leading-[1em]
    text-white
    placeholder-[rgba(255,255,255,0.4)]
    focus:outline-none
    focus:border-[rgba(255,255,255,0.12)]
    focus:ring-0
    backdrop-blur
    font-inter
  "
/>

        </label>

        {/* Email */}
        <label className="flex flex-col space-y-1">
        <p className="text-sm font-medium text-white/60 pb-[5px]">Email Address</p>
         <input
    type="email"
    name="Email"
    placeholder="mugundhany@gmail.com"
  className="
    w-full
    bg-[rgba(11,13,18,0.4)]
    border
    border-[rgba(255,255,255,0.06)]
    rounded-[10px]
    p-4
    text-[16px]
    font-normal
    leading-[1em]
    text-white
    placeholder-[rgba(255,255,255,0.4)]
    focus:outline-none
    focus:border-[rgba(255,255,255,0.12)]
    focus:ring-0
    backdrop-blur
    font-inter
  "
/>
</label>
        {/* Company */}
        <label className="flex flex-col space-y-1">
          <p className="text-sm font-medium text-white/60 pb-[5px]">Company</p>
         <input type="text"
            name="Company"
            placeholder="GitTLDR"
  className="
    w-full
    bg-[rgba(11,13,18,0.4)]
    border
    border-[rgba(255,255,255,0.06)]
    rounded-[10px]
    p-4
    text-[16px]
    font-normal
    leading-[1em]
    text-white
    placeholder-[rgba(255,255,255,0.4)]
    focus:outline-none
    focus:border-[rgba(255,255,255,0.12)]
    focus:ring-0
    backdrop-blur
    font-inter
  "
/>
        </label>

        {/* Message */}
        <label className="flex flex-col space-y-1">
          <p className="text-sm font-medium text-white/60 pb-[5px]">How can we help?</p>
         <textarea
            required
            name="Help"
            placeholder="Tell us more about your needs..."
  className="
    w-full
    min-h-[100px]
    bg-[rgba(11,13,18,0.4)]
    border
    border-[rgba(255,255,255,0.06)]
    rounded-[10px]
    p-4
    text-[16px]
    font-normal
    leading-[1em]
    text-white
    placeholder-[rgba(255,255,255,0.4)]
    focus:outline-none
    focus:border-[rgba(255,255,255,0.12)]
    focus:ring-0
    backdrop-blur
    font-inter
  "
/>
        </label>
      </div>

      {/* Submit Button */}
        <Link
                            href="/auth"
                            className="py-3 font-bold text-right font-inter text-base md:text-lg flex items-center justify-center"
                            onMouseEnter={() => setIsButtonHovered(true)}
                            onMouseLeave={() => setIsButtonHovered(false)}
                            style={{
                                backgroundColor: "#3399FF",
                                borderRadius: "12px",
                                boxShadow: isButtonHovered 
                                    ? "rgba(255,255,255,0.75) 0px 0px 10px 1px inset, 0px 0px 16px 4px rgba(51,153,255,0.35)"
                                    : "rgba(255,255,255,0.75) 0px 0px 10px 1px inset, rgba(51,153,255,0) 0px 0px 30px -10px",
                                opacity: 0.85,
                                transform: "translateY(0px)",
                                transition: "all 0.3s ease",
                            }}
                        >
                            <span
                                style={{
                                    fontFamily: 'Inter, Inter Placeholder, sans-serif',
                                    fontWeight: 700,
                                    lineHeight: '1em',
                                    fontSize: '1rem',
                                    color: 'rgb(0,55,37)',
                                    textAlign: 'right',
                                }}
                            >
                                Submit
                            </span>
                        </Link>

      {/* Footer Email Link */}
      <div className="relative z-10 text-xs font-semibold text-white/40 flex items-center justify-center gap-1 text-center flex-wrap pb-2">
  <p>You can also email us at</p>
  <a
    href="mailto:support@gittldr.com"
    className="hover:underline hover:text-white transition text-white/60"
  >
    support@gittldr.com
  </a>
</div>

    </form>
        </div>
      </div>
            </section>
        <Footer />
      </div>
      </SmoothScrollProvider>
  )
}
