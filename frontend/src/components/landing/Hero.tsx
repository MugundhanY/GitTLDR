"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import ReactModal from 'react-modal';
// Import black and white company logos from react-icons
import { FaGoogle, FaMicrosoft, FaAmazon, FaApple, FaFacebookF, FaSpotify, FaPaypal, FaStripe, FaDribbble, FaGithub, FaSlack, FaDropbox, FaAirbnb, FaUber, FaFigma, FaTrello, FaJira, FaConfluence, FaBitbucket, FaGitlab } from 'react-icons/fa';

// Set the app element for ReactModal globally
if (typeof window !== 'undefined') {
    const appElement = document.getElementById('__next');
    if (appElement) {
        ReactModal.setAppElement(appElement);
    } else {
        ReactModal.setAppElement('body'); // Fallback to body if #__next is not found
    }
}

export default function Hero() {
    const [isHovered, setIsHovered] = useState(false);
    const [isVideoOpen, setIsVideoOpen] = useState(false);
    const [isButtonHovered, setIsButtonHovered] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);

    useEffect(() => {
        // Trigger animation on mount with slight delay
        const timer = setTimeout(() => setAnimateIn(true), 300);
        return () => clearTimeout(timer);
    }, []);

    // Advanced animation styles with blur and scale
    const getAnimationStyle = (delay: number, type: 'default' | 'scale' | 'word' = 'default') => {
        const baseStyle = animateIn
            ? {
                opacity: 1,
                transform: type === 'scale' 
                    ? 'translateY(0px) scale(1)' 
                    : type === 'word'
                    ? 'translateY(0px) rotateX(0deg)'
                    : 'translateY(0px)',
                filter: 'blur(0px)',
                transition: `all 1.2s cubic-bezier(0.16, 1, 0.3, 1)`,
                transitionDelay: `${delay}ms`,
            }
            : {
                opacity: 0,
                transform: type === 'scale' 
                    ? 'translateY(60px) scale(0.95)' 
                    : type === 'word'
                    ? 'translateY(50px) rotateX(20deg)'
                    : 'translateY(60px)',
                filter: 'blur(8px)',
            };
        return baseStyle;
    };

    // Special animation style for background that combines translateX with animation
    const getBackgroundAnimationStyle = (delay: number) => {
        const animationTransform = animateIn
            ? 'translateY(0px)'
            : 'translateY(60px)';
        
        return animateIn
            ? {
                opacity: 1,
                transform: `translateX(-50%) ${animationTransform}`,
                filter: 'blur(0px)',
                transition: `all 1.2s cubic-bezier(0.16, 1, 0.3, 1)`,
                transitionDelay: `${delay}ms`,
            }
            : {
                opacity: 0,
                transform: `translateX(-50%) ${animationTransform}`,
                filter: 'blur(8px)',
            };
    };

    // Special animation style for play button that combines translate with animation
    const getPlayButtonAnimationStyle = (delay: number) => {
        const animationTransform = animateIn
            ? 'scale(1)'
            : 'scale(0.95)';
        
        return animateIn
            ? {
                opacity: 1,
                transform: `translate(-50%, -50%) translateY(0px) ${animationTransform}`,
                filter: 'blur(0px)',
                transition: `all 1.2s cubic-bezier(0.16, 1, 0.3, 1)`,
                transitionDelay: `${delay}ms`,
            }
            : {
                opacity: 0,
                transform: `translate(-50%, -50%) translateY(60px) ${animationTransform}`,
                filter: 'blur(8px)',
            };
    };

    const openVideo = () => setIsVideoOpen(true);
    const closeVideo = () => setIsVideoOpen(false);

    return (
        <>
            <style jsx>{`
                @keyframes scroll {
                    0% {
                        transform: translateX(-50.8%);
                    }
                    100% {
                        transform: translateX(0%);
                    }
                }
                .scrolling-logos ul {
                    animation: scroll 60s linear infinite;
                    width: calc(200% + 0); /* Double width plus gap compensation */
                }
            `}</style>
            <section className="w-full flex flex-col items-center justify-center md:pt-44 pt-32 pb-16 px-4" style={{ position: 'relative' }} id="hero">

                {/* Content Wrapper */}
                <div className="relative z-10 w-full flex flex-col items-center" style={getAnimationStyle(0)}>
                    {/* Badge */}
                    <div className="flex items-center mb-8" style={getAnimationStyle(200, 'scale')}>
                        <div
                            className="mr-2 flex items-center"
                            style={{
                                background: "#3399FF",
                                borderRadius: "9999px",
                                padding: "0.25rem 0.5rem",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <span
                                className="font-inter"
                                style={{
                                    fontFamily: 'Inter, Inter Placeholder, sans-serif',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    lineHeight: '1em',
                                    textAlign: 'center',
                                    color: 'rgb(255,255,255)',
                                    letterSpacing: '0.02em',
                                }}
                            >
                                NEW
                            </span>
                        </div>
                        <p
                            className="text-sm font-inter text-center font-semibold"
                            style={{
                                backgroundImage: 'linear-gradient(90deg, #3399FF 0%, #3399FF 60%, #66CCFF 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                color: 'transparent',
                                fontWeight: 400,
                            }}
                        >
                            GitTLDR AI is now available!
                        </p>
                    </div>

                    {/* Headline with word-by-word animation */}
                    <h1
                        className="text-center text-white font-inter font-medium lg:text-6xl text-4xl md:text-5xl mb-4 mx-auto max-w-4xl md:pl-24 md:pr-24 lg:pl-4 lg:pr-4"
                        style={{ lineHeight: 1.1 }}
                    >
                        {['AI-powered', 'Collaboration', 'Suite', 'for', 'Modern', 'Teams'].map((word, index) => (
                            <span 
                                key={word} 
                                className="inline-block mr-4" 
                                style={{ 
                                    letterSpacing: '-0.05em',
                                    ...getAnimationStyle(400 + (index * 100), 'word')
                                }}
                            >
                                {word}
                            </span>
                        ))}
                    </h1>

                    {/* Subheadline */}
                    <p className="text-center text-white/60 font-inter font-normal text-lg mx-auto max-w-xl mb-8" style={getAnimationStyle(1200)}>
                        <span className="inline-block">Empower</span>{' '}
                        <span className="inline-block">your</span>{' '}
                        <span className="inline-block">team</span>{' '}
                        <span className="inline-block">with</span>{' '}
                        <span className="inline-block">AI-driven</span>{' '}
                        <span className="inline-block">automation</span>{' '}
                        <span className="inline-block">for</span>{' '}
                        <span className="inline-block">smarter</span>{' '}
                        <span className="inline-block">project</span>{' '}
                        <span className="inline-block">management</span>{' '}
                        <span className="inline-block">and</span>{' '}
                        <span className="inline-block">collaborative</span>{' '}
                        <span className="inline-block">workflows.</span>
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col md:flex-row gap-4 justify-center max-w-none md:max-w-none mx-auto" style={getAnimationStyle(1400, 'scale')}>
                        <Link
                            href="/auth"
                            className="px-4 py-3 font-bold text-right font-inter text-base md:text-lg flex items-center justify-center"
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
                                Try GitTLDR for Free
                            </span>
                        </Link>
                        <Link
                            href="/"
                            className="px-4 flex items-center justify-center py-3 rounded-xl font-medium text-right bg-[#14161a]  text-stone-400 hover:text-white shadow-lg font-inter"
                            style={{
                                boxShadow: "rgba(255,255,255,0.235) 0px 0.6px 3px -1.6px inset, rgba(255,255,255,0.192) 0px 2.2px 11.4px -3.3px inset",
                                lineHeight: '1em',
                                fontSize: '1rem',
                                fontWeight: 500,
                                opacity: 1,
                            }}
                        >
                            Schedule a Demo
                        </Link>
                    </div>
                </div>

                {/* Framer-inspired Image Container Section */}
                <div className="relative w-full mx-auto mt-24 z-10" style={{ borderRadius: '14px', maxWidth: '78rem', ...getAnimationStyle(1600, 'scale') }}>
                    {/* Background positioned relative to hero image */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '-225px',
                            left: '50%',
                            width: 'calc(100% + 400px)',
                            height: 'calc(100% + 200px)',
                            minWidth: '500px',
                            minHeight: '250px',
                            zIndex: -1,
                            backgroundImage: 'url(/landing/background.png)',
                            backgroundRepeat: 'repeat',
                            backgroundPosition: 'center center',
                            backgroundSize: '267.5px',
                            maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 65%)',
                            WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 65%)',
                            pointerEvents: 'none',
                            ...getBackgroundAnimationStyle(2000),
                        }}
                    />

                    {/* The full-sized dashboard image sits on top */}
                    <div style={{
                        position: 'relative', // This needs to be relative for the absolute children
                        zIndex: 2,
                        borderRadius: '14px',
                        overflow: 'hidden',
                        ...getAnimationStyle(1800, 'scale'),
                    }}>
                        <img
                            src="/landing/hero_image.png"
                            alt="Dashboard Preview"
                            style={{
                                display: 'block',
                                width: '100%',
                                height: '100%',
                                borderRadius: 'inherit',
                                objectFit: 'cover',
                                objectPosition: 'center',
                            }}
                        />
                        {/* Black gradient overlay for a fade-to-black effect */}
                        <div
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: '90%',
                                background: 'linear-gradient(to top, rgb(7, 9, 14) 1%, transparent 100%)',
                                pointerEvents: 'none',
                            }}
                        />

                        {/* START: Corrected Animated Play Button */}
                        <div
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            onClick={openVideo} // Open video on click
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 3,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-start', // Always justify left, padding will handle centering
                                cursor: 'pointer',
                                backdropFilter: 'blur(10px)',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                boxShadow: 'rgba(0, 0, 0, 0.5) 0px 20px 40px -10px, rgba(255, 255, 255, 0.2) 0px 1px 1px 0px inset, rgba(255, 255, 255, 0.05) 0px -1px 2px 0px inset',
                                overflow: 'hidden',
                                width: isHovered ? '232px' : '74px',
                                height: '74px',
                                borderRadius: '37px', // Pill shape for both states
                                transition: 'width 0.3s ease-in-out',
                            }}
                        >
							<div
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 4,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-start', // Always justify left, padding will handle centering
                                cursor: 'pointer',
                                backdropFilter: 'blur(10px)',
                                backgroundColor: 'rgba(255, 255, 255, 0.001)',
                                boxShadow: 'rgba(0, 0, 0, 0.5) 0px 20px 40px -10px, rgba(255, 255, 255, 0.2) 0px 1px 1px 0px inset, rgba(255, 255, 255, 0.05) 0px -1px 2px 0px inset',
                                overflow: 'hidden',
                                width: isHovered ? '213px' : '55px',
                                height: '55px',
                                borderRadius: '37px', // Pill shape for both states
                                transition: 'width 0.3s ease-in-out',
                            }}
                        >
                            {/* Icon Wrapper */}
                            <div style={{
                                flexShrink: 0,
                                width: '54px',
                                height: '54px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <div style={{ width: '28px', height: '28px' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" focusable="false" color="rgb(255, 255, 255)" style={{ userSelect: 'none', width: '100%', height: '100%', display: 'inline-block', fill: 'rgb(255, 255, 255)', color: 'rgb(255, 255, 255)', flexShrink: 0 }}>
                                        <g color="rgb(255, 255, 255)">
                                            <path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z"></path>
                                        </g>
                                    </svg>
                                </div>
                            </div>
                            {/* Text Span */}
                            <span className="text-gray-300" style={{
                                fontWeight: 400,
                                fontSize: '0.9rem',
                                whiteSpace: 'nowrap',
                                paddingRight: '24px',
                                opacity: isHovered ? 1 : 0,
                                transition: 'opacity 0.1s ease-in-out 0.1s', // Delay the text fade-in
                            }}>
                                See GitTLDR in action
                            </span>
                        </div>
						</div>
                        {/* END: Animated Play Button */}

                    </div>

                    {/* The blurred gradient now acts as a glow BEHIND the image */}
                    <div style={{
                        position: 'absolute',
                        inset: '-3px',
                        zIndex: 1,
                        pointerEvents: 'none',
                        ...getAnimationStyle(2400, 'scale'),
                    }}>
                        {/* The original gradient layers */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '16px',
                            background: 'conic-gradient(rgb(133, 184, 255) 36deg, rgb(255, 201, 226) 54.385deg, rgba(255, 255, 255, 0) 90deg, rgba(255, 255, 255, 0) 270deg, rgb(128, 255, 210) 307.365deg, rgb(255, 255, 255) 324.718deg, rgb(133, 184, 255) 360deg)',
                            filter: 'blur(72px)',
                            opacity: 0.5,
                        }} />
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '16px',
                            background: 'conic-gradient(rgb(133, 184, 255) 36deg, rgb(255, 201, 226) 54.385deg, rgba(255, 255, 255, 0) 90deg, rgba(255, 255, 255, 0) 270deg, rgb(128, 255, 210) 307.365deg, rgb(255, 255, 255) 324.718deg, rgb(133, 184, 255) 360deg)',
                            filter: 'blur(32px)',
                            opacity: 0.75,
                        }} />
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '16px',
                            background: 'conic-gradient(rgb(133, 184, 255) 36deg, rgb(255, 201, 226) 54.385deg, rgba(255, 255, 255, 0) 90deg, rgba(255, 255, 255, 0) 270deg, rgb(128, 255, 210) 307.365deg, rgb(255, 255, 255) 324.718deg, rgb(133, 184, 255) 360deg)',
                            filter: 'blur(8px)',
                            opacity: 1,
                        }} />
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '16px',
                            background: 'conic-gradient(from 0deg at 50% 50%, rgb(255,255,255) 36deg, rgb(255,255,255) 54.38497019010389deg, rgba(255,255,255,0) 90deg, rgba(255,255,255,0) 270deg, rgb(255,255,255) 323.58150898843945deg, rgb(255,255,255) 360deg)',
                            filter: 'blur(2px)',
                            opacity: 1,
                        }} />
                    </div>
                </div>

                {/* Video Modal */}
                <ReactModal
                    isOpen={isVideoOpen}
                    onRequestClose={closeVideo}
                    style={{
                        overlay: {
                            background: "rgba(7, 10, 15, 0.4)",
                    		backdropFilter: "blur(20px)",
                    		WebkitBackdropFilter: "blur(20px)",
                            zIndex: 1000,
                        },
                        content: {
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: 'black',
                            border: 'none',
                            borderRadius: '10px',
                            padding: 0,
                            width: '60vw',
                                            maxWidth: '2000px',
                                            aspectRatio: '16/9',
                        },
                    }}
                >
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <iframe
                            title="Youtube Video"
                            src="https://www.youtube.com/embed/LzxLO-JsHg8?iv_load_policy=3&rel=0&modestbranding=1&playsinline=1&autoplay=0"
                            frameBorder="0"
                            allow="presentation; fullscreen; accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                zIndex: 4, // Ensure iframe is below the play button
                            }}
                        ></iframe>

                    </div>
                </ReactModal>
                    {/* Logos Section */}
                    <div id="logos" className="mt-28 w-full overflow-hidden mx-auto" style={{ maxWidth: '78rem' }}>
                        <div style={{outline: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', flexShrink: 0, transform: 'none'}}>
                            <p className="font-normal text-sm" style={{textAlign: 'center', color: 'rgba(255, 255, 255, 0.25)'}}>
                                The worlds largest companies trust the&nbsp;GitTLDR&nbsp;platform
                            </p>
                        </div>
                        <div className="scrolling-logos mt-8" style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
                            {/* Enhanced left gradient fade */}
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: 'calc(5%)',
                                background: 'linear-gradient(to right, rgb(7, 9, 14) 0%, rgba(7, 9, 14, 1) 30%, rgba(7, 9, 14, 0.5) 60%, transparent 100%)',
                                zIndex: 3,
                                pointerEvents: 'none'
                            }} />
                            {/* Enhanced right gradient fade */}
                            <div style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                bottom: 0,
                                width: 'calc(5%)',
                                background: 'linear-gradient(to left, rgb(7, 9, 14) 0%, rgba(7, 9, 14, 1) 30%, rgba(7, 9, 14, 0.5) 60%, transparent 100%)',
                                zIndex: 3,
                                pointerEvents: 'none'
                            }} />
                            <section style={{display: 'flex', width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%', placeItems: 'center', margin: 0, padding: 0, listStyleType: 'none', opacity: 1}}>
                                <ul style={{display: 'flex', height: '100%', maxHeight: '100%', placeItems: 'center', margin: 0, padding: 0, listStyleType: 'none', gap: '80px', flexDirection: 'row'}}>
                                    {/* Black and white company logos - seamless loop, left-to-right */}
                                    {[...Array(2)].map((_, iteration) => [
                                        <li key={`google-${iteration}`} style={{display: 'flex', alignItems: 'center'}}>
                                            <FaGoogle size={48} color="rgba(255, 255, 255, 0.25)" style={{filter: 'grayscale(1)'}} title="Google" />
                                        </li>,
                                        <li key={`microsoft-${iteration}`} style={{display: 'flex', alignItems: 'center'}}>
                                            <FaMicrosoft size={48} color="rgba(255, 255, 255, 0.25)" style={{filter: 'grayscale(1)'}} title="Microsoft" />
                                        </li>,
                                        <li key={`amazon-${iteration}`} style={{display: 'flex', alignItems: 'center'}}>
                                            <FaAmazon size={48} color="rgba(255, 255, 255, 0.25)" style={{filter: 'grayscale(1)'}} title="Amazon" />
                                        </li>,
                                        <li key={`apple-${iteration}`} style={{display: 'flex', alignItems: 'center'}}>
                                            <FaApple size={48} color="rgba(255, 255, 255, 0.25)" style={{filter: 'grayscale(1)'}} title="Apple" />
                                        </li>,
                                        <li key={`facebook-${iteration}`} style={{display: 'flex', alignItems: 'center'}}>
                                            <FaFacebookF size={48} color="rgba(255, 255, 255, 0.25)" style={{filter: 'grayscale(1)'}} title="Facebook" />
                                        </li>,
                                        <li key={`spotify-${iteration}`} style={{display: 'flex', alignItems: 'center'}}>
                                            <FaSpotify size={48} color="rgba(255, 255, 255, 0.25)" style={{filter: 'grayscale(1)'}} title="Spotify" />
                                        </li>,
                                        <li key={`paypal-${iteration}`} style={{display: 'flex', alignItems: 'center'}}>
                                            <FaPaypal size={48} color="rgba(255, 255, 255, 0.25)" style={{filter: 'grayscale(1)'}} title="Paypal" />
                                        </li>,
                                        <li key={`stripe-${iteration}`} style={{display: 'flex', alignItems: 'center'}}>
                                            <FaStripe size={48} color="rgba(255, 255, 255, 0.25)" style={{filter: 'grayscale(1)'}} title="Stripe" />
                                        </li>,
                                        <li key={`dribbble-${iteration}`} style={{display: 'flex', alignItems: 'center'}}>
                                            <FaDribbble size={48} color="rgba(255, 255, 255, 0.25)" style={{filter: 'grayscale(1)'}} title="Dribbble" />
                                        </li>,
                                        <li key={`github-${iteration}`} style={{display: 'flex', alignItems: 'center'}}>
                                            <FaGithub size={48} color="rgba(255, 255, 255, 0.25)" style={{filter: 'grayscale(1)'}} title="Github" />
                                        </li>,
                                        <li key={`slack-${iteration}`} style={{display: 'flex', alignItems: 'center'}}>
                                            <FaSlack size={48} color="rgba(255, 255, 255, 0.25)" style={{filter: 'grayscale(1)'}} title="Slack" />
                                        </li>,
                                        <li key={`dropbox-${iteration}`} style={{display: 'flex', alignItems: 'center'}}>
                                            <FaDropbox size={48} color="rgba(255, 255, 255, 0.25)" style={{filter: 'grayscale(1)'}} title="Dropbox" />
                                        </li>,
                                        <li key={`airbnb-${iteration}`} style={{display: 'flex', alignItems: 'center'}}>
                                            <FaAirbnb size={48} color="rgba(255, 255, 255, 0.25)" style={{filter: 'grayscale(1)'}} title="Airbnb" />
                                        </li>,
                                        <li key={`uber-${iteration}`} style={{display: 'flex', alignItems: 'center'}}>
                                            <FaUber size={48} color="rgba(255, 255, 255, 0.25)" style={{filter: 'grayscale(1)'}} title="Uber" />
                                        </li>,
                                        <li key={`figma-${iteration}`} style={{display: 'flex', alignItems: 'center'}}>
                                            <FaFigma size={48} color="rgba(255, 255, 255, 0.25)" style={{filter: 'grayscale(1)'}} title="Figma" />
                                        </li>,
                                        <li key={`trello-${iteration}`} style={{display: 'flex', alignItems: 'center'}}>
                                            <FaTrello size={48} color="rgba(255, 255, 255, 0.25)" style={{filter: 'grayscale(1)'}} title="Trello" />
                                        </li>,
                                        <li key={`jira-${iteration}`} style={{display: 'flex', alignItems: 'center'}}>
                                            <FaJira size={48} color="rgba(255, 255, 255, 0.25)" style={{filter: 'grayscale(1)'}} title="Jira" />
                                        </li>,
                                        <li key={`confluence-${iteration}`} style={{display: 'flex', alignItems: 'center'}}>
                                            <FaConfluence size={48} color="rgba(255, 255, 255, 0.25)" style={{filter: 'grayscale(1)'}} title="Confluence" />
                                        </li>,
                                        <li key={`bitbucket-${iteration}`} style={{display: 'flex', alignItems: 'center'}}>
                                            <FaBitbucket size={48} color="rgba(255, 255, 255, 0.25)" style={{filter: 'grayscale(1)'}} title="Bitbucket" />
                                        </li>,
                                        <li key={`gitlab-${iteration}`} style={{display: 'flex', alignItems: 'center'}}>
                                            <FaGitlab size={48} color="rgba(255, 255, 255, 0.25)" style={{filter: 'grayscale(1)'}} title="Gitlab" />
                                        </li>
                                    ])}
                                </ul>
                            </section>
                        </div>
                    </div>
                </section>
        </>
    );
}