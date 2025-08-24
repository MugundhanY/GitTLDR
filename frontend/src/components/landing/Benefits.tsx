"use client";

export default function Benefits() {
    return (
        <section className="w-full flex flex-col items-center justify-center md:pt-20 pt-20 pb-16 px-4" style={{ position: 'relative' }}>
            {/* Benefits Badge */}
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
                        Benefits
                    </p>
                </div>
            </div>

            {/* Headline */}
            <h1
                className="text-center text-white font-inter font-medium lg:text-5xl text-3xl md:text-4xl mb-4 mx-auto max-w-lg lg:max-w-lg md:max-w-sm"
                style={{ lineHeight: 1.1 }}
            >
                {['Why', 'Choose', 'GitTLDR', 'for', 'Your', 'Team?'].map((word, index) => (
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
            <p className="text-center text-white/60 font-inter font-normal text-base mx-auto mb-12 max-w-xl lg:max-w-xl md:max-w-sm">
                Unlock productivity, clarity, and collaboration with AI-powered repository and meeting intelligence.
            </p>
            {/* ...benefits content goes here... */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-7xl mx-auto pt-8">
                {/* Card 1 */}
                <div className="relative flex flex-col items-center gap-4 rounded-2xl shadow-lg py-8 px-6" style={{transform: 'perspective(1200px)',
                    borderTop: '2px solid rgba(255,255,255,0.15)',
                    borderLeft: '0.25px solid rgba(255,255,255,0.1)',
                    borderRight: '0.25px solid rgba(255,255,255,0.1)',
                    borderBottom: '0.25px solid rgba(255,255,255,0.1)',
                    background: 'radial-gradient(100% 100% at 50% 0%, #181c26 0%, rgb(16, 18, 25) 51.35135135135135%, rgb(12, 14, 19) 100%)',
                    boxShadow: 'inset 0 1px 1px #fff3, inset 0 -1px 2px #ffffff0d',
                    }}>
                    {/* Dots pattern */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{backgroundImage: 'url(https://framerusercontent.com/images/4R2hp7zqcUnPx6jlaIa7x2MRA.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', zIndex: 0, mask: 'radial-gradient(100% 100% at 50% 0%, rgba(0, 0, 0, .2) 0%, rgba(0, 0, 0, 0) 100%) add'}} />
                    {/* Icon */}
                    <div className="relative z-10 w-12 h-12 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-full h-full">
                            <circle cx="12" cy="12" r="10" fill="#3399FF" opacity="0.15" />
                            <path d="M7 17V7h10v10H7zm2-2h6V9H9v6z" fill="#3399FF" />
                        </svg>
                    </div>
                    {/* Text */}
                    <div className="relative z-10 text-center">
                        <h4 className="text-lg font-semibold text-white mb-2">Automated Reports</h4>
                        <p className="text-white/40 text-sm" style={{
                            color: 'rgba(255, 255, 255, .4)',
                        }}>Generate repository and meeting reports effortlessly. Stay informed with actionable insights.</p>
                    </div>
                </div>
                {/* Card 2 */}
                <div className="relative flex flex-col items-center gap-4 rounded-2xl shadow-lg py-8 px-6 bg-gradient-to-b from-[#23272F] to-[#181A20]" style={{transform: 'perspective(1200px)'}}>
                    <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{backgroundImage: 'url(https://framerusercontent.com/images/4R2hp7zqcUnPx6jlaIa7x2MRA.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', zIndex: 0}} />
                    <div className="relative z-10 w-12 h-12 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-full h-full">
                            <rect x="4" y="4" width="16" height="16" rx="4" fill="#3399FF" opacity="0.15" />
                            <path d="M8 12h8M12 8v8" stroke="#3399FF" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                    <div className="relative z-10 text-center">
                        <h4 className="text-lg font-semibold text-white mb-2">Seamless Integration</h4>
                        <p className="text-white/40 text-sm">Connect GitTLDR with your favorite tools for a unified, streamlined workflow.</p>
                    </div>
                </div>
                {/* Card 3 */}
                <div className="relative flex flex-col items-center gap-4 rounded-2xl shadow-lg py-8 px-6 bg-gradient-to-b from-[#23272F] to-[#181A20]" style={{transform: 'perspective(1200px)'}}>
                    <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{backgroundImage: 'url(https://framerusercontent.com/images/4R2hp7zqcUnPx6jlaIa7x2MRA.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', zIndex: 0}} />
                    <div className="relative z-10 w-12 h-12 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-full h-full">
                            <rect x="6" y="6" width="12" height="12" rx="6" fill="#3399FF" opacity="0.15" />
                            <path d="M9 15l3-6 3 6" stroke="#3399FF" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                    <div className="relative z-10 text-center">
                        <h4 className="text-lg font-semibold text-white mb-2">Boost Productivity</h4>
                        <p className="text-white/40 text-sm">Automate routine tasks and focus on what matters. Enhance your team's efficiency.</p>
                    </div>
                </div>
                {/* Card 4 */}
                <div className="relative flex flex-col items-center gap-4 rounded-2xl shadow-lg py-8 px-6 bg-gradient-to-b from-[#23272F] to-[#181A20]" style={{transform: 'perspective(1200px)'}}>
                    <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{backgroundImage: 'url(https://framerusercontent.com/images/4R2hp7zqcUnPx6jlaIa7x2MRA.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', zIndex: 0}} />
                    <div className="relative z-10 w-12 h-12 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-full h-full">
                            <circle cx="12" cy="12" r="10" fill="#3399FF" opacity="0.15" />
                            <path d="M12 8v8M8 12h8" stroke="#3399FF" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                    <div className="relative z-10 text-center">
                        <h4 className="text-lg font-semibold text-white mb-2">24/7 AI Support</h4>
                        <p className="text-white/40 text-sm">Get round-the-clock assistance with GitTLDR’s AI, always ready to help your team.</p>
                    </div>
                </div>
                {/* Card 5 */}
                <div className="relative flex flex-col items-center gap-4 rounded-2xl shadow-lg py-8 px-6 bg-gradient-to-b from-[#23272F] to-[#181A20]" style={{transform: 'perspective(1200px)'}}>
                    <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{backgroundImage: 'url(https://framerusercontent.com/images/4R2hp7zqcUnPx6jlaIa7x2MRA.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', zIndex: 0}} />
                    <div className="relative z-10 w-12 h-12 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-full h-full">
                            <rect x="4" y="4" width="16" height="16" rx="8" fill="#3399FF" opacity="0.15" />
                            <path d="M8 12h8M12 8v8" stroke="#3399FF" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                    <div className="relative z-10 text-center">
                        <h4 className="text-lg font-semibold text-white mb-2">Data Security & Compliance</h4>
                        <p className="text-white/40 text-sm">Protect your business with advanced encryption and compliance standards.</p>
                    </div>
                </div>
                {/* Card 6 */}
                <div className="relative flex flex-col items-center gap-4 rounded-2xl shadow-lg py-8 px-6 bg-gradient-to-b from-[#23272F] to-[#181A20]" style={{transform: 'perspective(1200px)'}}>
                    <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{backgroundImage: 'url(https://framerusercontent.com/images/4R2hp7zqcUnPx6jlaIa7x2MRA.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', zIndex: 0}} />
                    <div className="relative z-10 w-12 h-12 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-full h-full">
                            <rect x="6" y="6" width="12" height="12" rx="4" fill="#3399FF" opacity="0.15" />
                            <path d="M9 15l3-6 3 6" stroke="#3399FF" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                    <div className="relative z-10 text-center">
                        <h4 className="text-lg font-semibold text-white mb-2">Intuitive User Experience</h4>
                        <p className="text-white/40 text-sm">Start using GitTLDR quickly with a user-friendly, straightforward interface.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
