"use client";

interface AIRepositoryIntelligenceProps {
    hoveredCard: string | null;
    setHoveredCard: (card: string | null) => void;
}

export default function AIRepositoryIntelligence({ hoveredCard, setHoveredCard }: AIRepositoryIntelligenceProps) {
    return (
        <div 
            className="lg:col-span-6 h-[400px] lg:h-[425px] relative group"
        >
            <div 
                className="w-full h-full p-6 lg:p-8 rounded-[16px] border transition-all duration-1000 relative overflow-hidden"
                style={{
                    borderTop: '2px solid rgba(255,255,255,0.15)',
                    borderLeft: '0.25px solid rgba(255,255,255,0.1)',
                    borderRight: '0.25px solid rgba(255,255,255,0.1)',
                    borderBottom: '0.25px solid rgba(255,255,255,0.1)',
                    background: 'conic-gradient(from 0deg at -8.4% -18.5%, #090b10 115.2deg,rgb(24,28,38) 144deg, rgb(9, 11, 16) 169.20000000000002deg)',
                    boxShadow: hoveredCard === 'ai-intelligence' 
                        ? '0 30px 60px -12px rgba(0, 0, 0, 0.4)' 
                        : 'rgba(0, 0, 0, 0.008) 0.592779px 0.592779px 0.838316px 0px, rgba(0, 0, 0, 0.027) 1.61429px 1.61429px 2.28296px 0px, rgba(0, 0, 0, 0.055) 3.5444px 3.5444px 5.01254px 0px, rgba(0, 0, 0, 0.125) 7.86777px 7.86777px 11.1267px 0px, rgba(0, 0, 0, 0.32) 20px 20px 28.2843px 0px',
                }}
            >
                
                
                <div className="relative z-10 flex flex-col justify-between h-full">
                    <div>
                        <h3 className="text-white text-2xl lg:text-3xl font-inter font-medium mb-3">
                            AI Repository Intelligence
                        </h3>
                        <p className="text-white/50 text-base lg:text-sm font-inter mb-6">
                            Transform code repositories into intelligent, searchable knowledge bases. 
                            AI analyzes commit patterns, generates summaries, and reveals code relationships.
                        </p>
                    </div>
                    
                    {/* Repository Analysis & Vector Search */}
                    <div className="relative" onMouseEnter={() => setHoveredCard('ai-intelligence')}
            onMouseLeave={() => setHoveredCard(null)} >

                        {/* Background image layer behind card content and borders */}
                                        <div
                                            className="absolute inset-0 rounded-[16px] z-0"
                                            style={{
                                                backgroundRepeat: 'repeat',
                                                backgroundPosition: 'left top',
                                                backgroundSize: '214px',
                                                backgroundImage: 'url("/landing/background.png?scale-down-to=512")',
                                                mask: 'radial-gradient(35% 45% at 75% 50%, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%), radial-gradient(25% 35% at 22% 35%, rgb(0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%)',
                                                opacity: 1,
                                                border: 0,
                                            }}
                                        />
                        {/* White Connecting Line */}
                        {/* Base line that's always visible with gradient */}
                            <div 
                                className="absolute top-[9.25rem] left-1/2 w-full h-[0.085rem] z-4"
                                style={{
                                    background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 25%, rgba(255,255,255,1) 80%, rgba(255,255,255,0) 100%)',
                                    transform: 'translate(-60%, -70%) translateX(4rem) translateY(1.5rem)',
                                }}
                            />
                        {/* Glowing overlay that creates the glow effect */}
                        <div 
                            className="absolute top-[9.25rem] left-[40%] w-full h-[0.085rem] z-5 overflow-hidden"
                            style={{
                                transform: 'translate(-50%, -70%) translateX(4rem) translateY(1.5rem)',
                            }}
                        >
                            <div
                                className="absolute top-0 h-full transition-all duration-1000 ease-out"
                                style={{
                                    background: 'rgb(255, 255, 255)',
                                    width: hoveredCard === 'ai-intelligence' ? '100%' : '0%',
                                    right: 0,
                                    filter: hoveredCard === 'ai-intelligence' 
                                        ? 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 8px rgba(255, 255, 255, 0.6)) drop-shadow(0 0 12px rgba(255, 255, 255, 0.4))'
                                        : 'none',
                                }}
                            />
                        </div>
                        
                        <div className="flex items-start justify-center gap-8 relative">
                            {/* Code Analysis - Commit Pattern Recognition (moved right and bottom) */}
                            <div className="relative w-72 flex-shrink-0 transform translate-x-16 translate-y-6">
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
                                        {/* Blue right border that expands from middle to top and bottom */}
                                        <div
                                            className="absolute right-0 w-[1px] transition-all duration-1000 ease-out"
                                            style={{
                                                background: 'linear-gradient(to bottom, rgba(51, 153, 255, 0) 0%, rgba(51, 153, 255, 1) 50%, rgba(51, 153, 255, 0) 100%)',
                                                height: hoveredCard === 'ai-intelligence' ? '75%' : '0%',
                                                top: '53%',
                                                transform: 'translateY(-50%)',
                                                filter: hoveredCard === 'ai-intelligence' 
                                                    ? 'drop-shadow(0 0 4px rgba(51, 153, 255, 0.6))' 
                                                    : 'none',
                                            }}
                                        />
                                        {/* Simple top and left gradient borders */}
                                         <div
                                             className="absolute top-0 left-0 right-0 h-[1.5px] rounded-t-[16px] pointer-events-none"
                                             style={{
                                                 background: 'linear-gradient(to right, rgba(148, 148, 148,1) 0%, rgba(148, 148, 148,0) 100%)',
                                             }}
                                         />
                                         <div
                                             className="absolute top-0 left-0 bottom-0 w-[1px] rounded-l-[16px] pointer-events-none"
                                             style={{
                                                 background: 'linear-gradient(to bottom, rgba(148, 148, 148,1) 0%, rgba(148, 148, 148,0) 100%)',
                                             }}
                                         />
                                         {/* Quarter-circle border for top-left corner */}
                                         <div
                                             className="absolute top-0 left-0 z-10 pointer-events-none"
                                             style={{
                                                 width: '16px',
                                                 height: '16px',
                                                 borderTopLeftRadius: '16px',
                                                 borderTop: '2px solid #949494',
                                                 borderLeft: '1px solid #949494',
                                                 background: 'transparent',
                                             }}
                                         />
                                        <div className="mb-3">
                                            <span className="text-white/60 text-xs font-light">Analysis</span>
                                            <h4 className="text-white text-md font-normal pt-0.5">Commit Pattern Recognition</h4>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            {/* Analysis Items - Added more steps */}
                                            <div 
                                                className="flex items-center gap-2 p-2 rounded-lg transition-all duration-200"
                                                style={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                                    boxShadow: 'rgba(255, 255, 255, 0.1) 0px 0px 20px 0px inset',
                                                }}
                                            >
                                                <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm1 0v12h12V4H4z" clipRule="evenodd"/>
                                                    <path d="M8 10a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                                                </svg>
                                                <span className="text-white/80 text-xs">Repository Scanned</span>
                                                <div
      style={{
        width: 16, // or any size you want
        height: 16,
        overflow: "hidden",
        display: "inline-block",
        borderRadius: '12px',
        boxShadow: 'rgb(177, 154, 137) 0px 0px 20px 0px',
        opacity: 1,
      }}
    >
      <img
        src="/landing/profile_1.png"
        alt="Circled"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
        loading="lazy"
        decoding="async"
      />
    </div>
                                            </div>
                                            
                                            <div 
                                                className="flex items-center gap-2 p-2 rounded-lg transition-all duration-200"
                                                style={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                                    boxShadow: 'rgba(255, 255, 255, 0.1) 0px 0px 20px 0px inset',
                                                }}
                                            >
                                                <svg className="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM4 6v6h12V6H4z"/>
                                                    <path d="M6 8a1 1 0 000 2h8a1 1 0 100-2H6z"/>
                                                </svg>
                                                <span className="text-white/80 text-xs">Code Relationships Mapped</span>
                                            </div>
                                            
                                            <div 
                                                className="flex items-center gap-2 p-2 rounded-lg transition-all duration-200"
                                                style={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                                    boxShadow: 'rgba(255, 255, 255, 0.1) 0px 0px 20px 0px inset',
                                                }}
                                            >
                                                <svg className="w-3 h-3 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zM5 4a1 1 0 011-1h8a1 1 0 011 1v12a1 1 0 01-1 1H6a1 1 0 01-1-1V4zm2 2a1 1 0 000 2h6a1 1 0 100-2H7zm0 4a1 1 0 100 2h3a1 1 0 100-2H7z" clipRule="evenodd"/>
                                                </svg>
                                                <span className="text-white/80 text-xs">Vector Embeddings Generated</span>
                                            </div>
                                            
                                            <div 
                                                className="flex items-center gap-2 p-2 rounded-lg transition-all duration-200"
                                                style={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                                    boxShadow: 'rgba(255, 255, 255, 0.1) 0px 0px 20px 0px inset',
                                                }}
                                            >
                                                <svg className="w-3 h-3 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                                </svg>
                                                <span className="text-white/80 text-xs">Pattern Analysis Complete</span>
                                            </div>
                                            
                                            <div 
                                                className="flex items-center gap-2 p-2 rounded-lg border-dashed border transition-all duration-200 opacity-35"
                                                style={{
                                                    borderColor: 'rgba(255, 255, 255, 0.1)',
                                                }}
                                            >
                                                <svg className="w-3 h-3 text-white/60 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span className="text-white/60 text-xs">Optimizing Index...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Search & Insights - Semantic Search (moved right and bottom) */}
                            <div className="relative w-72 flex-shrink-0 transform translate-x-16 translate-y-6">
                                    <div 
                                        className="rounded-[16px] transition-all duration-1000 relative"
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
                                    {/* Green Stroke */}
                                    <div 
                                        className="absolute inset-0 rounded-[16px]"
                                        style={{
                                            background: 'radial-gradient(50% 40% at 0% 50%, rgb(20, 184, 124) 0%, rgba(0, 255, 166, 0.2) 49.0991%, rgba(255, 255, 255, 0) 100%)',
                                        }}
                                    />
                                    
                                    <div 
                                        className="relative py-3 px-4 rounded-[16px]"
                                        style={{
                                            background: 'radial-gradient(75% 50% at 0% 0%, rgb(44, 45, 47) 0%, rgb(34, 35, 38) 50.4505%, rgb(22, 23, 25) 100%)',
                                        }}
                                    >
                                        {/* Blue left border that expands from middle to top and bottom */}
                                        <div
                                            className="absolute left-0 w-[1px] transition-all duration-1000 ease-out"
                                            style={{
                                                background: 'linear-gradient(to bottom, rgba(51, 153, 255, 0) 0%, rgba(51, 153, 255, 1) 50%, rgba(51, 153, 255, 0) 100%)',
                                                height: hoveredCard === 'ai-intelligence' ? '75%' : '0%',
                                                top: '53%',
                                                transform: 'translateY(-50%)',
                                                filter: hoveredCard === 'ai-intelligence' 
                                                    ? 'drop-shadow(0 0 4px rgba(51, 153, 255, 0.6))' 
                                                    : 'none',
                                            }}
                                        />
                                        {/* Simple top and left gradient borders */}
                                         <div
                                             className="absolute top-0 left-3.5 right-0 h-[1.5px] rounded-t-[16px] pointer-events-none"
                                             style={{
                                                 background: 'linear-gradient(to right, rgba(148, 148, 148,1) 0%, rgba(148, 148, 148,0) 100%)',
                                             }}
                                         />
                                         <div
                                             className="absolute top-3.5 left-0 bottom-0 w-[1px] rounded-l-[16px] pointer-events-none"
                                             style={{
                                                 background: 'linear-gradient(to bottom, rgba(148, 148, 148,1) 0%, rgba(148, 148, 148,0) 25%)',
                                             }}
                                         />
                                         {/* Quarter-circle border for top-left corner */}
                                         <div
                                             className="absolute top-0 left-0 z-10 pointer-events-none"
                                             style={{
                                                 width: '14px',
                                                 height: '14px',
                                                 borderTopLeftRadius: '16px',
                                                 borderTop: '2px solid #949494',
                                                 borderLeft: '1px solid #949494',
                                                 background: 'transparent',
                                             }}
                                         />
                                        <div className="mb-3">
                                            <span className="text-white/60 text-xs font-light">Search</span>
                                            <h4 className="text-white text-md font-normal pt-0.5">Semantic Code Search</h4>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            {/* Search Items - Added more steps */}
                                            <div 
                                                className="flex items-center gap-2 p-2 rounded-lg transition-all duration-200"
                                                style={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                                    boxShadow: 'rgba(255, 255, 255, 0.1) 0px 0px 20px 0px inset',
                                                }}
                                            >
                                                <svg className="w-3 h-3 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                                                </svg>
                                                <span className="text-white/80 text-xs">Query Processing</span>
                                            </div>
                                            
                                            <div 
                                                className="flex items-center gap-2 p-2 rounded-lg transition-all duration-200"
                                                style={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                                    boxShadow: 'rgba(255, 255, 255, 0.1) 0px 0px 20px 0px inset',
                                                }}
                                            >
                                                <svg className="w-3 h-3 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                                                </svg>
                                                <span className="text-white/80 text-xs">Context-Aware Results</span>
                                            </div>
                                            
                                            <div 
                                                className="flex items-center gap-2 p-2 rounded-lg transition-all duration-200"
                                                style={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                                    boxShadow: 'rgba(255, 255, 255, 0.1) 0px 0px 20px 0px inset',
                                                }}
                                            >
                                                <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                                </svg>
                                                <span className="text-white/80 text-xs">Semantic Ranking</span>
                                            </div>
                                            
                                            <div 
                                                className="flex items-center gap-2 p-2 rounded-lg transition-all duration-200"
                                                style={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                                    boxShadow: 'rgba(255, 255, 255, 0.1) 0px 0px 20px 0px inset',
                                                }}
                                            >
                                                <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                                </svg>
                                                <span className="text-white/80 text-xs">Sub-50ms Response</span>
                                                <div
      style={{
        width: 16, // or any size you want
        height: 16,
        overflow: "hidden",
        display: "inline-block",
        borderRadius: '12px',
        boxShadow: 'rgb(177, 154, 137) 0px 0px 20px 0px',
        opacity: 1,
      }}
    >
      <img
        src="/landing/profile_2.png"
        alt="Circled"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
        loading="lazy"
        decoding="async"
      />
    </div>
                                            </div>
                                            
                                            <div 
                                                className="flex items-center gap-2 p-2 rounded-lg transition-all duration-200 opacity-20"
                                                style={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                                    boxShadow: 'rgba(255, 255, 255, 0.1) 0px 0px 20px 0px inset',
                                                }}
                                            >
                                                <svg className="w-3 h-3 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                                                </svg>
                                                <span className="text-white/80 text-xs">Results Delivered</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Plus Icon Animation */}
                        <div 
                            className="absolute top-[8.5rem] left-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-1000"
                            style={{
                                background: hoveredCard === 'ai-intelligence'
                                    ? 'radial-gradient(50% 50%, rgb(0, 77, 153) 0%, rgb(0, 0, 0) 100%)'
                                    : 'radial-gradient(50% 50%, rgb(0, 0, 0) 0%, rgb(0, 0, 0) 100%)',
                                boxShadow: hoveredCard === 'ai-intelligence'
                                    ? 'rgba(51, 153, 255, 0.4) 0px 0px 2px 0px inset, rgba(51, 153, 255, 0.4) 0px 0px 80px 20px'
                                    : 'none',
                                transform: 'translateX(-50%) translateX(4rem) translateY(1.5rem)',
                            }}
                        >
                            <div className="w-2.5 h-2.5">
                                <svg viewBox="0 0 10 10" className="w-full h-full">
                                    <path 
                                        d="M 5.001 1.079 L 5.001 8.922 M 9.001 5 L 1.001 5" 
                                        fill="transparent" 
                                        strokeWidth="1.5" 
                                        stroke={hoveredCard === 'ai-intelligence' ? 'rgb(51, 153, 255)' : 'white'} 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
