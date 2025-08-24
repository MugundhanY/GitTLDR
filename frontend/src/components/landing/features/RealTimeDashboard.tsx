"use client";

interface RealTimeDashboardProps {
    hoveredCard: string | null;
    setHoveredCard: (card: string | null) => void;
}

export default function RealTimeDashboard({ hoveredCard, setHoveredCard }: RealTimeDashboardProps) {
    return (
        <div 
            className="lg:col-span-4 h-[400px] lg:h-[425px] relative group"
            onMouseEnter={() => setHoveredCard('dashboard')}
            onMouseLeave={() => setHoveredCard(null)}
        >
            <div 
                className="w-full h-full p-6 lg:p-8 rounded-[16px] border transition-all duration-1000 relative overflow-hidden"
                style={{
                    borderTop: '2px solid rgba(255,255,255,0.15)',
                    borderLeft: '0.25px solid rgba(255,255,255,0.1)',
                    borderRight: '0.25px solid rgba(255,255,255,0.1)',
                    borderBottom: '0.25px solid rgba(255,255,255,0.1)',
                    background: 'conic-gradient(from 0deg at -8.4% -18.5%, #090b10 115.2deg,rgb(24,28,38) 144deg, rgb(9, 11, 16) 169.20000000000002deg)',
                    boxShadow: hoveredCard === 'dashboard' 
                        ? '0 30px 60px -12px rgba(0, 0, 0, 0.4)' 
                        : 'rgba(0, 0, 0, 0.008) 0.592779px 0.592779px 0.838316px 0px, rgba(0, 0, 0, 0.027) 1.61429px 1.61429px 2.28296px 0px, rgba(0, 0, 0, 0.055) 3.5444px 3.5444px 5.01254px 0px, rgba(0, 0, 0, 0.125) 7.86777px 7.86777px 11.1267px 0px, rgba(0, 0, 0, 0.32) 20px 20px 28.2843px 0px',
                }}
            >
                <div className="relative z-10 flex flex-col justify-between h-full">
                    <div>
                        <h3 className="text-white text-2xl lg:text-3xl font-inter font-medium mb-3">
                            Real-Time Dashboard
                        </h3>
                        <p className="text-white/50 text-base lg:text-sm font-inter">
                            Visualize repository health, team velocity, and project insights 
                            through customizable, drag-and-drop dashboard widgets.
                        </p>
                    </div>
                    
                    {/* Dashboard Button */}
                    <div className="flex justify-center items-center h-full w-full">

                        {/* Masked dot pattern background */}
<div className="absolute inset-0 pointer-events-none mt-40">

  {/* Mask when hovered */}
  <div
    className={`
      absolute inset-0 transition-opacity duration-1000
      ${hoveredCard === 'dashboard' ? 'opacity-100' : 'opacity-0'}
    `}
    style={{
      WebkitMask: 'radial-gradient(50% 50%, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0) 100%), radial-gradient(50% 25%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%)',
      mask: 'radial-gradient(50% 50%, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0) 100%), radial-gradient(50% 25%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%)',
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

  {/* Default mask */}
  <div
    className={`
      absolute inset-0 transition-opacity duration-1000
      ${hoveredCard === 'dashboard' ? 'opacity-0' : 'opacity-100'}
    `}
    style={{
      WebkitMask: 'radial-gradient(50% 50%, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 100%), radial-gradient(50% 25%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%)',
      mask: 'radial-gradient(50% 50%, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 100%), radial-gradient(50% 25%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%)',
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

</div>



                        {/* Glow Layer (always hidden) */}
                        <div
                            className="absolute pointer-events-none"
                            style={{
                                borderRadius: '12px',
                                opacity: 0,
                                inset: 0,
                                zIndex: 2,
                            }}
                        >
                            <div style={{
                                background: 'conic-gradient(from 180deg at 50% 50%, rgba(255,255,255,0.7) 46.8deg, rgb(128,255,210) 72deg, rgba(255,255,255,0) 90deg, rgba(255,255,255,0) 270deg, rgb(133,184,254) 288deg, rgb(255,202,226) 309.6deg, rgb(255,255,255) 360deg)',
                                filter: 'blur(48px)',
                                borderRadius: '12px',
                                opacity: 0,
                                position: 'absolute',
                                inset: 0,
                            }} />
                            <div style={{
                                background: 'conic-gradient(from 180deg at 50% 50%, rgba(255,255,255,0.7) 46.8deg, rgb(128,255,210) 72deg, rgba(255,255,255,0) 90deg, rgba(255,255,255,0) 270deg, rgb(133,184,254) 288deg, rgb(255,202,226) 309.6deg, rgb(255,255,255) 360deg)',
                                filter: 'blur(32px)',
                                borderRadius: '12px',
                                opacity: 0,
                                position: 'absolute',
                                inset: 0,
                            }} />
                            <div style={{
                                background: 'conic-gradient(from 180deg at 50% 50%, rgba(255,255,255,0.7) 46.8deg, rgb(128,255,210) 72deg, rgba(255,255,255,0) 90deg, rgba(255,255,255,0) 270deg, rgb(133,184,254) 288deg, rgb(255,202,226) 309.6deg, rgb(255,255,255) 360deg)',
                                filter: 'blur(16px)',
                                borderRadius: '12px',
                                opacity: 0,
                                position: 'absolute',
                                inset: 0,
                            }} />
                            <div style={{
                                background: 'radial-gradient(50% 100% at 48.7% 0%, rgba(0,0,0,0.7) 0%, rgba(255,255,255,0) 100%)',
                                borderRadius: '12px',
                                opacity: 0,
                                position: 'absolute',
                                inset: 0,
                            }} />
                        </div>
                        {/* Conic Layer (main button) */}
                        <div 
                            className="relative flex items-center justify-center px-8 py-4 cursor-pointer"
                            style={{
                                backgroundColor: 'rgb(0, 0, 0)',
                                borderRadius: '16px',
                                boxShadow: 'rgba(255, 255, 255, 0.12) 0px -0.120725px 0.603627px 0px inset, rgb(255, 255, 255) 0px -1px 5px 0px inset, rgba(255, 255, 255, 0.73) 0px -0.796192px 0.796192px -0.9375px inset, rgba(255, 255, 255, 0.69) 0px -2.41451px 2.41451px -1.875px inset, rgba(255, 255, 255, 0.592) 0px -6.38265px 6.38265px -2.8125px inset, rgba(255, 255, 255, 0.25) 0px -20px 20px -3.75px inset, rgba(0, 0, 0, 0.5) 0px 20px 40px -10px',
                                opacity: 1,
                            }}
                        >
                            {/* Conic Glow Layers */}
                            <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: '12px', zIndex: 1 }}>
                                <div className="transition-all duration-1000" style={{
                                    background: 'conic-gradient(from 180deg at 50% 50%, rgba(255,255,255,0.6) 46.8deg, rgb(128,255,210) 72deg, rgba(255,255,255,0) 90deg, rgba(255,255,255,0) 270deg, rgb(133,184,254) 288deg, rgb(255,202,226) 309.6deg, rgb(255,255,255) 360deg)',
                                    filter: 'blur(32px)',
                                    borderRadius: '12px',
                                    opacity: hoveredCard === 'dashboard'? 1 : 0,
                                    position: 'absolute',
                                    inset: 0,
                                }} />
                                <div className="transition-all duration-1000" style={{
                                    background: 'conic-gradient(from 180deg at 50% 50%, rgba(255,255,255,0.6) 46.8deg, rgb(128,255,210) 72deg, rgba(255,255,255,0) 90deg, rgba(255,255,255,0) 270deg, rgb(133,184,254) 288deg, rgb(255,202,226) 309.6deg, rgb(255,255,255) 360deg)',
                                    filter: 'blur(16px)',
                                    borderRadius: '12px',
                                    opacity: hoveredCard === 'dashboard'? 1 : 0,
                                    position: 'absolute',
                                    inset: 0,
                                }} />
                                <div style={{
                                    background: 'conic-gradient(from 180deg at 50% 50%, rgba(255,255,255,0.6) 46.8deg, rgb(128,255,210) 72deg, rgba(255,255,255,0) 90deg, rgba(255,255,255,0) 270deg, rgb(133,184,254) 288deg, rgb(255,202,226) 309.6deg, rgb(255,255,255) 360deg)',
                                    filter: 'blur(8px)',
                                    borderRadius: '12px',
                                    opacity: 1,
                                    position: 'absolute',
                                    inset: 0,
                                }} />
                                <div style={{
                                    background: 'radial-gradient(50% 100% at 48.7% 0%, rgba(0,0,0,0.6) 0%, rgba(255,255,255,0) 100%)',
                                    borderRadius: '12px',
                                    opacity: 1,
                                    position: 'absolute',
                                    inset: 0,
                                }} />
                            </div>
                            {/* Button Content */}
                            <div className="relative flex items-center gap-3 z-10">
                                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" style={{ imageRendering: 'pixelated' }}>
                                    <path 
                                        d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" 
                                        fill="rgb(255,255,255)"
                                    />
                                </svg>
                                <span className="text-white text-lg font-medium">View Dashboard</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
