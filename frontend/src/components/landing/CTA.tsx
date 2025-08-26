'use client';
import { Link } from "lucide-react";
import React, { useEffect, useState } from "react";

export default function CTA() {
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [showDots, setShowDots] = useState(false);

  useEffect(() => {
    // Trigger animation on mount with slight delay
    const timer = setTimeout(() => setAnimateIn(true), 300);
    const dotsTimer = setTimeout(() => setShowDots(true), 3000);
    return () => {
      clearTimeout(timer);
      clearTimeout(dotsTimer);
    };
  }, []);
  
    const getAnimationStyle = (delay: number, type: 'default' | 'scale' | 'word' = 'default') => {
        const baseStyle = animateIn
            ? {
                opacity: 1,
                filter: 'blur(0px)',
                transition: `all 1.2s cubic-bezier(0.16, 1, 0.3, 1)`,
                transitionDelay: `${delay}ms`,
            }
            : {
                opacity: 0,
                filter: 'blur(8px)',
            };
        return baseStyle;
    };

    return (
    <section 
      className="relative w-full rounded-2xl overflow-hidden flex items-center justify-center py-[11.5rem] px-4" 
      style={{ 
        minHeight: 500,
        backgroundColor: 'radial-gradient(50% 100% at 50% 100%, #3b445966, #ababab00)' // Dark charcoal background
      }}
      id="cta"
    >
      {/* Static Background with Dot Pattern - Layer 1 */}
      <div
  className="absolute inset-0 z-0"
  style={{
    opacity: 1,
    borderRadius: 'inherit',
    backgroundRepeat: 'repeat',
    backgroundPosition: 'left top',
    backgroundSize: '321px',
    backgroundImage: 'url("/landing/background.png")',
    border: '0px',
    WebkitMask: `
      radial-gradient(50% 75% at 50% 100%, rgba(0, 0, 0, .4) 0%, rgba(0, 0, 0, 0) 100%) add
    `,
    mask: `
      radial-gradient(50% 75% at 50% 100%, rgba(0, 0, 0, .4) 0%, rgba(0, 0, 0, 0) 100%) add
    `,
  }}/>

      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 z-10" style={{ borderRadius: '500px', ...getAnimationStyle(1500, 'scale'), }}>
        {/* Core globe - only top portion visible */}
        <div 
          className="globe-core"
          style={{
            width: '375px',
            height: '375px',
            borderRadius: '50%',
            
            background: `conic-gradient(
    from 0deg at 50% 50%,
    #00ffa6 0deg,
    rgb(128, 255, 210) 54.89161972682219deg,
    rgb(255, 202, 226) 106.69924423399361deg,
    rgb(255, 255, 255) 162deg,
    rgb(133, 184, 254) 252.00000000000003deg,
    rgb(128, 255, 210) 306.00000000000006deg,
    rgb(0, 255, 166) 360deg
  )`,
            filter: 'blur(100px)',
            opacity: 1,
            animation: 'rotate-globe 5s linear infinite',
            transform: 'translateY(50%)', 
            aspectRatio: '1/1',
          }}
        />
      </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 z-10" style={{ borderRadius: '500px', ...getAnimationStyle(1000, 'scale'), }}>
        {/* Core globe - only top portion visible */}
        <div 
          className="globe-core"
          style={{
            width: '285px',
            height: '285px',
            borderRadius: '50%',
            background: `conic-gradient(
    from 0deg at 50% 50%,
    #80ffd2 0deg,
    rgb(255, 202, 226) 180deg,
    rgb(0, 255, 166) 360deg
  )`,
            filter: 'blur(32px)',
            opacity: 1,
            animation: 'rotate-globe-inverse 5s linear infinite',
            transform: 'translateY(50%)', 
            aspectRatio: '1/1',
          }}
        />
      </div>
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 z-10" style={{ borderRadius: '500px',...getAnimationStyle(500, 'scale'), }}>
        {/* Core globe - only top portion visible */}
        <div 
          className="globe-core"
          style={{
            width: '285px',
            height: '285px',
            borderRadius: '50%',
            background: `conic-gradient(
    from 0deg at 50% 50%,
    #80ffd2 0deg,
    rgb(133, 184, 254) 180deg,
    rgb(0, 255, 166) 360deg
  )`,
            filter: 'blur(32px)',
            opacity: 1,
            animation: 'rotate-globe 5s linear infinite',
            transform: 'translateY(50%)', 
            aspectRatio: '1/1',
            mixBlendMode: 'overlay',
          }}
        />
      </div>
     

      {/* Floating Particles toward Center - Layer 4 */}
      {showDots && (
        <div className="absolute inset-0 z-[3] overflow-hidden">
          {/* Large particles (slower) - smaller radius with random positioning */}
          {Array.from({ length: 40 }, (_, i) => {
            const angle = Math.random() * 360; // Random angle
            const radius = 12 + Math.random() * 20; // Smaller radius (20-35px) from aura center
            const startX = 50 + radius * Math.cos(angle * Math.PI / 180);
            const startY = 80 + radius * Math.sin(angle * Math.PI / 180); // Positioned around aura center
            const size = Math.random() * 2 + 2.5; // Larger particles (2.5-4.5px)
            const duration = Math.random() * 3 + 15; // Much faster (2-5s)
            const delay = Math.random() * 8;
            
            return (
              <div
                key={`large-${i}`}
                className="absolute rounded-full bg-white z-[-1]"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${startX}%`,
                  top: `${startY}%`,
                  opacity: 0,
                  animation: `suck-to-center ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite`,
                  animationDelay: `${delay}s`,
                  boxShadow: `0 0 12px rgba(255, 255, 255, 1), 0 0 20px rgba(128, 255, 210, 0.6)`
                }}
              />
            );
          })}
          
          {/* Small particles (faster) - smaller radius with random positioning */}
          {Array.from({ length: 80 }, (_, i) => {
            const angle = Math.random() * 360; // Random angle
            const radius = 15 + Math.random() * 25; // Smaller radius (25-45px) from aura center
            const startX = 50 + radius * Math.cos(angle * Math.PI / 180);
            const startY = 80 + radius * Math.sin(angle * Math.PI / 180); // Positioned around aura center
            const size = Math.random() * 1.5 + 0.8; // Smaller particles (0.8-2.3px)
            const duration = Math.random() * 2 + 10; // Very fast (1.5-3.5s)
            const delay = Math.random() * 10;
            
            return (
              <div
                key={`small-${i + 40}`}
                className="absolute rounded-full bg-white"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${startX}%`,
                  top: `${startY}%`,
                  opacity: 0,
                  animation: `suck-to-center ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite`,
                  animationDelay: `${delay}s`,
                  boxShadow: `0 0 8px rgba(255, 255, 255, 0.9), 0 0 15px rgba(133, 184, 255, 0.5)`
                }}
              />
            );
          })}
          
          {/* Extra tiny particles for density */}
          {Array.from({ length: 60 }, (_, i) => {
            const angle = Math.random() * 360; // Random angle
            const radius = 16 + Math.random() * 25; // Further out (30-55px)
            const startX = 50 + radius * Math.cos(angle * Math.PI / 180);
            const startY = 80 + radius * Math.sin(angle * Math.PI / 180);
            const size = Math.random() * 1 + 0.5; // Tiny particles (0.5-1.5px)
            const duration = Math.random() * 2 + 6; // Super fast (1-2.5s)
            const delay = Math.random() * 12;
            
            return (
              <div
                key={`tiny-${i + 120}`}
                className="absolute rounded-full bg-white"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${startX}%`,
                  top: `${startY}%`,
                  opacity: 0,
                  animation: `suck-to-center ${duration}s cubic-bezier(0.55, 0.085, 0.68, 0.53) infinite`,
                  animationDelay: `${delay}s`,
                  boxShadow: `0 0 6px rgba(255, 255, 255, 0.8), 0 0 12px rgba(128, 255, 210, 0.4)`
                }}
              />
            );
          })}
        </div>
      )}

      {/* Foreground UI Content - Layer 5 */}
      <div className="relative z-[60] flex flex-col items-center justify-center w-full md:max-w-3xl sm:max-w-xl mx-auto text-center">
        <h1 
  className="lg:text-[3.85rem] text-4xl md:text-6xl font-medium mb-6"
  style={{
    fontFamily: '"Inter", "Inter Placeholder", sans-serif',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    backgroundImage: 'radial-gradient(60% 200% at 50% 50%, rgb(255, 255, 255) 0%, rgba(255, 255, 255, 0) 100%)',
    letterSpacing: '-0.035em', // Reduces the space between characters
    lineHeight: '1.1em',
  }}
>
  Ready to Transform Your Repository Intelligence?
</h1>

        
        <p 
          className="text-base mb-8 max-w-md font-normal"
          style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontFamily: '"Inter", "Inter Placeholder", sans-serif',
            lineHeight: '1.2'
          }}
        >
          Join development teams who&apos;ve made code reviews effortless with AI-powered repository intelligence.
        </p>
        
        <a
  href="/auth"
  className="px-5 py-3 font-bold text-right font-inter text-base md:text-lg flex items-center justify-center mb-4"
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
    }}
  >
    Start Free Trial
  </span>
</a>


      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes rotate-globe {
          from {
            transform: translateY(50%) rotate(0deg);
          }
          to {
            transform: translateY(50%) rotate(360deg);
          }
        }
        @keyframes rotate-globe-inverse {
          from {
            transform: translateY(50%) rotate(0deg);
          }
          to {
            transform: translateY(50%) rotate(-360deg);
          }
        }

        @keyframes suck-to-center {
          0% {
            opacity: 0;
            transform: scale(1);
          }
          5% {
            opacity: 0.3;
          }
          15% {
            opacity: 0.8;
            transform: scale(1.1);
          }
          30% {
            opacity: 1;
            transform: scale(1.2);
          }
          60% {
            opacity: 1;
            transform: scale(1.1);
          }
          85% {
            opacity: 0.8;
            transform: scale(0.6);
            left: 50%;
            top: 100%;
          }
          95% {
            opacity: 0.3;
            transform: scale(0.2);
            left: 50%;
            top: 100%;
          }
          100% {
            opacity: 0;
            transform: scale(0);
            left: 50%;
            top: 100%;
          }
        }

        @keyframes drift-to-center {
          0% {
            opacity: 0;
            transform: scale(1);
          }
          10% {
            opacity: 0.9;
          }
          40% {
            opacity: 1;
          }
          70% {
            opacity: 0.8;
            transform: scale(0.8);
          }
          90% {
            opacity: 0.4;
            transform: scale(0.4);
          }
          100% {
            opacity: 0;
            left: 50%;
            top: 100%;
            transform: scale(0);
          }
        }
        
        .cta-button:hover {
          box-shadow: 0 0 40px rgba(133, 184, 255, 0.5), 0 0 80px rgba(133, 184, 255, 0.2);
          background-color: rgba(133, 184, 255, 0.9);
        }
        
        .globe-core, .globe-inner-core, .aura-cone, .aura-soft, .aura-outer, .aura-extreme {
          pointer-events: none;
        }
      `}</style>
    </section>
  );
}
