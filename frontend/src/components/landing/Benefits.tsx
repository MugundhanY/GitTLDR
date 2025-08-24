"use client";

export default function Benefits() {
    return (
        <section className="w-full flex flex-col items-center justify-center md:pt-20 pt-20 pb-16 px-4" style={{ position: 'relative' }} id="benefits">
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
                <div className="relative flex flex-col items-center gap-4 rounded-2xl shadow-lg py-8 px-6 transition-all duration-300 ease-out border-t-[2px] border-l border-r border-b border-t-[rgba(255,255,255,0.15)] border-l-[rgba(255,255,255,0.1)] border-r-[rgba(255,255,255,0.1)] border-b-[rgba(255,255,255,0.1)] hover:scale-[1.06] hover:shadow-[0_0_0_8px_rgba(51,153,255,0.18),0_12px_48px_-8px_rgba(51,153,255,0.22)] hover:border-t-[2.5px] hover:border-t-[#3399FF] hover:border-l-[#3399FF] hover:border-r-[#3399FF] hover:border-b-[#3399FF]" style={{transform: 'perspective(1200px)',
                    background: 'radial-gradient(100% 100% at 50% 0%, #181c26 0%, rgb(16, 18, 25) 51.35135135135135%, rgb(12, 14, 19) 100%)',
                    boxShadow: 'inset 0 1px 1px #fff3, inset 0 -1px 2px #ffffff0d',
                    }}>
                    {/* Dots pattern */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl -z-50" style={{backgroundImage: 'url(https://framerusercontent.com/images/4R2hp7zqcUnPx6jlaIa7x2MRA.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', zIndex: 0, mask: 'radial-gradient(100% 100% at 50% 0%, rgba(0, 0, 0, .2) 0%, rgba(0, 0, 0, 0) 100%) add'}} />
                    {/* Icon */}
                    <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-b px-1 py-1 rounded-lg z-10"
                        style={{
                            background: 'radial-gradient(50% 50% at 50% 50%, rgba(0, 255, 166, .15) 0%, rgb(9, 11, 17) 100%)',
                            borderRadius: '10px',
                            boxShadow: 'inset 0 .5px 2px -1px #fff9, inset 0 10px 10px -1px #ffffff14, 0 10px 50px -10px #ffffff80',
                        }}>
                        <svg viewBox="0 0 24 24" className="w-6 h-6">
                            <path d="M 6.5 17.5 L 6.5 14.5 M 11.5 17.5 L 11.5 8.5 M 16.5 17.5 L 16.5 13.5" fill="transparent" strokeWidth="1.5" stroke="#3399FF" strokeLinecap="round" strokeMiterlimit="10" strokeDasharray=""></path>
                            <path d="M 21.5 5.5 C 21.5 7.157 20.157 8.5 18.5 8.5 C 16.843 8.5 15.5 7.157 15.5 5.5 C 15.5 3.843 16.843 2.5 18.5 2.5 C 20.157 2.5 21.5 3.843 21.5 5.5 Z" fill="transparent" strokeWidth="1.5" stroke="rgb(255, 255, 255)" strokeMiterlimit="10" strokeDasharray=""></path>
      <path d="M 21.495 11 C 21.495 11 21.5 11.34 21.5 12 C 21.5 16.478 21.5 18.718 20.109 20.109 C 18.717 21.5 16.479 21.5 12 21.5 C 7.522 21.5 5.282 21.5 3.891 20.109 C 2.5 18.717 2.5 16.479 2.5 12 C 2.5 7.522 2.5 5.283 3.891 3.891 C 5.282 2.5 7.521 2.5 12 2.5 L 13 2.5" fill="transparent" strokeWidth="1.5" stroke="rgb(255, 255, 255)" strokeLinecap="round" strokeLinejoin="round" strokeDasharray=""></path>
                        </svg>
                    </div>
                    {/* Text */}
                    <div className="relative z-10 text-center">
                        <h4 className="text-lg font-semibold text-white mb-2">AI-Powered Summaries</h4>
                        <p className="text-white/40 text-sm" style={{
                            color: 'rgba(255, 255, 255, .4)',
                        }}>Get intelligent summaries of commits, PRs, and meetings with key insights and action items.</p>
                    </div>
                </div>
                {/* Card 2 */}
                <div className="relative flex flex-col items-center gap-4 rounded-2xl shadow-lg py-8 px-6 transition-all duration-300 ease-out border-t-[2px] border-l border-r border-b border-t-[rgba(255,255,255,0.15)] border-l-[rgba(255,255,255,0.1)] border-r-[rgba(255,255,255,0.1)] border-b-[rgba(255,255,255,0.1)] hover:scale-[1.06] hover:shadow-[0_0_0_8px_rgba(51,153,255,0.18),0_12px_48px_-8px_rgba(51,153,255,0.22)] hover:border-t-[2.5px] hover:border-t-[#3399FF] hover:border-l-[#3399FF] hover:border-r-[#3399FF] hover:border-b-[#3399FF]" style={{transform: 'perspective(1200px)',
                    background: 'radial-gradient(100% 100% at 50% 0%, #181c26 0%, rgb(16, 18, 25) 51.35135135135135%, rgb(12, 14, 19) 100%)',
                    boxShadow: 'inset 0 1px 1px #fff3, inset 0 -1px 2px #ffffff0d',
                    }}>
                    {/* Dots pattern */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl -z-50" style={{backgroundImage: 'url(https://framerusercontent.com/images/4R2hp7zqcUnPx6jlaIa7x2MRA.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', zIndex: 0, mask: 'radial-gradient(100% 100% at 50% 0%, rgba(0, 0, 0, .2) 0%, rgba(0, 0, 0, 0) 100%) add'}} />
                    {/* Icon */}
                    <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-b px-1 py-1 rounded-lg z-10"
                        style={{
                            background: 'radial-gradient(50% 50% at 50% 50%, rgba(0, 255, 166, .15) 0%, rgb(9, 11, 17) 100%)',
                            borderRadius: '10px',
                            boxShadow: 'inset 0 .5px 2px -1px #fff9, inset 0 10px 10px -1px #ffffff14, 0 10px 50px -10px #ffffff80',
                        }}>
                        <svg viewBox="0 0 24 24" className="w-6 h-6">
                            <path
        d="M 11 5 L 18 5 M 10 10 L 14.5 14.5 M 5 11 L 5 18"
        fill="transparent"
        strokeWidth="1.5"
        stroke="rgb(255, 255, 255)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray=""
      />
      <path
        d="M 2 6.444 C 2 3.99 3.99 2 6.444 2 C 8.898 2 10.888 3.99 10.888 6.444 C 10.888 8.898 8.898 10.888 6.444 10.888 C 3.99 10.888 2 8.898 2 6.444 Z"
        fill="transparent"
        strokeWidth="1.5"
        stroke="#3399FF"
        strokeMiterlimit="10"
        strokeDasharray=""
      />
      <path
        d="M 3 20 C 3 18.895 3.895 18 5 18 C 6.105 18 7 18.895 7 20 C 7 21.105 6.105 22 5 22 C 3.895 22 3 21.105 3 20 Z"
        fill="transparent"
        strokeWidth="1.5"
        stroke="rgb(255, 255, 255)"
        strokeMiterlimit="10"
        strokeDasharray=""
      />
      <path
        d="M 14 16 C 14 14.895 14.895 14 16 14 C 17.105 14 18 14.895 18 16 C 18 17.105 17.105 18 16 18 C 14.895 18 14 17.105 14 16 Z"
        fill="transparent"
        strokeWidth="1.5"
        stroke="rgb(255, 255, 255)"
        strokeMiterlimit="10"
        strokeDasharray=""
      />
      <path
        d="M 18 5 C 18 3.895 18.895 3 20 3 C 21.105 3 22 3.895 22 5 C 22 6.105 21.105 7 20 7 C 18.895 7 18 6.105 18 5 Z"
        fill="transparent"
        strokeWidth="1.5"
        stroke="rgb(255, 255, 255)"
        strokeMiterlimit="10"
        strokeDasharray=""
      />
                        </svg>
                    </div>
                    {/* Text */}
                    <div className="relative z-10 text-center">
                        <h4 className="text-lg font-semibold text-white mb-2">GitHub Integration</h4>
                        <p className="text-white/40 text-sm" style={{
                            color: 'rgba(255, 255, 255, .4)',
                        }}>Seamlessly connect your GitHub repositories for automated analysis and insights.</p>
                    </div>
                </div>
                {/* Card 3 */}
                <div className="relative flex flex-col items-center gap-4 rounded-2xl shadow-lg py-8 px-6 transition-all duration-300 ease-out border-t-[2px] border-l border-r border-b border-t-[rgba(255,255,255,0.15)] border-l-[rgba(255,255,255,0.1)] border-r-[rgba(255,255,255,0.1)] border-b-[rgba(255,255,255,0.1)] hover:scale-[1.06] hover:shadow-[0_0_0_8px_rgba(51,153,255,0.18),0_12px_48px_-8px_rgba(51,153,255,0.22)] hover:border-t-[2.5px] hover:border-t-[#3399FF] hover:border-l-[#3399FF] hover:border-r-[#3399FF] hover:border-b-[#3399FF]" style={{transform: 'perspective(1200px)',
                    background: 'radial-gradient(100% 100% at 50% 0%, #181c26 0%, rgb(16, 18, 25) 51.35135135135135%, rgb(12, 14, 19) 100%)',
                    boxShadow: 'inset 0 1px 1px #fff3, inset 0 -1px 2px #ffffff0d',
                    }}>
                    {/* Dots pattern */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl -z-50" style={{backgroundImage: 'url(https://framerusercontent.com/images/4R2hp7zqcUnPx6jlaIa7x2MRA.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', zIndex: 0, mask: 'radial-gradient(100% 100% at 50% 0%, rgba(0, 0, 0, .2) 0%, rgba(0, 0, 0, 0) 100%) add'}} />
                    {/* Icon */}
                    <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-b px-1 py-1 rounded-lg z-10"
                        style={{
                            background: 'radial-gradient(50% 50% at 50% 50%, rgba(0, 255, 166, .15) 0%, rgb(9, 11, 17) 100%)',
                            borderRadius: '10px',
                            boxShadow: 'inset 0 .5px 2px -1px #fff9, inset 0 10px 10px -1px #ffffff14, 0 10px 50px -10px #ffffff80',
                        }}>
                        <svg viewBox="0 0 24 24" className="w-6 h-6">
                            <path
        d="M 13.5 13 L 17 9 M 14 15 C 14 16.105 13.105 17 12 17 C 10.895 17 10 16.105 10 15 C 10 13.895 10.895 13 12 13 C 13.105 13 14 13.895 14 15 Z M 6 12 C 6 9.856 7.143 7.875 9 6.803 C 10.856 5.731 13.143 5.731 15 6.803"
        fill="transparent"
        strokeWidth="1.5"
        stroke="#3399FF"
        strokeLinecap="round"
        strokeMiterlimit="10"
        strokeDasharray=""
      />
      <path
        d="M 2.5 12 C 2.5 7.522 2.5 5.283 3.891 3.891 C 5.283 2.501 7.521 2.501 12.001 2.501 C 16.478 2.501 18.718 2.501 20.109 3.891 C 21.5 5.283 21.5 7.521 21.5 12.001 C 21.5 16.478 21.5 18.718 20.109 20.109 C 18.718 21.5 16.479 21.5 12 21.5 C 7.522 21.5 5.283 21.5 3.891 20.109 C 2.501 18.718 2.501 16.479 2.501 12 Z"
        fill="transparent"
        strokeWidth="1.5"
        stroke="rgb(255, 255, 255)"
        strokeMiterlimit="10"
        strokeDasharray=""
      />
                        </svg>
                    </div>
                    {/* Text */}
                    <div className="relative z-10 text-center">
                        <h4 className="text-lg font-semibold text-white mb-2">Smart Context Analysis</h4>
                        <p className="text-white/40 text-sm" style={{
                            color: 'rgba(255, 255, 255, .4)',
                        }}>Advanced AI analyzes code changes and meeting context to provide meaningful insights.</p>
                    </div>
                </div>
                {/* Card 4 */}
                <div className="relative flex flex-col items-center gap-4 rounded-2xl shadow-lg py-8 px-6 transition-all duration-300 ease-out border-t-[2px] border-l border-r border-b border-t-[rgba(255,255,255,0.15)] border-l-[rgba(255,255,255,0.1)] border-r-[rgba(255,255,255,0.1)] border-b-[rgba(255,255,255,0.1)] hover:scale-[1.06] hover:shadow-[0_0_0_8px_rgba(51,153,255,0.18),0_12px_48px_-8px_rgba(51,153,255,0.22)] hover:border-t-[2.5px] hover:border-t-[#3399FF] hover:border-l-[#3399FF] hover:border-r-[#3399FF] hover:border-b-[#3399FF]" style={{transform: 'perspective(1200px)',
                    background: 'radial-gradient(100% 100% at 50% 0%, #181c26 0%, rgb(16, 18, 25) 51.35135135135135%, rgb(12, 14, 19) 100%)',
                    boxShadow: 'inset 0 1px 1px #fff3, inset 0 -1px 2px #ffffff0d',
                    }}>
                    {/* Dots pattern */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl -z-50" style={{backgroundImage: 'url(https://framerusercontent.com/images/4R2hp7zqcUnPx6jlaIa7x2MRA.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', zIndex: 0, mask: 'radial-gradient(100% 100% at 50% 0%, rgba(0, 0, 0, .2) 0%, rgba(0, 0, 0, 0) 100%) add'}} />
                    {/* Icon */}
                    <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-b px-1 py-1 rounded-lg z-10"
                        style={{
                            background: 'radial-gradient(50% 50% at 50% 50%, rgba(0, 255, 166, .15) 0%, rgb(9, 11, 17) 100%)',
                            borderRadius: '10px',
                            boxShadow: 'inset 0 .5px 2px -1px #fff9, inset 0 10px 10px -1px #ffffff14, 0 10px 50px -10px #ffffff80',
                        }}>
                        <svg viewBox="0 0 24 24" className="w-6 h-6">
                            <path
        d="M 14.17 20.89 C 18.354 20.613 21.686 17.233 21.96 12.99 C 22.013 12.16 22.013 11.3 21.96 10.47 C 21.686 6.228 18.354 2.85 14.17 2.571 C 12.725 2.476 11.275 2.476 9.83 2.571 C 5.646 2.849 2.314 6.228 2.04 10.471 C 1.987 11.31 1.987 12.152 2.04 12.991 C 2.14 14.536 2.823 15.967 3.628 17.175 C 4.095 18.02 3.787 19.075 3.3 19.998 C 2.95 20.663 2.774 20.995 2.915 21.235 C 3.055 21.475 3.37 21.483 3.999 21.498 C 5.244 21.528 6.083 21.176 6.749 20.685 C 7.126 20.406 7.315 20.267 7.445 20.251 C 7.575 20.235 7.832 20.341 8.344 20.551 C 8.804 20.741 9.339 20.858 9.829 20.891 C 11.254 20.985 12.743 20.985 14.171 20.891 Z"
        fill="transparent"
        strokeWidth="1.5"
        stroke="rgb(255, 255, 255)"
        strokeLinejoin="round"
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
                    {/* Text */}
                    <div className="relative z-10 text-center">
                        <h4 className="text-lg font-semibold text-white mb-2">24/7 AI Support</h4>
                        <p className="text-white/40 text-sm" style={{
                            color: 'rgba(255, 255, 255, .4)',
                        }}>Get round-the-clock assistance with GitTLDR’s AI, always ready to help your team.</p>
                    </div>
                </div>
                {/* Card 5 */}
                <div className="relative flex flex-col items-center gap-4 rounded-2xl shadow-lg py-8 px-6 transition-all duration-300 ease-out border-t-[2px] border-l border-r border-b border-t-[rgba(255,255,255,0.15)] border-l-[rgba(255,255,255,0.1)] border-r-[rgba(255,255,255,0.1)] border-b-[rgba(255,255,255,0.1)] hover:scale-[1.06] hover:shadow-[0_0_0_8px_rgba(51,153,255,0.18),0_12px_48px_-8px_rgba(51,153,255,0.22)] hover:border-t-[2.5px] hover:border-t-[#3399FF] hover:border-l-[#3399FF] hover:border-r-[#3399FF] hover:border-b-[#3399FF]" style={{transform: 'perspective(1200px)',
                    background: 'radial-gradient(100% 100% at 50% 0%, #181c26 0%, rgb(16, 18, 25) 51.35135135135135%, rgb(12, 14, 19) 100%)',
                    boxShadow: 'inset 0 1px 1px #fff3, inset 0 -1px 2px #ffffff0d',
                    }}>
                    {/* Dots pattern */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl -z-50" style={{backgroundImage: 'url(https://framerusercontent.com/images/4R2hp7zqcUnPx6jlaIa7x2MRA.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', zIndex: 0, mask: 'radial-gradient(100% 100% at 50% 0%, rgba(0, 0, 0, .2) 0%, rgba(0, 0, 0, 0) 100%) add'}} />
                    {/* Icon */}
                    <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-b px-1 py-1 rounded-lg z-10"
                        style={{
                            background: 'radial-gradient(50% 50% at 50% 50%, rgba(0, 255, 166, .15) 0%, rgb(9, 11, 17) 100%)',
                            borderRadius: '10px',
                            boxShadow: 'inset 0 .5px 2px -1px #fff9, inset 0 10px 10px -1px #ffffff14, 0 10px 50px -10px #ffffff80',
                        }}>
                        <svg viewBox="0 0 24 24" className="w-6 h-6">
                            <path
        d="M 10.998 8 C 15.417 8 18.998 6.656 18.998 5 C 18.998 3.342 15.417 2 10.998 2 C 6.58 2 2.998 3.342 2.998 5 C 2.998 6.656 6.58 8 10.998 8 Z"
        fill="transparent"
        strokeWidth="1.5"
        stroke="rgb(255, 255, 255)"
        strokeMiterlimit="10"
        strokeDasharray=""
      />
      <path
        d="M 5.999 10.841 C 6.6 11.021 7.273 11.171 7.999 11.281 M 10.998 15 C 6.58 15 2.998 13.656 2.998 12 M 5.999 17.841 C 6.6 18.021 7.273 18.171 7.999 18.281"
        fill="transparent"
        strokeWidth="1.5"
        stroke="rgb(255, 255, 255)"
        strokeLinecap="round"
        strokeMiterlimit="10"
        strokeDasharray=""
      />
      <path
        d="M 10.998 22 C 6.58 22 2.998 20.656 2.998 19 L 2.998 5 M 18.998 5 L 18.998 10.5"
        fill="transparent"
        strokeWidth="1.5"
        stroke="rgb(255, 255, 255)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray=""
      />
      <path
        d="M 15.742 16.378 C 15.742 16.318 15.751 15.553 15.752 15.118 C 15.753 14.721 15.718 14.338 15.908 13.988 C 16.618 12.576 18.658 12.719 19.162 14.158 C 19.25 14.396 19.255 14.771 19.252 15.118 C 19.249 15.562 19.258 16.378 19.258 16.378 M 15.742 16.378 C 14.662 16.378 14.219 17.158 14.099 17.638 C 13.979 18.118 13.979 19.856 14.051 20.576 C 14.291 21.476 14.891 21.847 15.478 21.967 C 16.018 22.015 18.298 21.997 18.958 21.997 C 19.918 22.015 20.638 21.656 20.938 20.576 C 20.998 20.216 21.058 18.237 20.908 17.637 C 20.589 16.677 19.858 16.377 19.258 16.377 M 15.742 16.377 L 19.258 16.377"
        fill="transparent"
        strokeWidth="1.5"
        stroke="#3399FF"
        strokeLinecap="round"
        strokeMiterlimit="10"
        strokeDasharray=""
      />
                        </svg>
                    </div>
                    {/* Text */}
                    <div className="relative z-10 text-center">
                        <h4 className="text-lg font-semibold text-white mb-2">Meeting Intelligence</h4>
                        <p className="text-white/40 text-sm" style={{
                            color: 'rgba(255, 255, 255, .4)',
                        }}>Upload and analyze meeting recordings with automated transcription and key insights.</p>
                    </div>
                </div>
                {/* Card 6 */}
                <div className="relative flex flex-col items-center gap-4 rounded-2xl shadow-lg py-8 px-6 transition-all duration-300 ease-out border-t-[2px] border-l border-r border-b border-t-[rgba(255,255,255,0.15)] border-l-[rgba(255,255,255,0.1)] border-r-[rgba(255,255,255,0.1)] border-b-[rgba(255,255,255,0.1)] hover:scale-[1.06] hover:shadow-[0_0_0_8px_rgba(51,153,255,0.18),0_12px_48px_-8px_rgba(51,153,255,0.22)] hover:border-t-[2.5px] hover:border-t-[#3399FF] hover:border-l-[#3399FF] hover:border-r-[#3399FF] hover:border-b-[#3399FF]" style={{transform: 'perspective(1200px)',
                    background: 'radial-gradient(100% 100% at 50% 0%, #181c26 0%, rgb(16, 18, 25) 51.35135135135135%, rgb(12, 14, 19) 100%)',
                    boxShadow: 'inset 0 1px 1px #fff3, inset 0 -1px 2px #ffffff0d',
                    }}>
                    {/* Dots pattern */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl -z-50" style={{backgroundImage: 'url(https://framerusercontent.com/images/4R2hp7zqcUnPx6jlaIa7x2MRA.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', zIndex: 0, mask: 'radial-gradient(100% 100% at 50% 0%, rgba(0, 0, 0, .2) 0%, rgba(0, 0, 0, 0) 100%) add'}} />
                    {/* Icon */}
                    <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-b px-1 py-1 rounded-lg z-10"
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
        d="M 9.5 3 L 9.5 21"
        fill="transparent"
        strokeWidth="1.5"
        stroke="rgb(255, 255, 255)"
        strokeLinejoin="round"
        strokeDasharray=""
      />
      <path
        d="M 5 7 L 6 7 M 5 10 L 6 10"
        fill="transparent"
        strokeWidth="1.5"
        stroke="#3399FF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray=""
      />
                        </svg>
                    </div>
                    {/* Text */}
                    <div className="relative z-10 text-center">
                        <h4 className="text-lg font-semibold text-white mb-2">Team Collaboration</h4>
                        <p className="text-white/40 text-sm" style={{
                            color: 'rgba(255, 255, 255, .4)',
                        }}>Share insights, search across projects, and collaborate with your team seamlessly.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
