"use client";

interface MeetingIntelligenceProps {
    hoveredCard: string | null;
    setHoveredCard: (card: string | null) => void;
}

export default function MeetingIntelligence({ hoveredCard, setHoveredCard }: MeetingIntelligenceProps) {
    return (
        <div 
            className="lg:col-span-6 h-[400px] lg:h-[425px] relative group"
        >
            <div 
                className="w-full h-full p-6 lg:p-8 rounded-[16px] border transition-all duration-500 relative overflow-hidden"
                style={{
                    borderTop: '2px solid rgba(255,255,255,0.15)',
                    borderLeft: '0.25px solid rgba(255,255,255,0.1)',
                    borderRight: '0.25px solid rgba(255,255,255,0.1)',
                    borderBottom: '0.25px solid rgba(255,255,255,0.1)',
                    background: 'conic-gradient(from 0deg at -8.4% -18.5%, #090b10 115.2deg,rgb(24,28,38) 144deg, rgb(9, 11, 16) 169.20000000000002deg)',
                    boxShadow: hoveredCard === 'meeting-intelligence' 
                        ? '0 30px 60px -12px rgba(0, 0, 0, 0.4)' 
                        : 'rgba(0, 0, 0, 0.008) 0.592779px 0.592779px 0.838316px 0px, rgba(0, 0, 0, 0.027) 1.61429px 1.61429px 2.28296px 0px, rgba(0, 0, 0, 0.055) 3.5444px 3.5444px 5.01254px 0px, rgba(0, 0, 0, 0.125) 7.86777px 7.86777px 11.1267px 0px, rgba(0, 0, 0, 0.32) 20px 20px 28.2843px 0px',
                }}
            >
                <div className="relative z-10 flex flex-col h-full">
                    {/* Header Section */}
                    <div className="mb-4">
                        <h3 className="text-white text-2xl lg:text-3xl font-inter font-medium mb-3">
                            Meeting Intelligence
                        </h3>
                        <p className="text-white/50 text-base lg:text-sm font-inter mb-6">
                            Record development meetings, auto-transcribe discussions, and link 
                            decisions directly to repository changes and code context.
                        </p>
                        
                        {/* Voice Waves & Microphone positioned directly under subheading */}
                        <div 
                            className="relative mt-6"
                            onMouseEnter={() => setHoveredCard('meeting-intelligence')}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            {/* Voice Waves and Microphone at same Y level */}
                            <div className="relative flex items-center justify-center h-32">
                                {/* Voice Waves Background - Same level as microphone */}
                                {/* Highlight Glow with Smooth Mask Transition */}
<div className="absolute inset-x-0 inset-y-0 opacity-80 pointer-events-none">
  {/* Hovered Mask Version */}
  <div
    className={`
      absolute inset-0 transition-opacity duration-[1000ms] ease-in-out
      ${hoveredCard === 'meeting-intelligence' ? 'opacity-100' : 'opacity-0'}
    `}
    style={{
      filter: 'drop-shadow(rgb(255, 255, 255) 0px 0px 5px)',
      WebkitMask: 'radial-gradient(circle at center, rgb(0, 0, 0) 30%, rgba(0, 0, 0, 1) 60%, rgba(0, 0, 0, 0) 100%)',
      mask: 'radial-gradient(circle at center, rgb(0, 0, 0) 30%, rgba(0, 0, 0, 1) 60%, rgba(0, 0, 0, 0) 100%)',
    }}
  >
    <div
      className="absolute inset-0"
      style={{
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'contain',
        backgroundImage:
          'url("/landing/wave.png?scale-down-to=1024")',
      }}
    />
  </div>

  {/* Default Mask Version */}
  <div
    className={`
      absolute inset-0 transition-opacity duration-[1000ms] ease-in-out
      ${hoveredCard === 'meeting-intelligence' ? 'opacity-0' : 'opacity-100'}
    `}
    style={{
      filter: 'drop-shadow(rgb(255, 255, 255) 0px 0px 5px)',
      WebkitMask: 'radial-gradient(50% 100%, rgb(0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%)',
      mask: 'radial-gradient(50% 100%, rgb(0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%)',
    }}
  >
    <div
      className="absolute inset-0"
      style={{
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'contain',
        backgroundImage:
          'url("/landing/wave.png?scale-down-to=1024")',
      }}
    />
  </div>
</div>


                                {/* Microphone Button - Same level as waves */}
                                <div className="relative z-10">
                                    <div className="relative">
                                        {/* Light cones emitting from button */}
                                        <div className="absolute inset-0 pointer-events-none">
                                            {/* White cone - center downward */}
                                            <div
                                                className="absolute"
                                                style={{
                                                    top: '42px',
                                                    left: '5px',
                                                    width: '0px',
                                                    height: '0px',
                                                    borderLeft: '55px solid transparent',
                                                    borderRight: '55px solid transparent',
                                                    borderTop: '175px solid rgba(255,255,255,0.5)',
                                                    filter: 'blur(25px)',
                                                    opacity: 1,
                                                    transform: 'rotate(25deg)',
                                                    transformOrigin: 'top center',
                                                }}
                                            />
                                            
                                            {/* Cyan cone - angled left */}
                                            <div
                                                className="absolute"
                                                style={{
                                                    top: '50px',
                                                    left: '-5px',
                                                    width: '0px',
                                                    height: '0px',
                                                    borderLeft: '15px solid transparent',
                                                    borderRight: '15px solid transparent',
                                                    borderTop: '130px solid rgba(128,255,210,0.65)',
                                                    filter: 'blur(20px)',
                                                    opacity: 1,
                                                    transform: 'rotate(40deg)',
                                                    transformOrigin: 'top center',
                                                }}
                                            />
                                            
                                            {/* Blue cone - angled right */}
                                            <div
                                                className="absolute"
                                                style={{
                                                    top: '42px',
                                                    left: '18px',
                                                    width: '0px',
                                                    height: '0px',
                                                    borderLeft: '20px solid transparent',
                                                    borderRight: '20px solid transparent',
                                                    borderTop: '160px solid rgba(133,184,254,0.8)',
                                                    filter: 'blur(20px)',
                                                    opacity: 0.85,
                                                    transform: 'rotate(-40deg)',
                                                    transformOrigin: 'top center',
                                                }}
                                            />
                                            
                                            {/* Pink cone - angled far right */}
                                            <div
                                                className="absolute"
                                                style={{
                                                    top: '55px',
                                                    left: '5px',
                                                    width: '0px',
                                                    height: '0px',
                                                    borderLeft: '40px solid transparent',
                                                    borderRight: '40px solid transparent',
                                                    borderTop: '140px solid rgba(255,202,226,0.75)',
                                                    filter: 'blur(20px)',
                                                    opacity: 1,
                                                    transform: 'rotate(-30deg)',
                                                    transformOrigin: 'top center',
                                                }}
                                            />
                                        </div>

                                        {/* Button */}
                                        <div 
                                            className="relative rounded-full flex items-center justify-center transition-all duration-1000"
                                            style={{
                                                width: '85px',
                                                height: '85px',
                                                backgroundColor: 'rgb(0, 0, 0)',
                                                borderRadius: '100%',
                                                boxShadow: hoveredCard === 'meeting-intelligence' ? 'rgb(255, 255, 255) 0px -6px 9px 1px inset, rgba(255, 255, 255, 1) 0px 8px 10px 0px' : 'rgb(255, 255, 255) 0px -6px 9px 1px inset, rgba(0, 0, 0, 1) 0px 8px 15px 0px',
                                                opacity: 1,
                                            }}
                                        >
                                            {/* Inner Conic Background */}
                                            <div 
                                                className="absolute inset-2 rounded-full"
                                                style={{
                                                    borderRadius: '100%',
                                                    opacity: 1,
                                                }}
                                            >
                                                {/* Conic Layers */}
                                                <div
                                                    className="absolute inset-0"
                                                    style={{
                                                        background: 'conic-gradient(from 180deg at 50% 87.6%, rgba(255, 255, 255, 0.6) 90deg, rgb(128, 255, 210) 115.2deg, rgba(255, 255, 255, 0) 144deg, rgba(255, 255, 255, 0) 216deg, rgb(133, 184, 254) 244.8deg, rgb(255, 202, 226) 270deg, rgb(255, 255, 255) 360deg)',
                                                        borderRadius: '12px',
                                                        filter: 'blur(12px)',
                                                        opacity: 1,
                                                    }}
                                                />
                                                <div
                                                    className="absolute inset-0"
                                                    style={{
                                                        background: 'conic-gradient(from 180deg at 50% 87.6%, rgba(255, 255, 255, 0.6) 90deg, rgb(128, 255, 210) 115.2deg, rgba(255, 255, 255, 0) 144deg, rgba(255, 255, 255, 0) 216deg, rgb(133, 184, 254) 244.8deg, rgb(255, 202, 226) 270deg, rgb(255, 255, 255) 360deg)',
                                                        borderRadius: '12px',
                                                        filter: 'blur(12px)',
                                                        opacity: 1,
                                                    }}
                                                />
                                                <div
                                                    className="absolute inset-0"
                                                    style={{
                                                        background: 'conic-gradient(from 180deg at 50% 87.6%, rgba(255, 255, 255, 0.6) 90deg, rgb(128, 255, 210) 115.2deg, rgba(255, 255, 255, 0) 144deg, rgba(255, 255, 255, 0) 216deg, rgb(133, 184, 254) 244.8deg, rgb(255, 202, 226) 270deg, rgb(255, 255, 255) 360deg)',
                                                        borderRadius: '12px',
                                                        filter: 'blur(4px)',
                                                        opacity: 1,
                                                    }}
                                                />
                                            </div>

                                            {/* Microphone Icon */}
                                            <div 
                                                className="relative z-10"
                                                style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    opacity: 1,
                                                }}
                                            >
                                                <svg 
                                                    viewBox="0 0 32 32" 
                                                    className="w-full h-full"
                                                    style={{
                                                        imageRendering: 'pixelated',
                                                    }}
                                                >
                                                    <g transform="translate(5.467 3.283)">
                                                        <path 
                                                            d="M 20.293 11.415 C 20.293 17.018 15.75 21.561 10.146 21.561 M 10.146 21.561 C 4.543 21.561 0 17.018 0 11.415 M 10.146 21.561 L 10.146 25.366 M 10.146 25.366 L 13.951 25.366 M 10.146 25.366 L 6.341 25.366 M 16.488 6.341 L 16.488 11.415 C 16.488 14.917 13.649 17.756 10.146 17.756 C 6.644 17.756 3.805 14.917 3.805 11.415 L 3.805 6.341 C 3.805 2.839 6.644 0 10.146 0 C 13.649 0 16.488 2.839 16.488 6.341 Z" 
                                                            fill="transparent" 
                                                            strokeWidth="1.9" 
                                                            stroke="rgb(255, 255, 255)" 
                                                            strokeLinecap="round" 
                                                            strokeMiterlimit="10"
                                                        />
                                                    </g>
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 8 Profile Pictures in 5-column structured grid */}
                            <div className="relative mt-8 w-full px-4">
                                <div className="flex items-center justify-between w-full">
                                    {/* Column 1 (Odd) - 2 profile images stacked */}
                                    <div className="flex flex-col space-y-24">
                                        <div 
                                            className="w-[3.75rem] h-[3.75rem] rounded-full transition-all duration-1000"
                                            style={{
                                                background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                                                boxShadow: hoveredCard === 'meeting-intelligence' ? 'rgba(255, 255, 255, 1) 0px 0px 10px 0px' : 'rgba(255, 255, 255, 0.3) 0px 0px 10px 0px',
                                            }}
                                        >
                                            <img
                                                loading="lazy"
                                                sizes="50px"
                                                srcSet="/landing/profile_3.png 640w"
                                                src="/landing/profile_3.png"
                                                alt=""
                                                style={{
                                                    display: 'block',
                                                    width: '100%',
                                                    height: '100%',
                                                    objectPosition: 'center center',
                                                    objectFit: 'cover',
                                                    borderRadius: '100%',
                                                    boxShadow: 'rgba(255, 255, 255, 0.318) 0.63695px -0.3981px 1.65248px -0.8125px, rgba(255, 255, 255, 0.306) 1.9316px -1.20725px 5.01125px -1.625px, rgba(255, 255, 255, 0.28) 5.10612px -3.19133px 13.247px -2.4375px, rgba(255, 255, 255, 0.176) 16px -10px 41.5095px -3.25px, rgba(0, 0, 0, 0.49) -1.34368px 1.34368px 1.90026px -0.625px, rgba(0, 0, 0, 0.48) -3.18477px 3.18477px 4.50394px -1.25px, rgba(0, 0, 0, 0.463) -5.80935px 5.80935px 8.21565px -1.875px, rgba(0, 0, 0, 0.44) -9.65802px 9.65802px 13.6585px -2.5px, rgba(0, 0, 0, 0.404) -15.5969px 15.5969px 22.0574px -3.125px, rgba(0, 0, 0, 0.34) -25.5306px 25.5306px 36.1057px -3.75px, rgba(0, 0, 0, 0.224) -43.962px 43.962px 62.1716px -4.375px, rgba(0, 0, 0, 0) -80px 80px 113.137px -5px',
                                                }}
                                            />
                                        </div>
                                        <div 
                                            className="w-[3.75rem] h-[3.75rem] rounded-full"
                                            style={{
                                                background: 'linear-gradient(45deg, #10b981, #06b6d4)',
                                                boxShadow: 'rgba(255, 255, 255, 0.3) 0px 0px 10px 0px',
                                            }}
                                        >
                                            <img
                                                loading="lazy"
                                                sizes="50px"
                                                srcSet="/landing/profile_4.png 640w"
                                                src="/landing/profile_4.png"
                                                alt=""
                                                style={{
                                                    display: 'block',
                                                    width: '100%',
                                                    height: '100%',
                                                    objectPosition: 'center center',
                                                    objectFit: 'cover',
                                                    borderRadius: '100%',
                                                    boxShadow: 'rgba(255, 255, 255, 0.318) 0.63695px -0.3981px 1.65248px -0.8125px, rgba(255, 255, 255, 0.306) 1.9316px -1.20725px 5.01125px -1.625px, rgba(255, 255, 255, 0.28) 5.10612px -3.19133px 13.247px -2.4375px, rgba(255, 255, 255, 0.176) 16px -10px 41.5095px -3.25px, rgba(0, 0, 0, 0.49) -1.34368px 1.34368px 1.90026px -0.625px, rgba(0, 0, 0, 0.48) -3.18477px 3.18477px 4.50394px -1.25px, rgba(0, 0, 0, 0.463) -5.80935px 5.80935px 8.21565px -1.875px, rgba(0, 0, 0, 0.44) -9.65802px 9.65802px 13.6585px -2.5px, rgba(0, 0, 0, 0.404) -15.5969px 15.5969px 22.0574px -3.125px, rgba(0, 0, 0, 0.34) -25.5306px 25.5306px 36.1057px -3.75px, rgba(0, 0, 0, 0.224) -43.962px 43.962px 62.1716px -4.375px, rgba(0, 0, 0, 0) -80px 80px 113.137px -5px',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Column 2 (Even) - 1 profile image centered */}
                                    <div className="flex items-center">
                                        <div 
                                            className="w-[3.75rem] h-[3.75rem] rounded-full"
                                            style={{
                                                background: 'linear-gradient(45deg, #f59e0b, #ef4444)',
                                                boxShadow: 'rgba(255, 255, 255, 0.3) 0px 0px 10px 0px',
                                            }}
                                        >
                                            <img
                                                loading="lazy"
                                                sizes="50px"
                                                srcSet="/landing/profile_5.png 640w"
                                                src="/landing/profile_5.png"
                                                alt=""
                                                style={{
                                                    display: 'block',
                                                    width: '100%',
                                                    height: '100%',
                                                    objectPosition: 'center center',
                                                    objectFit: 'cover',
                                                    borderRadius: '100%',
                                                    boxShadow: 'rgba(255, 255, 255, 0.318) 0.63695px -0.3981px 1.65248px -0.8125px, rgba(255, 255, 255, 0.306) 1.9316px -1.20725px 5.01125px -1.625px, rgba(255, 255, 255, 0.28) 5.10612px -3.19133px 13.247px -2.4375px, rgba(255, 255, 255, 0.176) 16px -10px 41.5095px -3.25px, rgba(0, 0, 0, 0.49) -1.34368px 1.34368px 1.90026px -0.625px, rgba(0, 0, 0, 0.48) -3.18477px 3.18477px 4.50394px -1.25px, rgba(0, 0, 0, 0.463) -5.80935px 5.80935px 8.21565px -1.875px, rgba(0, 0, 0, 0.44) -9.65802px 9.65802px 13.6585px -2.5px, rgba(0, 0, 0, 0.404) -15.5969px 15.5969px 22.0574px -3.125px, rgba(0, 0, 0, 0.34) -25.5306px 25.5306px 36.1057px -3.75px, rgba(0, 0, 0, 0.224) -43.962px 43.962px 62.1716px -4.375px, rgba(0, 0, 0, 0) -80px 80px 113.137px -5px',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Column 3 (Odd) - 2 profile images stacked */}
                                    <div className="flex flex-col space-y-24">
                                        <div 
                                            className="w-[3.75rem] h-[3.75rem] rounded-full"
                                            style={{
                                                background: 'linear-gradient(45deg, #8b5cf6, #ec4899)',
                                                boxShadow: 'rgba(255, 255, 255, 0.3) 0px -2px -2px 0px',
                                            }}
                                        >
                                            <img
                                                loading="lazy"
                                                sizes="50px"
                                                srcSet="/landing/profile_6.png 640w"
                                                src="/landing/profile_6.png"
                                                alt=""
                                                style={{
                                                    display: 'block',
                                                    width: '100%',
                                                    height: '100%',
                                                    objectPosition: 'center center',
                                                    objectFit: 'cover',
                                                    borderRadius: '100%',
                                                    boxShadow: 'rgba(255, 255, 255, 0.318) 0.63695px -0.3981px 1.65248px -0.8125px, rgba(255, 255, 255, 0.306) 1.9316px -1.20725px 5.01125px -1.625px, rgba(255, 255, 255, 0.28) 5.10612px -3.19133px 13.247px -2.4375px, rgba(255, 255, 255, 0.176) 16px -10px 41.5095px -3.25px, rgba(0, 0, 0, 0.49) -1.34368px 1.34368px 1.90026px -0.625px, rgba(0, 0, 0, 0.48) -3.18477px 3.18477px 4.50394px -1.25px, rgba(0, 0, 0, 0.463) -5.80935px 5.80935px 8.21565px -1.875px, rgba(0, 0, 0, 0.44) -9.65802px 9.65802px 13.6585px -2.5px, rgba(0, 0, 0, 0.404) -15.5969px 15.5969px 22.0574px -3.125px, rgba(0, 0, 0, 0.34) -25.5306px 25.5306px 36.1057px -3.75px, rgba(0, 0, 0, 0.224) -43.962px 43.962px 62.1716px -4.375px, rgba(0, 0, 0, 0) -80px 80px 113.137px -5px',
                                                }}
                                            />
                                        </div>
                                        <div 
                                            className="w-[3.75rem] h-[3.75rem] rounded-full"
                                            style={{
                                                background: 'linear-gradient(45deg, #06b6d4, #3b82f6)',
                                                boxShadow: 'rgba(255, 255, 255, 0.3) 0px 0px 10px 0px',
                                            }}
                                        >
                                            <img
                                                loading="lazy"
                                                sizes="50px"
                                                srcSet="/landing/profile_7.png 640w"
                                                src="/landing/profile_7.png"
                                                alt=""
                                                style={{
                                                    display: 'block',
                                                    width: '100%',
                                                    height: '100%',
                                                    objectPosition: 'center center',
                                                    objectFit: 'cover',
                                                    borderRadius: '100%',
                                                    boxShadow: 'rgba(255, 255, 255, 0.318) 0.63695px -0.3981px 1.65248px -0.8125px, rgba(255, 255, 255, 0.306) 1.9316px -1.20725px 5.01125px -1.625px, rgba(255, 255, 255, 0.28) 5.10612px -3.19133px 13.247px -2.4375px, rgba(255, 255, 255, 0.176) 16px -10px 41.5095px -3.25px, rgba(0, 0, 0, 0.49) -1.34368px 1.34368px 1.90026px -0.625px, rgba(0, 0, 0, 0.48) -3.18477px 3.18477px 4.50394px -1.25px, rgba(0, 0, 0, 0.463) -5.80935px 5.80935px 8.21565px -1.875px, rgba(0, 0, 0, 0.44) -9.65802px 9.65802px 13.6585px -2.5px, rgba(0, 0, 0, 0.404) -15.5969px 15.5969px 22.0574px -3.125px, rgba(0, 0, 0, 0.34) -25.5306px 25.5306px 36.1057px -3.75px, rgba(0, 0, 0, 0.224) -43.962px 43.962px 62.1716px -4.375px, rgba(0, 0, 0, 0) -80px 80px 113.137px -5px',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Column 4 (Even) - 1 profile image centered */}
                                    <div className="flex items-center">
                                        <div 
                                            className="w-[3.75rem] h-[3.75rem] rounded-full"
                                            style={{
                                                background: 'linear-gradient(45deg, #ec4899, #f59e0b)',
                                                boxShadow: 'rgba(255, 255, 255, 0.3) 0px 0px 10px 0px',
                                            }}
                                        >
                                            <img
                                                loading="lazy"
                                                sizes="50px"
                                                srcSet="/landing/profile_8.png 640w"
                                                src="/landing/profile_8.png"
                                                alt=""
                                                style={{
                                                    display: 'block',
                                                    width: '100%',
                                                    height: '100%',
                                                    objectPosition: 'center center',
                                                    objectFit: 'cover',
                                                    borderRadius: '100%',
                                                    boxShadow: 'rgba(255, 255, 255, 0.318) 0.63695px -0.3981px 1.65248px -0.8125px, rgba(255, 255, 255, 0.306) 1.9316px -1.20725px 5.01125px -1.625px, rgba(255, 255, 255, 0.28) 5.10612px -3.19133px 13.247px -2.4375px, rgba(255, 255, 255, 0.176) 16px -10px 41.5095px -3.25px, rgba(0, 0, 0, 0.49) -1.34368px 1.34368px 1.90026px -0.625px, rgba(0, 0, 0, 0.48) -3.18477px 3.18477px 4.50394px -1.25px, rgba(0, 0, 0, 0.463) -5.80935px 5.80935px 8.21565px -1.875px, rgba(0, 0, 0, 0.44) -9.65802px 9.65802px 13.6585px -2.5px, rgba(0, 0, 0, 0.404) -15.5969px 15.5969px 22.0574px -3.125px, rgba(0, 0, 0, 0.34) -25.5306px 25.5306px 36.1057px -3.75px, rgba(0, 0, 0, 0.224) -43.962px 43.962px 62.1716px -4.375px, rgba(0, 0, 0, 0) -80px 80px 113.137px -5px',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Column 5 (Odd) - 2 profile images stacked */}
                                    <div className="flex flex-col space-y-24">
                                        <div 
  className="w-[3.75rem] h-[3.75rem] rounded-full transition-all duration-1000"
  style={{
    background: 'linear-gradient(225deg, #10b981 20%, #8b5cf6 80%)',
    boxShadow: hoveredCard === 'meeting-intelligence' ? 'rgba(255, 255, 255, 1) -4px -4px 10px' : 'rgba(255, 255, 255, 0.3) -2px -2px 10px',
  }}
>
  <img
    loading="lazy"
    sizes="50px"
    srcSet="/landing/profile_9.png 640w"
    src="/landing/profile_9.png"
    alt=""
    style={{
      display: 'block',
      width: '100%',
      height: '100%',
      objectPosition: 'center',
      objectFit: 'cover',
      borderRadius: '100%',
      // Top-left light glow only
      boxShadow: `
        rgba(255, 255, 255, 0.25) -2px -2px 4px,
        rgba(255, 255, 255, 0.2) -4px -4px 10px,
        rgba(0, 0, 0, 0.15) 2px 2px 6px
      `,
    }}
  />
</div>


                                        <div 
                                            className="w-[3.75rem] h-[3.75rem] rounded-full"
                                            style={{
                                                background: 'linear-gradient(45deg, #ef4444, #06b6d4)',
                                                boxShadow: 'rgba(255, 255, 255, 0.3) 0px 0px 10px 0px',
                                            }}
                                        >
                                            <img
                                                loading="lazy"
                                                sizes="50px"
                                                srcSet="/landing/profile_10.png 640w"
                                                src="/landing/profile_10.png"
                                                alt=""
                                                style={{
                                                    display: 'block',
                                                    width: '100%',
                                                    height: '100%',
                                                    objectPosition: 'center center',
                                                    objectFit: 'cover',
                                                    borderRadius: '100%',
                                                    boxShadow: 'rgba(255, 255, 255, 0.318) 0.63695px -0.3981px 1.65248px -0.8125px, rgba(255, 255, 255, 0.306) 1.9316px -1.20725px 5.01125px -1.625px, rgba(255, 255, 255, 0.28) 5.10612px -3.19133px 13.247px -2.4375px, rgba(255, 255, 255, 0.176) 16px -10px 41.5095px -3.25px, rgba(0, 0, 0, 0.49) -1.34368px 1.34368px 1.90026px -0.625px, rgba(0, 0, 0, 0.48) -3.18477px 3.18477px 4.50394px -1.25px, rgba(0, 0, 0, 0.463) -5.80935px 5.80935px 8.21565px -1.875px, rgba(0, 0, 0, 0.44) -9.65802px 9.65802px 13.6585px -2.5px, rgba(0, 0, 0, 0.404) -15.5969px 15.5969px 22.0574px -3.125px, rgba(0, 0, 0, 0.34) -25.5306px 25.5306px 36.1057px -3.75px, rgba(0, 0, 0, 0.224) -43.962px 43.962px 62.1716px -4.375px, rgba(0, 0, 0, 0) -80px 80px 113.137px -5px',
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="absolute inset-0 mt-36 -z-50 pointer-events-none">
  {/* Hovered Mask Layer */}
  <div
    className={`
      absolute inset-0 transition-opacity duration-[1000ms] ease-in-out
      ${hoveredCard === 'meeting-intelligence' ? 'opacity-100' : 'opacity-0'}
    `}
    style={{
      WebkitMask: 'radial-gradient(25% 70% at 50% 65.6%, rgb(0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%), radial-gradient(50% 50%, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.35) 50%, rgba(0, 0, 0, 0) 100%)',
      mask: 'radial-gradient(25% 70% at 50% 65.6%, rgb(0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%), radial-gradient(50% 50%, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.35) 50%, rgba(0, 0, 0, 0) 100%)',
    }}
  >
    <div
      className="absolute inset-0"
      style={{
        borderRadius: 'inherit',
        backgroundRepeat: 'repeat',
        backgroundPosition: 'left top',
        backgroundSize: '214px',
        backgroundImage: 'url("/landing/background.png")',
        border: 0,
      }}
    />
  </div>

  {/* Default Mask Layer */}
  <div
    className={`
      absolute inset-0 transition-opacity duration-[1000ms] ease-in-out
      ${hoveredCard === 'meeting-intelligence' ? 'opacity-0' : 'opacity-100'}
    `}
    style={{
      WebkitMask: 'radial-gradient(25% 70% at 50% 65.6%, rgb(0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%), radial-gradient(50% 50%, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.1) 50%, rgba(0, 0, 0, 0) 100%)',
      mask: 'radial-gradient(25% 70% at 50% 65.6%, rgb(0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%), radial-gradient(50% 50%, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.1) 50%, rgba(0, 0, 0, 0) 100%)',
    }}
  >
    <div
      className="absolute inset-0"
      style={{
        borderRadius: 'inherit',
        backgroundRepeat: 'repeat',
        backgroundPosition: 'left top',
        backgroundSize: '214px',
        backgroundImage: 'url("/landing/background.png")',
        border: 0,
      }}
    />
  </div>
</div>                    
                </div>
                {/* Black gradient at bottom - 20px height covering only bottom */}
                    <div
                        className="absolute -bottom-2 left-0 w-full h-32 rounded-b-[16px] overflow-hidden pointer-events-none z-[10] flex-none will-change-transform"
                        style={{
                            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgb(12, 14, 19) 100%)'
                        }}
                    ></div>
            </div>
        </div>
    );
}
