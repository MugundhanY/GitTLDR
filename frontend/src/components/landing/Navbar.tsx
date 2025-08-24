"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";

export default function Navbar() {
    const [productOpen, setProductOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isButtonHovered, setIsButtonHovered] = useState(false);
    
    const handleProductEnter = () => setProductOpen(true);
    const handleProductLeave = () => setProductOpen(false);
    
    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 1200);
        };
        
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    const handleMobileMenuToggle = () => {
        if (mobileMenuOpen) {
            // Closing animation - instantly hide links, then collapse navbar
            setIsAnimating(true);
            // Immediately hide all links without animation
            setMobileMenuOpen(false);
            // Allow navbar to collapse
            setTimeout(() => {
                setIsAnimating(false);
            }, 400);
        } else {
            // Opening animation
            setMobileMenuOpen(true);
            setIsAnimating(true);
            setTimeout(() => {
                setIsAnimating(false);
            }, 600); // Increased to account for staggered link animations
        }
    };

    const navigationLinks = [
        { href: "#features", label: "Features" },
        { href: "#benefits", label: "Benefits" },
        { href: "#integrations", label: "Integrations" },
        { href: "#about", label: "About" },
        { href: "#customers", label: "Customers" },
        { href: "#pricing", label: "Pricing" },
        { href: "/blog", label: "Blog" },
        { href: "/changelog", label: "Changelog" },
        { href: "#contact", label: "Contact" }
    ];
    const [menuContentHeight, setMenuContentHeight] = React.useState(0);
    const menuContentRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (isMobile && mobileMenuOpen && menuContentRef.current) {
            setMenuContentHeight(menuContentRef.current.scrollHeight);
        }
    }, [isMobile, mobileMenuOpen]);

    return (
        <>
            <style jsx>{`
                @keyframes slideInFromRight {
                    from {
                        transform: translateX(50px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                .link-enter {
                    opacity: 0;
                    animation: slideInFromRight 400ms ease-out forwards;
                }
                .navbar-container {
                    transition: height 800ms cubic-bezier(0.77, 0, 0.175, 1);
                    overflow: hidden;
                }
            `}</style>
            <nav
                className={`w-full px-5 ${isMobile ? 'py-8' : 'py-4'} relative shadow-lg navbar-container`}
                style={{
                    background: "rgba(7, 10, 15, 0.4)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    position: "fixed",
                    top: 0,
                    zIndex: 100,
                    width: '100%',
                    opacity: 1,
                    height: isMobile ? (mobileMenuOpen ? `${menuContentHeight + 64}px` : '64px') : 'auto',
                }}
            >
            <div className="max-w-7xl mx-auto px-8 relative flex items-center" style={{ height: 'auto' }}>
                {/* Static Logo and Menu Button - Always visible and in same position */}
                <div className="absolute left-0 flex items-center gap-3 flex-shrink-0 h-full z-20">
                    <Link href="#hero" className="flex items-center h-full" style={{opacity: 1}}>
                        <div style={{width: 34, display: 'flex', alignItems: 'center', position: "relative", borderRadius: "inherit", transform: 'translateY(1px)'}}>
                            <img
                                src="/GitTLDR_logo.png"
                                alt="Logo"
                                style={{width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover", objectPosition: "center"}}
                            />
                        </div>
                        <span className="ml-2 text-white font-bold tracking-wide flex items-center" style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.5rem', display: 'flex', alignItems: 'center', height: '2.8rem' }}>GitTLDR</span>
                    </Link>
                </div>
                {/* Static Mobile Menu Button - Always visible and in same position */}
                {isMobile && (
                    <div className="absolute right-0 flex items-center flex-shrink-0 z-20">
                        <button
                            onClick={handleMobileMenuToggle}
                            className="flex items-center justify-center w-10 h-10 rounded-lg"
                            style={{
                                backgroundColor: "rgba(255, 255, 255, 0)",
                                borderRadius: "8px",
                            }}
                        >
                            {!mobileMenuOpen ? (
                                <div className="flex flex-col gap-2">
                                    <div className="w-5 h-0.5 bg-white rounded"></div>
                                    <div className="w-5 h-0.5 bg-white rounded"></div>
                                </div>
                            ) : (
                                <div className="relative w-6 h-6 flex items-center justify-center">
                                    <div 
                                        className="absolute w-5 h-0.5 bg-white rounded"
                                        style={{
                                            transform: "rotate(45deg)",
                                            borderRadius: "5.55556% / 50%",
                                        }}
                                    ></div>
                                    <div 
                                        className="absolute w-5 h-0.5 bg-white rounded"
                                        style={{
                                            transform: "rotate(-45deg)",
                                            borderRadius: "5.55556% / 50%",
                                        }}
                                    ></div>
                                </div>
                            )}
                        </button>
                    </div>
                )}
                {/* Mobile Menu Content - Only navigation links, inside expanded navbar */}
                {isMobile && mobileMenuOpen && (
                    <div ref={menuContentRef} className="flex flex-col justify-start items-start w-full z-10" style={{ position: 'absolute', left: 0, top: 0, paddingTop: '45px', paddingLeft: '4px', background: 'rgba(7, 10, 15, 0.0)' }}>
                        {/* Navigation Links - Framer style */}
                        <div className="flex flex-col items-start space-y-3 w-full">
                            {navigationLinks.map((link, index) => (
                                <div
                                    key={link.href}
                                    className="block w-full link-enter"
                                    style={{
                                        animationDelay: `${index * 150}ms`,
                                        animationFillMode: 'both',
                                    }}
                                >
                                    <Link
                                        href={link.href}
                                        onClick={handleMobileMenuToggle}
                                        style={{
                                            fontSize: "18px",
                                            color: "#fff",
                                            textDecoration: "none",
                                            fontWeight: 350,
                                            padding: "0.5rem 0",
                                            borderRadius: "8px",
                                            display: "block",
                                            width: "100%",
                                        }}
                                        onMouseOver={e => { e.currentTarget.style.textDecoration = 'underline'; e.currentTarget.style.color = '#0099ff'; }}
                                        onMouseOut={e => { e.currentTarget.style.textDecoration = 'none'; e.currentTarget.style.color = '#fff'; }}
                                    >
                                        <span style={{display: 'flex', flexDirection: 'column', justifyContent: 'flex-start'}}>{link.label}</span>
                                    </Link>
                                </div>
                            ))}
                        </div>
                        {/* Framer-style CTA Button */}
                        <div 
                            className="mt-8 w-full link-enter"
                            style={{
                                animationDelay: `${navigationLinks.length * 150}ms`,
                                animationFillMode: 'both',
                            }}
                        >
                            <a
                                href="/auth"
                                className="w-full flex items-center justify-center"
                                style={{
                                    backgroundColor: isButtonHovered? "#3399FF" : "#fff",
                                    borderRadius: "12px",
                                    boxShadow: isButtonHovered 
                                    ? "rgba(255,255,255,0.75) 0px 0px 10px 1px inset, 0px 0px 16px 4px rgba(51,153,255,0.3)"
                                    : "rgba(255,255,255,0.75) 0px 0px 10px 1px inset, rgba(51,153,255,0) 0px 0px 30px -10px",
                                    color: isButtonHovered? "#rgb(0,55,37)" : "#003725",
                                    fontFamily: 'Inter, sans-serif',
                                    fontWeight: 700,
                                    fontSize: "18px",
                                    lineHeight: "1em",
                                    opacity: isButtonHovered? 0.85 : 1,
                                    height: '40px',
                                    width: '100%',
                                    textAlign: 'right',
                                    textDecoration: 'none',
                                }}
                            >
                                Get Started
                            </a>
                        </div>
                    </div>
                )}
                
                {/* Desktop Links centered */}
                {!isMobile && (
                    <div className="flex gap-8 items-center mx-auto py-4">
                        <div
                            className="flex items-center gap-1 cursor-pointer group relative"
                            onMouseEnter={handleProductEnter}
                            onMouseLeave={handleProductLeave}
                            onClick={() => setProductOpen((open) => !open)}
                            tabIndex={0}
                            style={{outline: 'none'}}
                        >
                            <span className="text-white text-sm opacity-75">Product</span>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{opacity: 1}}>
                                <path d="M3 5.5L7 9.5L11 5.5" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {productOpen && (
                                <div
                                    role="dialog"
                                    style={{
                                        position: 'absolute',
                                        top: '2.5rem',
                                        left: '-1.5rem',
                                        minWidth: '230px',
                                        backdropFilter: 'blur(20px)',
                                        backgroundColor: 'rgba(11, 13, 18, 0.6)',
                                        willChange: 'transform',
                                        borderRadius: '24px',
                                        boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 1px 0px inset, rgba(255, 255, 255, 0.05) 0px -1px 2px 0px inset',
                                        opacity: 1,
                                        transform: 'perspective(1200px)',
                                        transformOrigin: '50% 0% 0px',
                                        zIndex: 200,
                                        padding: '24px 18px 18px 18px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px',
                                    }}
                                >
                                    <Link href="#features" style={{display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.8, textDecoration: 'none', paddingBottom: '12px'}}>
                                        <div style={{backdropFilter: 'blur(5px)', background: 'radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,0.15) 0%, rgb(9,11,17) 100%)', borderRadius: '10px', boxShadow: 'rgba(255,255,255,0.6) 0px 0.5px 2px -1px inset, rgba(255,255,255,0.08) 0px 10px 10px -1px inset', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M11.605 10.647L9.814 8.857C9.571 8.613 9.448 8.492 9.317 8.427C9.066 8.303 8.772 8.303 8.522 8.427C8.39 8.492 8.268 8.613 8.024 8.857C7.78 9.102 7.658 9.224 7.593 9.355C7.468 9.606 7.468 9.9 7.593 10.15C7.658 10.282 7.78 10.404 8.024 10.648L9.815 12.438M11.605 10.647L16.976 16.019C17.22 16.262 17.342 16.385 17.407 16.517C17.532 16.767 17.532 17.061 17.407 17.312C17.342 17.442 17.22 17.565 16.976 17.809C16.732 18.053 16.609 18.175 16.478 18.24C16.228 18.365 15.933 18.365 15.683 18.24C15.552 18.175 15.429 18.053 15.185 17.809L9.814 12.438M11.605 10.647L9.814 12.438" stroke="#fff" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/><path d="M14.167 1.667L14.412 2.331C14.734 3.201 14.896 3.636 15.212 3.953C15.531 4.271 15.966 4.433 16.836 4.754L17.5 5L16.836 5.246C15.966 5.568 15.531 5.729 15.213 6.046C14.896 6.364 14.734 6.799 14.412 7.669L14.167 8.333L13.921 7.669C13.599 6.799 13.437 6.364 13.121 6.047C12.802 5.729 12.367 5.568 11.497 5.246L10.833 5L11.497 4.754C12.367 4.433 12.802 4.271 13.12 3.954C13.437 3.636 13.599 3.201 13.921 2.331Z M5 3.333L5.184 3.831C5.426 4.484 5.547 4.811 5.784 5.048C6.022 5.287 6.349 5.408 7.002 5.648L7.5 5.833L7.002 6.018C6.349 6.259 6.022 6.38 5.785 6.618C5.547 6.856 5.426 7.183 5.185 7.836L5 8.333L4.816 7.836C4.574 7.183 4.453 6.856 4.216 6.618C3.978 6.38 3.651 6.259 2.998 6.018L2.5 5.833L2.998 5.649C3.651 5.408 3.978 5.287 4.215 5.049C4.453 4.811 4.574 4.484 4.815 3.831Z" stroke="#fff" strokeWidth="1.25" strokeLinejoin="round"/></svg>
                                        </div>
                                        <span style={{fontSize: 14, color: 'rgba(255,255,255,0.75)'}}>Features</span>
                                    </Link>
                                    <Link href="#benefits" style={{display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.8, textDecoration: 'none'}}>
                                        <div style={{backdropFilter: 'blur(5px)', background: 'radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,0.15) 0%, rgb(9,11,17) 100%)', borderRadius: '10px', boxShadow: 'rgba(255,255,255,0.6) 0px 0.5px 2px -1px inset, rgba(255,255,255,0.08) 0px 10px 10px -1px inset', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M14.583 14.583L17.917 17.917M4.977 3.161L7.765 4.1C8.15 4.233 8.736 4.146 9.067 3.91L11.022 2.515C12.274 1.623 13.31 2.155 13.311 3.701L13.322 6.318C13.323 6.759 13.632 7.309 14.007 7.548L16.006 8.802C17.587 9.794 17.407 10.97 15.606 11.427L13.097 12.06C12.645 12.174 12.177 12.642 12.057 13.1L11.424 15.608C10.973 17.405 9.787 17.584 8.8 16.008L7.547 14.01C7.308 13.635 6.758 13.327 6.316 13.324L3.699 13.313C2.16 13.308 1.623 12.277 2.514 11.025L3.909 9.068C4.14 8.743 4.227 8.158 4.093 7.772L3.154 4.983C2.647 3.468 3.466 2.648 4.977 3.161Z" stroke="#fff" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/><path d="M14.21 9.262L14.597 8.875C16.246 7.226 16.246 4.552 14.597 2.903C12.948 1.254 10.274 1.254 8.625 2.903L6.237 5.292C4.588 6.941 4.588 9.614 6.237 11.263C7.886 12.912 10.559 12.912 12.208 11.263L12.381 11.091" stroke="#fff" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                        </div>
                                        <span style={{fontSize: 14, color: 'rgba(255,255,255,0.75)'}}>Benefits</span>
                                    </Link>
                                    <Link href="/integrations" style={{display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.8, textDecoration: 'none'}}>
                                        <div style={{backdropFilter: 'blur(5px)', background: 'radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,0.15) 0%, rgb(9,11,17) 100%)', borderRadius: '10px', boxShadow: 'rgba(255,255,255,0.6) 0px 0.5px 2px -1px inset, rgba(255,255,255,0.08) 0px 10px 10px -1px inset', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7.619 8.909L7.792 8.737C9.441 7.088 12.114 7.088 13.763 8.737C15.412 10.386 15.412 13.059 13.763 14.708L11.375 17.097C9.726 18.746 7.052 18.746 5.403 17.097C3.754 15.448 3.754 12.774 5.403 11.125L5.79 10.738" stroke="#fff" strokeWidth="1.25" strokeLinecap="round" strokeMiterlimit="10"/><path d="M14.21 9.262L14.597 8.875C16.246 7.226 16.246 4.552 14.597 2.903C12.948 1.254 10.274 1.254 8.625 2.903L6.237 5.292C4.588 6.941 4.588 9.614 6.237 11.263C7.886 12.912 10.559 12.912 12.208 11.263L12.381 11.091" stroke="#fff" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                        </div>
                                        <span style={{fontSize: 14, color: 'rgba(255,255,255,0.75)'}}>Integration</span>
                                    </Link>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-1 cursor-pointer group">
                            <span className="text-white text-sm opacity-75">Resources</span>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{opacity: 1}}>
                                <path d="M3 5.5L7 9.5L11 5.5" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <Link href="/about" className="text-white text-sm opacity-60 hover:opacity-100 transition">About</Link>
                        <Link href="#testimonial" className="text-white text-sm opacity-60 hover:opacity-100 transition">Customers</Link>
                        <Link href="#pricing" className="text-white text-sm opacity-60 hover:opacity-100 transition">Pricing</Link>
                        <Link href="/contact" className="text-white text-sm opacity-60 hover:opacity-100 transition">Contact</Link>
                    </div>
                )}
                
                {/* Desktop Button positioned relative to center */}
                {!isMobile && (
                    <div className="absolute right-0 flex items-center flex-shrink-0">
                        <Link
                            href="/auth"
                            className="px-6 rounded-xl font-bold text-right flex items-center justify-center"
                            onMouseEnter={() => setIsButtonHovered(true)}
                            onMouseLeave={() => setIsButtonHovered(false)}
                            style={{
                                backgroundColor: isButtonHovered? "#3399FF" : "#fff",
                                borderRadius: "12px",
                                boxShadow: isButtonHovered 
                                    ? "rgba(255,255,255,0.75) 0px 0px 10px 1px inset, 0px 0px 16px 4px rgba(51,153,255,0.3)"
                                    : "rgba(255,255,255,0.75) 0px 0px 10px 1px inset, rgba(51,153,255,0) 0px 0px 30px -10px",
                                color: isButtonHovered? "#rgb(0,55,37)" : "#003725",
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 750,
                                fontSize: "16px",
                                lineHeight: "1em",
                                opacity: isButtonHovered? 0.85 : 1,
                                height: '2.5rem',
                            }}
                        >
                            Get Started
                        </Link>
                    </div>
                )}
            </div>
            
            {/* Bottom line glass gradient */}
            <div
                style={{
                    position: "absolute",
                    left: 0,
                    bottom: 0,
                    width: "100%",
                    height: "1px",
                    background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)",
                    opacity: 1,
                    borderRadius: "0 0 20px 20px",
                }}
            />
        </nav>
        </>
    );
}