"use client";


import { MdEdit } from "react-icons/md";
import { FiMessageSquare } from "react-icons/fi";
import { useState } from "react";

interface TeamCollaborationHubProps {
    hoveredCard: string | null;
    setHoveredCard: (card: string | null) => void;
}

export default function TeamCollaborationHub({ hoveredCard, setHoveredCard }: TeamCollaborationHubProps) {
    return (
        <div 
            className="lg:col-span-8 h-[400px] lg:h-[425px] relative group"
        >
            <div 
                className="w-full h-full p-6 lg:p-8 rounded-[16px] border transition-all duration-1000 relative overflow-hidden"
                style={{
                    borderTop: '2px solid rgba(255,255,255,0.15)',
                    borderLeft: '0.25px solid rgba(255,255,255,0.1)',
                    borderRight: '0.25px solid rgba(255,255,255,0.1)',
                    borderBottom: '0.25px solid rgba(255,255,255,0.1)',
                    background: 'conic-gradient(from 0deg at -8.4% -18.5%, #090b10 115.2deg,rgb(24,28,38) 144deg, rgb(9, 11, 16) 169.20000000000002deg)',
                    boxShadow: hoveredCard === 'collaboration' 
                        ? '0 30px 60px -12px rgba(0, 0, 0, 0.4)' 
                        : 'rgba(0, 0, 0, 0.008) 0.592779px 0.592779px 0.838316px 0px, rgba(0, 0, 0, 0.027) 1.61429px 1.61429px 2.28296px 0px, rgba(0, 0, 0, 0.055) 3.5444px 3.5444px 5.01254px 0px, rgba(0, 0, 0, 0.125) 7.86777px 7.86777px 11.1267px 0px, rgba(0, 0, 0, 0.32) 20px 20px 28.2843px 0px',
                }}
            >
                <div className="relative z-10 flex flex-col justify-between h-full">
                    <div>
                        <h3 className="text-white text-2xl lg:text-3xl font-inter font-medium mb-3">
                            Team Collaboration Hub
                        </h3>
                        <p className="text-white/50 text-base lg:text-sm font-inter mb-10">
                            Real-time notifications, repository sharing, and team coordination. 
                            Know who&apos;s working on what with instant updates and context.
                        </p>
                    </div>
                
                        {/* Framer-style horizontal layout with custom content */}
                        <div className="flex w-full h-full px-4 items-stretch gap-8" onMouseEnter={() => setHoveredCard('collaboration')}
            onMouseLeave={() => setHoveredCard(null)}>
                <div
  className="absolute inset-0 opacity-100 pointer-events-none"
  style={{
    mask: 'radial-gradient(33% 38% at 68.4% 90%, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 100%), radial-gradient(19% 30.6452% at 18.2% 53.2%, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 100%)',
WebkitMask: 'radial-gradient(33% 38% at 68.4% 90%, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 100%), radial-gradient(19% 30.6452% at 18.2% 53.2%, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 100%)',

  }}
>
  <div
    className="absolute inset-0 rounded-inherit"
    style={{
      backgroundRepeat: 'repeat',
      backgroundPosition: 'left top',
      backgroundSize: '214px',
    backgroundImage: 'url("/landing/background.png?scale-down-to=512")',
      border: 0,
    }}
  />
</div>
                        {/* Repo - left most */}
                        <div className="flex-1 flex flex-col items-start space-y-3">
                            {/* Tag and count */}
                            <div className="flex items-center gap-2 mb-1">
                                <div 
                                    className={`px-3 py-1 rounded-full text-xs font-semibold shadow-lg transition-all duration-500 cursor-pointer ${hoveredCard==='collaboration' ? 'ring-4 ring-blue-400 ring-opacity-90' : ''}`}
                                    style={{
                                        backgroundColor: 'rgb(136, 184, 255)',
                                        color: 'rgb(0, 32, 94)',
                                        boxShadow: hoveredCard==='collaboration' ? '0 0 32px 0 rgba(136,184,255,0.95), 0 0 48px 0 rgba(136,184,255,0.7)' : '0 0 28px 0 rgba(136,184,255,0.25), 0 0 60px 0 rgba(136,184,255,0.15)',
                                        borderRadius: '15px',
                                    }}
                                >
                                    Repo
                                </div>
                                <span className="text-white/60 text-xs font-semibold">3</span>
                            </div>
                            {/* Card */}
                            <div className="relative w-full flex-shrink-0 transform">
                                    <div 
                                        className="rounded-[16px] transition-all duration-300 relative mb-5"
                                        style={{
                                            position: 'relative',
                                        }}
                                    >
                                    {/* Simplified gradient borders using pseudo-elements approach */}
                                    <div 
                                        className="absolute inset-0 rounded-[16px]"
                                        style={{
                                            background: `
                                                linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%) top/100% 1px no-repeat,
                                                linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%) left/1px 100% no-repeat
                                            `,
                                        }}
                                    />
                                    
                                    <div 
                                        className="relative py-3 px-4 rounded-[16px] overflow-hidden"
                                        style={{
                                            background: 'radial-gradient(75% 50% at 19% 13.8%, rgb(44, 45, 47) 0%, rgb(34, 35, 38) 50.4505%, rgb(22, 23, 25) 100%)',
                                        }}
                                    >
                                        {/* Simple top and left gradient borders */}
                                         <div
                                             className="absolute top-0 left-0 right-0 h-[0.5px] rounded-t-[16px] pointer-events-none"
                                             style={{
                                                 background: 'linear-gradient(to right, rgba(100, 100, 100,1) 0%, rgba(100, 100, 100,0) 100%)',
                                             }}
                                         />
                                         <div
                                             className="absolute top-0 left-0 bottom-0 w-[0.5px] rounded-l-[16px] pointer-events-none"
                                             style={{
                                                 background: 'linear-gradient(to bottom, rgba(100, 100, 100,1) 0%, rgba(100, 100, 100,0) 100%)',
                                             }}
                                         />
                                         {/* Quarter-circle border for top-left corner */}
                                         <div
                                             className="absolute top-0 left-0 z-10 pointer-events-none"
                                             style={{
                                                 width: '16px',
                                                 height: '16px',
                                                 borderTopLeftRadius: '16px',
                                                 borderTop: '0.5px solid rgba(100, 100, 100,1)',
                                                 borderLeft: '0.5px solid rgba(100, 100, 100,1)',
                                                 background: 'transparent',
                                             }}
                                         />
                                        <div className="mb-1">
                                            <h4 className="text-white text-md font-normal pt-0.5">Repository analyzed</h4>
                                            <span className="text-white/40 text-xs font-bold">AI insights generated</span>
                                            <div className="w-full h-[0.05rem] bg-white/10 rounded my-2" />
                                            <div className="flex items-center mt-2 justify-between w-full">
                                                <div className="relative w-12 h-8 flex-shrink-0">
                                                    <img src="/landing/profile_1.png" alt="Avatar 1" className="absolute left-0 top-0 w-8 h-8 rounded-full object-cover" style={{zIndex:1}} />
                                                    <img src="/landing/profile_2.png" alt="Avatar 2" className="absolute left-4 top-0 w-8 h-8 rounded-full object-cover" style={{zIndex:2}} />
                                                </div>
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <MdEdit className="w-5 h-5 cursor-pointer text-[rgb(100,100,100)] opacity-80 hover:opacity-100 transition-opacity" />
                                                    <FiMessageSquare className="w-5 h-5 cursor-pointer text-[rgb(100,100,100)] opacity-80 hover:opacity-100 transition-opacity" />

                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div 
                                        className="rounded-[16px] transition-all duration-300 relative"
                                        style={{
                                            position: 'relative',
                                        }}
                                    >
                                    {/* Simplified gradient borders using pseudo-elements approach */}
                                    <div 
                                        className="absolute inset-0 rounded-[16px]"
                                        style={{
                                            background: `
                                                linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%) top/100% 1px no-repeat,
                                                linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%) left/1px 100% no-repeat
                                            `,
                                        }}
                                    />
                                    
                                    <div 
                                        className="relative py-3 px-4 rounded-[16px] overflow-hidden"
                                        style={{
                                            background: 'radial-gradient(75% 50% at 19% 13.8%, rgb(44, 45, 47) 0%, rgb(34, 35, 38) 50.4505%, rgb(22, 23, 25) 100%)',
                                        }}
                                    >
                                        {/* Simple top and left gradient borders */}
                                         <div
                                             className="absolute top-0 left-0 right-0 h-[1px] rounded-t-[16px] pointer-events-none"
                                             style={{
                                                 background: 'linear-gradient(to right, rgba(100, 100, 100,1) 0%, rgba(100, 100, 100,0) 100%)',
                                             }}
                                         />
                                         <div
                                             className="absolute top-0 left-0 bottom-0 w-[0.5px] rounded-l-[16px] pointer-events-none"
                                             style={{
                                                 background: 'linear-gradient(to bottom, rgba(100, 100, 100,1) 0%, rgba(100, 100, 100,0) 100%)',
                                             }}
                                         />
                                         {/* Quarter-circle border for top-left corner */}
                                         <div
                                             className="absolute top-0 left-0 z-10 pointer-events-none"
                                             style={{
                                                 width: '16px',
                                                 height: '16px',
                                                 borderTopLeftRadius: '16px',
                                                 borderTop: '0.5px solid rgba(100, 100, 100,1)',
                                                 borderLeft: '0.5px solid rgba(100, 100, 100,1)',
                                                 background: 'transparent',
                                             }}
                                         />
                                        <div className="mb-1">
                                            <h4 className="text-white text-md font-normal pt-0.5">Meeting transcribed</h4>
                                            <span className="text-white/40 text-xs font-bold">Q&A extracted</span>
                                            <div className="w-full h-[0.05rem] bg-white/10 rounded my-2" />
                                            <div className="flex items-center mt-2 justify-between w-full">
                                                <div className="relative w-12 h-8 flex-shrink-0">
                                                    <img src="/landing/profile_1.png" alt="Avatar 1" className="absolute left-0 top-0 w-8 h-8 rounded-full object-cover" style={{zIndex:1}} />
                                                    <img src="/landing/profile_2.png" alt="Avatar 2" className="absolute left-4 top-0 w-8 h-8 rounded-full object-cover" style={{zIndex:2}} />
                                                </div>
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <MdEdit className="w-5 h-5 cursor-pointer text-[rgb(100,100,100)] opacity-80 hover:opacity-100 transition-opacity" />
                                                    <FiMessageSquare className="w-5 h-5 cursor-pointer text-[rgb(100,100,100)] opacity-80 hover:opacity-100 transition-opacity" />

                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Team Updates - center */}
                        <div className="flex-1 flex flex-col items-start space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div 
                                    className={`px-3 py-1 rounded-full text-xs font-semibold shadow-lg transition-all duration-500 cursor-pointer ${hoveredCard==='collaboration' ? 'ring-4 ring-green-300 ring-opacity-90' : ''}`}
                                    style={{
                                        backgroundColor: 'rgb(128,255,210)',
                                        color: 'rgb(0,94,64)',
                                        boxShadow: hoveredCard==='collaboration' ? '0 0 32px 0 rgba(128,255,210,0.95), 0 0 48px 0 rgba(128,255,210,0.7)' : '0 0 28px 0 rgba(128,255,210,0.25), 0 0 60px 0 rgba(128,255,210,0.15)',
                                        borderRadius: '15px',
                                    }}
                                >
                                    Team Updates
                                </div>
                                <span className="text-white/60 text-xs font-semibold">7</span>
                            </div>
                            {/* Card */}
                            <div className="relative w-full flex-shrink-0 transform">
                                <div
                                    className={`rounded-[16px] transition-all duration-700 relative mb-5`}
                                    style={{
                                        position: 'relative',
                                        zIndex: hoveredCard === 'collaboration' ? 20 : 1,
                                        transform: hoveredCard === 'collaboration'
                                            ? 'translateX(-40px) scale(1.12) rotate(-7deg)'
                                            : 'none',
                                        boxShadow: hoveredCard === 'collaboration'
                                            ? '0 8px 48px 0 rgba(128,255,210,0.25), 0 0 120px 0 rgba(128,255,210,0.15)'
                                            : undefined,
                                        width: hoveredCard === 'collaboration' ? '110%' : '100%',
                                    }}
                                >
                                    {/* Simplified gradient borders using pseudo-elements approach */}
                                    <div
                                        className="absolute inset-0 rounded-[16px]"
                                        style={{
                                            background: `
                                                linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%) top/100% 1px no-repeat,
                                                linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%) left/1px 100% no-repeat
                                            `,
                                        }}
                                    />
                                    <div
                                        className="relative py-3 px-4 rounded-[16px] overflow-hidden"
                                        style={{
                                            background: 'radial-gradient(75% 50% at 19% 13.8%, rgb(44, 45, 47) 0%, rgb(34, 35, 38) 50.4505%, rgb(22, 23, 25) 100%)',
                                        }}
                                    >
                                        {/* Simple top and left gradient borders */}
                                        <div
                                            className="absolute top-0 left-0 right-0 h-[0.5px] rounded-t-[16px] pointer-events-none"
                                            style={{
                                                background: 'linear-gradient(to right, rgba(100, 100, 100,1) 0%, rgba(100, 100, 100,0) 100%)',
                                            }}
                                        />
                                        <div
                                            className="absolute top-0 left-0 bottom-0 w-[0.5px] rounded-l-[16px] pointer-events-none"
                                            style={{
                                                background: 'linear-gradient(to bottom, rgba(100, 100, 100,1) 0%, rgba(100, 100, 100,0) 100%)',
                                            }}
                                        />
                                        {/* Quarter-circle border for top-left corner */}
                                        <div
                                            className="absolute top-0 left-0 z-10 pointer-events-none"
                                            style={{
                                                width: '16px',
                                                height: '16px',
                                                borderTopLeftRadius: '16px',
                                                borderTop: '0.5px solid rgba(100, 100, 100,1)',
                                                borderLeft: '0.5px solid rgba(100, 100, 100,1)',
                                                background: 'transparent',
                                            }}
                                        />
                                        <div className="mb-1">
                                            <h4 className="text-white text-md font-normal pt-0.5">Webhook triggered</h4>
                                            <span className="text-white/40 text-xs font-bold">Auto-processing started</span>
                                            <div className="w-full h-[0.05rem] bg-white/10 rounded my-2" />
                                            <div className="flex items-center mt-2 justify-between w-full">
                                                <div className="relative w-12 h-8 flex-shrink-0">
                                                    <img src="/landing/profile_3.png" alt="Avatar 3" className="absolute left-0 top-0 w-8 h-8 rounded-full object-cover" style={{zIndex:1}} />
                                                    <img src="/landing/profile_4.png" alt="Avatar 4" className="absolute left-4 top-0 w-8 h-8 rounded-full object-cover" style={{zIndex:2}} />
                                                </div>
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <MdEdit className="w-5 h-5 cursor-pointer text-[rgb(100,100,100)] opacity-80 hover:opacity-100 transition-opacity" />
                                                    <FiMessageSquare className="w-5 h-5 cursor-pointer text-[rgb(100,100,100)] opacity-80 hover:opacity-100 transition-opacity" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div 
                                        className="rounded-[16px] transition-all duration-300 relative"
                                        style={{
                                            position: 'relative',
                                        }}
                                    >
                                    {/* Simplified gradient borders using pseudo-elements approach */}
                                    <div 
                                        className="absolute inset-0 rounded-[16px]"
                                        style={{
                                            background: `
                                                linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%) top/100% 1px no-repeat,
                                                linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%) left/1px 100% no-repeat
                                            `,
                                        }}
                                    />
                                    
                                    <div 
                                        className="relative py-3 px-4 rounded-[16px] overflow-hidden"
                                        style={{
                                            background: 'radial-gradient(75% 50% at 19% 13.8%, rgb(44, 45, 47) 0%, rgb(34, 35, 38) 50.4505%, rgb(22, 23, 25) 100%)',
                                        }}
                                    >
                                        {/* Simple top and left gradient borders */}
                                         <div
                                             className="absolute top-0 left-0 right-0 h-[1px] rounded-t-[16px] pointer-events-none"
                                             style={{
                                                 background: 'linear-gradient(to right, rgba(100, 100, 100,1) 0%, rgba(100, 100, 100,0) 100%)',
                                             }}
                                         />
                                         <div
                                             className="absolute top-0 left-0 bottom-0 w-[0.5px] rounded-l-[16px] pointer-events-none"
                                             style={{
                                                 background: 'linear-gradient(to bottom, rgba(100, 100, 100,1) 0%, rgba(100, 100, 100,0) 100%)',
                                             }}
                                         />
                                         {/* Quarter-circle border for top-left corner */}
                                         <div
                                             className="absolute top-0 left-0 z-10 pointer-events-none"
                                             style={{
                                                 width: '16px',
                                                 height: '16px',
                                                 borderTopLeftRadius: '16px',
                                                 borderTop: '0.5px solid rgba(100, 100, 100,1)',
                                                 borderLeft: '0.5px solid rgba(100, 100, 100,1)',
                                                 background: 'transparent',
                                             }}
                                         />
                                        <div className="mb-1">
                                            <h4 className="text-white text-md font-normal pt-0.5">Code review completed</h4>
                                            <span className="text-white/40 text-xs font-bold">PR merged by Alice</span>
                                            <div className="w-full h-[0.05rem] bg-white/10 rounded my-2" />
                                            <div className="flex items-center mt-2 justify-between w-full">
                                                <div className="relative w-12 h-8 flex-shrink-0">
                                                    <img src="/landing/profile_3.png" alt="Avatar 3" className="absolute left-0 top-0 w-8 h-8 rounded-full object-cover" style={{zIndex:1}} />
                                                    <img src="/landing/profile_4.png" alt="Avatar 4" className="absolute left-4 top-0 w-8 h-8 rounded-full object-cover" style={{zIndex:2}} />
                                                </div>
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <MdEdit className="w-5 h-5 cursor-pointer text-[rgb(100,100,100)] opacity-80 hover:opacity-100 transition-opacity" />
                                                    <FiMessageSquare className="w-5 h-5 cursor-pointer text-[rgb(100,100,100)] opacity-80 hover:opacity-100 transition-opacity" />

                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Notifications - right most */}
                        <div className="flex-1 flex flex-col items-start space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div 
                                    className={`px-3 py-1 rounded-full text-xs font-semibold shadow-lg transition-all duration-500 cursor-pointer ${hoveredCard==='collaboration' ? 'ring-4 ring-pink-300 ring-opacity-90' : ''}`}
                                    style={{
                                        backgroundColor: 'rgb(255,178,199)',
                                        color: 'rgb(94,0,25)',
                                        boxShadow: hoveredCard==='collaboration' ? '0 0 32px 0 rgba(255,179,199,0.95), 0 0 48px 0 rgba(255,179,199,0.7)' : '0 0 28px 0 rgba(255,179,199,0.25), 0 0 60px 0 rgba(255,179,199,0.15)',
                                        borderRadius: '15px',
                                    }}
                                >
                                    Notifications
                                </div>
                                <span className="text-white/60 text-xs font-semibold">5</span>
                            </div>
                            {/* Card */}
                            <div className="relative w-full flex-shrink-0 transform">
                                    <div 
                                        className="rounded-[16px] transition-all duration-300 relative mb-5"
                                        style={{
                                            position: 'relative',
                                        }}
                                    >
                                    {/* Simplified gradient borders using pseudo-elements approach */}
                                    <div 
                                        className="absolute inset-0 rounded-[16px]"
                                        style={{
                                            background: `
                                                linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%) top/100% 1px no-repeat,
                                                linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%) left/1px 100% no-repeat
                                            `,
                                        }}
                                    />
                                    
                                    <div 
                                        className="relative py-3 px-4 rounded-[16px] overflow-hidden"
                                        style={{
                                            background: 'radial-gradient(75% 50% at 19% 13.8%, rgb(44, 45, 47) 0%, rgb(34, 35, 38) 50.4505%, rgb(22, 23, 25) 100%)',
                                        }}
                                    >
                                        {/* Simple top and left gradient borders */}
                                         <div
                                             className="absolute top-0 left-0 right-0 h-[0.5px] rounded-t-[16px] pointer-events-none"
                                             style={{
                                                 background: 'linear-gradient(to right, rgba(100, 100, 100,1) 0%, rgba(100, 100, 100,0) 100%)',
                                             }}
                                         />
                                         <div
                                             className="absolute top-0 left-0 bottom-0 w-[0.5px] rounded-l-[16px] pointer-events-none"
                                             style={{
                                                 background: 'linear-gradient(to bottom, rgba(100, 100, 100,1) 0%, rgba(100, 100, 100,0) 100%)',
                                             }}
                                         />
                                         {/* Quarter-circle border for top-left corner */}
                                         <div
                                             className="absolute top-0 left-0 z-10 pointer-events-none"
                                             style={{
                                                 width: '16px',
                                                 height: '16px',
                                                 borderTopLeftRadius: '16px',
                                                 borderTop: '0.5px solid rgba(100, 100, 100,1)',
                                                 borderLeft: '0.5px solid rgba(100, 100, 100,1)',
                                                 background: 'transparent',
                                             }}
                                         />
                                        <div className="mb-1">
                                            <h4 className="text-white text-md font-normal pt-0.5">New access request</h4>
                                            <span className="text-white/40 text-xs font-bold">Pending approval</span>
                                            <div className="w-full h-[0.05rem] bg-white/10 rounded my-2" />
                                            <div className="flex items-center mt-2 justify-between w-full">
                                                <div className="relative w-12 h-8 flex-shrink-0">
                                                    <img src="/landing/profile_5.png" alt="Avatar 5" className="absolute left-0 top-0 w-8 h-8 rounded-full object-cover" style={{zIndex:1}} />
                                                    <img src="/landing/profile_6.png" alt="Avatar 6" className="absolute left-4 top-0 w-8 h-8 rounded-full object-cover" style={{zIndex:2}} />
                                                </div>
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <MdEdit className="w-5 h-5 cursor-pointer text-[rgb(100,100,100)] opacity-80 hover:opacity-100 transition-opacity" />
                                                    <FiMessageSquare className="w-5 h-5 cursor-pointer text-[rgb(100,100,100)] opacity-80 hover:opacity-100 transition-opacity" />

                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div 
                                        className="rounded-[16px] transition-all duration-300 relative"
                                        style={{
                                            position: 'relative',
                                        }}
                                    >
                                    {/* Simplified gradient borders using pseudo-elements approach */}
                                    <div 
                                        className="absolute inset-0 rounded-[16px]"
                                        style={{
                                            background: `
                                                linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%) top/100% 1px no-repeat,
                                                linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%) left/1px 100% no-repeat
                                            `,
                                        }}
                                    />
                                    
                                    <div 
                                        className="relative py-3 px-4 rounded-[16px] overflow-hidden"
                                        style={{
                                            background: 'radial-gradient(75% 50% at 19% 13.8%, rgb(44, 45, 47) 0%, rgb(34, 35, 38) 50.4505%, rgb(22, 23, 25) 100%)',
                                        }}
                                    >
                                        {/* Simple top and left gradient borders */}
                                         <div
                                             className="absolute top-0 left-0 right-0 h-[1px] rounded-t-[16px] pointer-events-none"
                                             style={{
                                                 background: 'linear-gradient(to right, rgba(100, 100, 100,1) 0%, rgba(100, 100, 100,0) 100%)',
                                             }}
                                         />
                                         <div
                                             className="absolute top-0 left-0 bottom-0 w-[0.5px] rounded-l-[16px] pointer-events-none"
                                             style={{
                                                 background: 'linear-gradient(to bottom, rgba(100, 100, 100,1) 0%, rgba(100, 100, 100,0) 100%)',
                                             }}
                                         />
                                         {/* Quarter-circle border for top-left corner */}
                                         <div
                                             className="absolute top-0 left-0 z-10 pointer-events-none"
                                             style={{
                                                 width: '16px',
                                                 height: '16px',
                                                 borderTopLeftRadius: '16px',
                                                 borderTop: '0.5px solid rgba(100, 100, 100,1)',
                                                 borderLeft: '0.5px solid rgba(100, 100, 100,1)',
                                                 background: 'transparent',
                                             }}
                                         />
                                        <div className="mb-1">
                                            <h4 className="text-white text-md font-normal pt-0.5">Team collaboration enabled</h4>
                                            <span className="text-white/40 text-xs font-bold">Workspace shared successfully</span>
                                            <div className="w-full h-[0.05rem] bg-white/10 rounded my-2" />
                                            <div className="flex items-center mt-2 justify-between w-full">
                                                <div className="relative w-12 h-8 flex-shrink-0">
                                                    <img src="/landing/profile_5.png" alt="Avatar 5" className="absolute left-0 top-0 w-8 h-8 rounded-full object-cover" style={{zIndex:1}} />
                                                    <img src="/landing/profile_6.png" alt="Avatar 6" className="absolute left-4 top-0 w-8 h-8 rounded-full object-cover" style={{zIndex:2}} />
                                                </div>
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <MdEdit className="w-5 h-5 cursor-pointer text-[rgb(100,100,100)] opacity-80 hover:opacity-100 transition-opacity" />
                                                    <FiMessageSquare className="w-5 h-5 cursor-pointer text-[rgb(100,100,100)] opacity-80 hover:opacity-100 transition-opacity" />

                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
