"use client";

import { useState, useEffect } from 'react';
import AIRepositoryIntelligence from './features/AIRepositoryIntelligence';
import MeetingIntelligence from './features/MeetingIntelligence';
import RealTimeDashboard from './features/RealTimeDashboard';
import TeamCollaborationHub from './features/TeamCollaborationHub';

export default function Features() {
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <section className="w-full flex flex-col items-center justify-center md:pt-20 pt-20 pb-16 px-4" style={{ position: 'relative' }}>
            {/* Features Badge */}
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
                        Features
                    </p>
                </div>
            </div>

            {/* Headline */}
            <h1
                className="text-center text-white font-inter font-medium lg:text-5xl text-3xl md:text-4xl mb-4 mx-auto max-w-xl lg:max-w-xl md:max-w-sm"
                style={{ lineHeight: 1.1 }}
            >
                {['Powerful', 'Features', 'for', 'Enhanced', 'Development'].map((word, index) => (
                    <span 
                        key={word} 
                        className="inline-block mr-2" 
                        style={{ 
                            letterSpacing: '-0.05em',
                        }}
                    >
                        {word}
                    </span>
                ))}
            </h1>

            {/* Subheadline */}
            <p className="text-center text-white/60 font-inter font-normal text-base mx-auto mb-12">
                Discover the features that can take your development workflow to the next level.
            </p>

            {/* Bento Grid */}
            <div className="w-full max-w-7xl mx-auto mt-2">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-4">
                    {/* AI Repository Intelligence - Large Card (Top Left) */}
                    <AIRepositoryIntelligence 
                        hoveredCard={hoveredCard} 
                        setHoveredCard={setHoveredCard} 
                    />

                    {/* Meeting Intelligence - Large Card (Top Right) */}
                    <MeetingIntelligence 
                        hoveredCard={hoveredCard} 
                        setHoveredCard={setHoveredCard} 
                    />

                    {/* Real-Time Dashboard - Bottom Left */}
                    <RealTimeDashboard 
                        hoveredCard={hoveredCard} 
                        setHoveredCard={setHoveredCard} 
                    />

                    {/* Team Collaboration Hub - Bottom Right */}
                    <TeamCollaborationHub 
                        hoveredCard={hoveredCard} 
                        setHoveredCard={setHoveredCard} 
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-7xl mx-auto pt-8" style={{maxWidth: '80rem'}}>
                {/* Card 1 */}
                <div className="flex flex-col items-start gap-3 max-w-xs rounded-2xl shadow-lg py-5 transition-all duration-300 hover:scale-[1.03]">
                    <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-b px-1 py-1 rounded-lg"
                        style={{
                            background: 'radial-gradient(50% 50% at 50% 50%, rgba(0, 255, 166, .15) 0%, rgb(9, 11, 17) 100%)',
                            borderRadius: '10px',
                            boxShadow: 'inset 0 .5px 2px -1px #fff9, inset 0 10px 10px -1px #ffffff14, 0 10px 50px -10px #ffffff80',
                        }}>
                        <svg viewBox="0 0 24 24" className="w-6 h-6">
                            <path d="M 21 21 L 10 21 C 6.7 21 5.05 21 4.025 19.975 C 3 18.95 3 17.3 3 14 L 3 3 M 7 4 L 8 4 M 7 7 L 11 7" fill="transparent" strokeWidth="1.5" stroke="white" strokeLinecap="round" strokeMiterlimit="10" />
                            <path d="M 5 20 C 6.07 18.053 7.523 13.019 10.306 13.019 C 12.23 13.019 12.728 15.472 14.614 15.472 C 17.857 15.472 17.387 10 21 10" fill="transparent" strokeWidth="1.5" stroke="#3399FF" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h4 className="text-base pt-2 text-white font-inter font-normal">Repository Analytics</h4>
                    <p className="text-white/40 font-inter font-normal text-sm">Track commit patterns, code quality metrics, and team productivity insights.</p>
                </div>
                {/* Card 2 */}
                <div className="flex flex-col items-start gap-3 max-w-xs rounded-2xl shadow-lg py-5 transition-all duration-300 hover:scale-[1.03]">
                    <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-b px-1 py-1 rounded-lg"
                        style={{
                            background: 'radial-gradient(50% 50% at 50% 50%, rgba(0, 255, 166, .15) 0%, rgb(9, 11, 17) 100%)',
                            borderRadius: '10px',
                            boxShadow: 'inset 0 .5px 2px -1px #fff9, inset 0 10px 10px -1px #ffffff14, 0 10px 50px -10px #ffffff80',
                        }}>
                        <svg viewBox="0 0 24 24" className="w-6 h-6">
                            <path d="M 21.5 5.5 C 21.5 7.157 20.157 8.5 18.5 8.5 C 16.843 8.5 15.5 7.157 15.5 5.5 C 15.5 3.843 16.843 2.5 18.5 2.5 C 20.157 2.5 21.5 3.843 21.5 5.5 Z" fill="transparent" strokeWidth="1.5" stroke="rgb(255, 255, 255)" strokeMiterlimit="10" strokeDasharray=""></path>
      <path d="M 21.495 11 C 21.495 11 21.5 11.34 21.5 12 C 21.5 16.478 21.5 18.718 20.109 20.109 C 18.717 21.5 16.479 21.5 12 21.5 C 7.522 21.5 5.282 21.5 3.891 20.109 C 2.5 18.717 2.5 16.479 2.5 12 C 2.5 7.522 2.5 5.283 3.891 3.891 C 5.282 2.5 7.521 2.5 12 2.5 L 13 2.5" fill="transparent" strokeWidth="1.5" stroke="rgb(255, 255, 255)" strokeLinecap="round" strokeLinejoin="round" strokeDasharray=""></path>
                            <path
  d="M 6.5 17.5 L 6.5 14.5 M 11.5 17.5 L 11.5 8.5 M 16.5 17.5 L 16.5 13.5"
  fill="transparent"
  strokeWidth="1.5"
  stroke="#3399FF"
  strokeLinecap="round"
  strokeMiterlimit="10"
  strokeDasharray=""
  transform="rotate(90 12 12)"
/>

                        </svg>
                    </div>
                    <h4 className="text-base pt-2 text-white font-inter font-normal">Meeting Intelligence</h4>
                    <p className="text-white/40 font-inter font-normal text-sm">AI-powered meeting summaries with action items and Q&A extraction.</p>
                </div>
                {/* Card 3 */}
                <div className="flex flex-col items-start gap-3 max-w-xs rounded-2xl shadow-lg py-5 transition-all duration-300 hover:scale-[1.03]">
                    <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-b px-1 py-1 rounded-lg"
                        style={{
                            background: 'radial-gradient(50% 50% at 50% 50%, rgba(0, 255, 166, .15) 0%, rgb(9, 11, 17) 100%)',
                            borderRadius: '10px',
                            boxShadow: 'inset 0 .5px 2px -1px #fff9, inset 0 10px 10px -1px #ffffff14, 0 10px 50px -10px #ffffff80',
                        }}>
                        <svg viewBox="0 0 24 24" className="w-6 h-6">
                            <path d="M 2.53 14.394 C 2.317 15.747 3.268 16.686 4.432 17.154 C 8.895 18.949 15.105 18.949 19.568 17.154 C 20.732 16.686 21.683 15.747 21.47 14.394 C 21.34 13.562 20.693 12.87 20.214 12.194 C 19.587 11.297 19.525 10.32 19.524 9.279 C 19.525 5.26 16.157 2 12 2 C 7.844 2 4.475 5.26 4.475 9.28 C 4.475 10.32 4.413 11.298 3.785 12.194 C 3.307 12.87 2.661 13.562 2.53 14.394 Z M 9 21 C 9.796 21.622 10.848 22 12 22 C 13.152 22 14.204 21.622 15 21" fill="transparent" strokeWidth="1.5" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="22" cy="2" r="2" fill="#3399FF" />
                        </svg>
                    </div>
                    <h4 className="text-base pt-2 text-white font-inter font-normal">Smart Notifications</h4>
                    <p className="text-white/40 font-inter font-normal text-sm">Get notified about repository changes, meeting updates, and team activities.</p>
                </div>
                {/* Card 4 */}
                <div className="flex flex-col items-start gap-3 max-w-xs rounded-2xl shadow-lg py-5 transition-all duration-300 hover:scale-[1.03]">
                    <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-b px-1 py-1 rounded-lg"
                        style={{
                            background: 'radial-gradient(50% 50% at 50% 50%, rgba(0, 255, 166, .15) 0%, rgb(9, 11, 17) 100%)',
                            borderRadius: '10px',
                            boxShadow: 'inset 0 .5px 2px -1px #fff9, inset 0 10px 10px -1px #ffffff14, 0 10px 50px -10px #ffffff80',
                        }}>
                        <svg viewBox="0 0 24 24" className="w-6 h-6">
                            <path
        d="M 2 12 C 2 8.31 2 6.466 2.814 5.159 C 3.108 4.684 3.481 4.263 3.919 3.916 C 5.08 3 6.72 3 10 3 L 14 3 C 17.28 3 18.919 3 20.081 3.916 C 20.511 4.254 20.885 4.675 21.186 5.159 C 22 6.466 22 8.31 22 12 C 22 15.69 22 17.534 21.186 18.841 C 20.892 19.316 20.519 19.737 20.081 20.084 C 18.92 21 17.28 21 14 21 L 10 21 C 6.72 21 5.081 21 3.919 20.084 C 3.481 19.737 3.108 19.316 2.814 18.841 C 2 17.534 2 15.69 2 12 Z"
        fill="transparent"
        strokeWidth="1.5"
        stroke="rgb(255, 255, 255)"
        strokeMiterlimit="10"
        strokeDasharray=""
      />
                            <path
        d="M 7.5 15 L 9.342 9.474 C 9.437 9.191 9.702 9.001 10 9.001 C 10.298 9.001 10.563 9.191 10.658 9.474 L 12.5 15 M 15.5 9 L 15.5 15 M 8.5 13 L 11.5 13"
        fill="transparent"
        strokeWidth="1.5"
        stroke="#3399FF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray=""
      />
                        </svg>
                    </div>
                    <h4 className="text-base pt-2 text-white font-inter font-normal">AI Repository Intelligence</h4>
                    <p className="text-white/40 font-inter font-normal text-sm">Leverage AI to understand code changes, generate insights, and optimize workflows.</p>
                </div>
            </div>
        </section>
    );
}
