"use client";

import { useTheme } from "@/contexts/ThemeContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

export default function Navbar() {
    const { theme, setTheme, actualTheme } = useTheme();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isButtonHovered, setIsButtonHovered] = useState(false);
    const [scrolledPastHero, setScrolledPastHero] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 1200);
        };
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);

        // Scroll listener for hero section
        const handleScroll = () => {
            // Adjust this value to match your hero section height (e.g., 600)
            const heroHeight = document.getElementById('hero')?.offsetHeight || 600;
            setScrolledPastHero(window.scrollY > heroHeight);
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll();

        return () => {
            window.removeEventListener('resize', checkScreenSize);
            window.removeEventListener('scroll', handleScroll);
        };
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
        { href: "/about", label: "About" },
        { href: "#testimonial", label: "Customers" },
        { href: "#pricing", label: "Pricing" },
        { href: "/contact", label: "Contact" }
    ];
    const [menuContentHeight, setMenuContentHeight] = React.useState(0);
    const menuContentRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (isMobile && mobileMenuOpen && menuContentRef.current) {
            setMenuContentHeight(menuContentRef.current.scrollHeight);
        }
    }, [isMobile, mobileMenuOpen]);

    const rawPathname = usePathname();
    const pathname = rawPathname ?? '/';
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
                    <Link href={pathname !== '/' ? ("/#hero") : ("#hero")} className="flex items-center h-full" style={{opacity: 1}}>
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
                            {pathname !== '/' ? (
                                <>
                                    <Link href="/#features" onClick={handleMobileMenuToggle} className="text-white text-sm opacity-60 hover:opacity-100 transition">Features</Link>
                                    <Link href="/#benefits" onClick={handleMobileMenuToggle} className="text-white text-sm opacity-60 hover:opacity-100 transition">Benefits</Link>
                                    <Link href="/about" onClick={handleMobileMenuToggle} className="text-white text-sm opacity-60 hover:opacity-100 transition">About</Link>
                                    <Link href="/#testimonial" onClick={handleMobileMenuToggle} className="text-white text-sm opacity-60 hover:opacity-100 transition">Customers</Link>
                                    <Link href="/#pricing" onClick={handleMobileMenuToggle} className="text-white text-sm opacity-60 hover:opacity-100 transition">Pricing</Link>
                                    <Link href="/contact" onClick={handleMobileMenuToggle} className="text-white text-sm opacity-60 hover:opacity-100 transition">Contact</Link>
                                </>
                            ) : (
                                <>
                                    <Link href="#features" onClick={handleMobileMenuToggle} className="text-white text-sm opacity-60 hover:opacity-100 transition">Features</Link>
                                    <Link href="#benefits" onClick={handleMobileMenuToggle} className="text-white text-sm opacity-60 hover:opacity-100 transition">Benefits</Link>
                                    <Link href="/about" onClick={handleMobileMenuToggle} className="text-white text-sm opacity-60 hover:opacity-100 transition">About</Link>
                                    <Link href="#testimonial" onClick={handleMobileMenuToggle} className="text-white text-sm opacity-60 hover:opacity-100 transition">Customers</Link>
                                    <Link href="#pricing" onClick={handleMobileMenuToggle} className="text-white text-sm opacity-60 hover:opacity-100 transition">Pricing</Link>
                                    <Link href="/contact" onClick={handleMobileMenuToggle} className="text-white text-sm opacity-60 hover:opacity-100 transition">Contact</Link>
                                </>
                            )}
                        </div>
                        {/* Framer-style CTA Button */}
                        <div 
                            className="mt-8 w-full link-enter"
                            style={{
                                animationDelay: `${navigationLinks.length * 150}ms`,
                                animationFillMode: 'both',
                            }}
                        >
                            {pathname !== '/auth' && (<a
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
                            </a>)}
                        </div>
                    </div>
                )}
                
                {/* Desktop Links centered */}
                {!isMobile && (
                    <div className="flex gap-8 items-center mx-auto py-4">
                        {pathname !== '/' ? (
                            <>
                                <Link href="/#features" className="text-white text-sm opacity-60 hover:opacity-100 transition">Features</Link>
                                <Link href="/#benefits" className="text-white text-sm opacity-60 hover:opacity-100 transition">Benefits</Link>
                                <Link href="/about" className="text-white text-sm opacity-60 hover:opacity-100 transition">About</Link>
                                <Link href="/#testimonial" className="text-white text-sm opacity-60 hover:opacity-100 transition">Customers</Link>
                                <Link href="/#pricing" className="text-white text-sm opacity-60 hover:opacity-100 transition">Pricing</Link>
                                <Link href="/contact" className="text-white text-sm opacity-60 hover:opacity-100 transition">Contact</Link>
                            </>
                        ) : (
                            <>
                                <Link href="#features" className="text-white text-sm opacity-60 hover:opacity-100 transition">Features</Link>
                                <Link href="#benefits" className="text-white text-sm opacity-60 hover:opacity-100 transition">Benefits</Link>
                                <Link href="/about" className="text-white text-sm opacity-60 hover:opacity-100 transition">About</Link>
                                <Link href="#testimonial" className="text-white text-sm opacity-60 hover:opacity-100 transition">Customers</Link>
                                <Link href="#pricing" className="text-white text-sm opacity-60 hover:opacity-100 transition">Pricing</Link>
                                <Link href="/contact" className="text-white text-sm opacity-60 hover:opacity-100 transition">Contact</Link>
                            </>
                        )}
                    </div>
                )}
                
                {/* Desktop Button positioned relative to center */}
                {!isMobile && pathname !== '/auth' && (
                    <div className="absolute right-0 flex items-center flex-shrink-0">
                        <Link
                            href="/auth"
                            className="px-6 rounded-xl font-bold text-right flex items-center justify-center"
                            onMouseEnter={() => setIsButtonHovered(true)}
                            onMouseLeave={() => setIsButtonHovered(false)}
                            style={{
                                backgroundColor: (isButtonHovered || scrolledPastHero) ? "#3399FF" : "#fff",
                                borderRadius: "12px",
                                boxShadow: (isButtonHovered)
                                    ? "rgba(255,255,255,0.75) 0px 0px 10px 1px inset, 0px 0px 16px 4px rgba(51,153,255,0.5)"
                                    : "rgba(255,255,255,0.75) 0px 0px 10px 1px inset, rgba(51,153,255,0) 0px 0px 30px -10px",
                                color: (isButtonHovered || scrolledPastHero) ? "#003725" : "#003725",
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 750,
                                fontSize: "16px",
                                lineHeight: "1em",
                                opacity: (isButtonHovered || scrolledPastHero) ? 0.85 : 1,
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