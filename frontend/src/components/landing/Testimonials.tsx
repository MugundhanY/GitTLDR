"use client";

export default function Testimonials() {
    return (
        <section className="w-full flex flex-col items-center justify-center md:pt-20 pt-20 pb-16 px-4" style={{ position: 'relative' }} id="testimonial">
            {/* Testimonials Badge */}
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
                        Testimonials
                    </p>
                </div>
            </div>

            {/* Headline */}
            <h1
                className="text-center text-white font-inter font-medium lg:text-5xl text-3xl md:text-4xl mb-4 mx-auto max-w-lg lg:max-w-sm md:max-w-lg"
                style={{ lineHeight: 1.1 }}
            >
                {["Don't", "Just", "Take", "Our", "Word", "for", "It"].map((word, index) => (
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
            <p className="text-center text-white/60 font-inter font-normal text-base mx-auto mb-6 max-w-xl lg:max-w-xl md:max-w-2xl">
                Hear from development teams how GitTLDR revolutionized their code reviews and repository understanding.
            </p>
            {/* ...testimonials content goes here... */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-7xl mx-auto pt-8">
                {/* Testimonial 1 */}
                <div className="relative flex flex-col gap-4 pt-9 pb-8 px-8 bg-white/3 w-full bg-white/5 rounded-[16px] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.2),inset_0_-1px_2px_0_rgba(255,255,255,0.05)] opacity-100 overflow-hidden group">
                    {/* Blurred image background */}
            <div className="absolute -left-20 -bottom-20 w-32 h-32 group-hover:h-40 group-hover:w-40 transition-all duration-700 opacity-90 group-hover:opacity-100" style={{filter: 'blur(40px)', borderRadius: '63px', overflow: 'hidden'}}>
                <img src="/landing/profile_10.png" alt="Sarah Martinez" style={{width: '100%', height: '100%', objectFit: 'fill', borderRadius: 'full'}} />
            </div>
                    {/* Dots pattern */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl z-10 transition-all duration-700 opacity-100 group-hover:opacity-100" style={{backgroundImage: 'url(/landing/background.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', mask: 'radial-gradient(100% 100% at 0% 100%, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)'}} />
                    {/* Testimonial text */}
                    <div className="relative z-10">
                        <p className="text-white text-sm font-normal mb-6 max-w-[18.5rem]" 
                        style={{
                            fontSize: '1rem',
                            lineHeight: '1.3rem'
                        }}>&quot;GitTLDR completely transformed our code review process. The AI-powered summaries help us understand complex changes instantly, saving hours every week.&quot;</p>
                        <div className="flex items-center gap-4 mt-4">
                            <img src="/landing/profile_10.png" alt="Sarah Martinez" className="w-10 h-10 object-cover rounded-full shadow-lg" />
                            <div className="h-10 w-px bg-white/20 mx-1 rounded" />
                            <div className="flex flex-col">
                                <span className="text-white/60 font-medium">Sarah Martinez</span>
                                <span className="text-white/40 text-sm font-semibold">Lead Developer at TechFlow</span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Testimonial 2 */}
                <div className="relative flex flex-col gap-4 pt-9 pb-8 px-8 bg-white/3 w-full bg-white/5 rounded-[16px] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.2),inset_0_-1px_2px_0_rgba(255,255,255,0.05)] opacity-100 overflow-hidden group">
                    {/* Blurred image background */}
                    <div className="absolute -left-18 -bottom-18 w-32 h-32 group-hover:h-40 group-hover:w-40 transition-all duration-700 opacity-90 group-hover:opacity-100" style={{filter: 'blur(40px)', borderRadius: '63px', overflow: 'hidden'}}>
                        <img src="/landing/profile_2.png" alt="Marcus Chen" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'full'}} />
                    </div>
                    {/* Dots pattern */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl z-10 transition-all duration-700 opacity-100 group-hover:opacity-100" style={{backgroundImage: 'url(/landing/background.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', mask: 'radial-gradient(100% 100% at 0% 100%, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)'}} />
                    {/* Testimonial text */}
                    <div className="relative z-10">
                        <p className="text-white text-sm font-normal mb-6 max-w-[18.5rem]" style={{fontSize: '1rem', lineHeight: '1.3rem'}}>&quot;The meeting transcription feature is incredible. Now our decisions are automatically linked to specific commits and we never lose track of why changes were made.&quot;</p>
                        <div className="flex items-center gap-4 mt-4">
                            <img src="/landing/profile_2.png" alt="Marcus Chen" className="w-10 h-10 object-cover rounded-full shadow-lg" />
                            <div className="h-10 w-px bg-white/20 mx-0.5 rounded" />
                            <div className="flex flex-col">
                                <span className="text-white/60 font-medium">Marcus Chen</span>
                                <span className="text-white/40 text-sm font-semibold">Engineering Manager at DevCorp</span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Testimonial 3 */}
                <div className="relative flex flex-col gap-4 pt-9 pb-8 px-8 bg-white/3 w-full bg-white/5 rounded-[16px] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.2),inset_0_-1px_2px_0_rgba(255,255,255,0.05)] opacity-100 overflow-hidden group">
                    {/* Blurred image background */}
                    <div className="absolute -left-18 -bottom-18 w-32 h-32 group-hover:h-40 group-hover:w-40 transition-all duration-700 opacity-90 group-hover:opacity-100" style={{filter: 'blur(40px)', borderRadius: '63px', overflow: 'hidden'}}>
                        <img src="/landing/profile_8.png" alt="Emily Rodriguez" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'full'}} />
                    </div>
                    {/* Dots pattern */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl z-10 transition-all duration-700 opacity-100 group-hover:opacity-100" style={{backgroundImage: 'url(/landing/background.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', mask: 'radial-gradient(100% 100% at 0% 100%, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)'}} />
                    {/* Testimonial text */}
                    <div className="relative z-10">
                        <p className="text-white text-sm font-normal mb-6 max-w-[18.5rem]" style={{fontSize: '1rem', lineHeight: '1.3rem'}}>&quot;The real-time team coordination is a game-changer. No more &apos;who&apos;s working on what&apos; confusion. GitTLDR shows exactly what&apos;s happening across our repositories.&quot;</p>
                        <div className="flex items-center gap-4 mt-4">
                            <img src="/landing/profile_8.png" alt="Emily Rodriguez" className="w-10 h-10 object-cover rounded-full shadow-lg" />
                            <div className="h-10 w-px bg-white/20 mx-1 rounded" />
                            <div className="flex flex-col">
                                <span className="text-white/60 font-medium">Emily Rodriguez</span>
                                <span className="text-white/40 text-sm font-semibold">Senior Developer at CodeBase</span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Testimonial 4 */}
                <div className="relative flex flex-col gap-4 pt-9 pb-8 px-8 bg-white/3 w-full bg-white/5 rounded-[16px] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.2),inset_0_-1px_2px_0_rgba(255,255,255,0.05)] opacity-100 overflow-hidden group">
                    {/* Blurred image background */}
                    <div className="absolute -left-18 -bottom-18 w-32 h-32 group-hover:h-40 group-hover:w-40 transition-all duration-700 opacity-90 group-hover:opacity-100" style={{filter: 'blur(40px)', borderRadius: '63px', overflow: 'hidden'}}>
                        <img src="/landing/profile_7.png" alt="David Kim" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'full'}} />
                    </div>
                    {/* Dots pattern */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl z-10 transition-all duration-700 opacity-100 group-hover:opacity-100" style={{backgroundImage: 'url(/landing/background.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', mask: 'radial-gradient(100% 100% at 0% 100%, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)'}} />
                    {/* Testimonial text */}
                    <div className="relative z-10">
                        <p className="text-white text-sm font-normal mb-6 max-w-[18.5rem]" style={{fontSize: '1rem', lineHeight: '1.3rem'}}>&quot;The semantic search is mind-blowing. Instead of keyword hunting, we can ask questions about our codebase and get answers that actually understand the context and relationships.&quot;</p>
                        <div className="flex items-center gap-4 mt-4">
                            <img src="/landing/profile_7.png" alt="David Kim" className="w-10 h-10 object-cover rounded-full shadow-lg" />
                            <div className="h-10 w-px bg-white/20 mx-1 rounded" />
                            <div className="flex flex-col">
                                <span className="text-white/60 font-medium">David Kim</span>
                                <span className="text-white/40 text-sm font-semibold">Tech Lead at InnovateTech</span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Testimonial 5 */}
                <div className="relative flex flex-col gap-4 pt-9 pb-8 px-8 bg-white/3 w-full bg-white/5 rounded-[16px] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.2),inset_0_-1px_2px_0_rgba(255,255,255,0.05)] opacity-100 overflow-hidden group">
                    {/* Blurred image background */}
                    <div className="absolute -left-18 -bottom-18 w-32 h-32 group-hover:h-40 group-hover:w-40 transition-all duration-700 opacity-90 group-hover:opacity-100" style={{filter: 'blur(40px)', borderRadius: '63px', overflow: 'hidden'}}>
                        <img src="/landing/profile_11.png" alt="Rachel Thompson" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'full'}} />
                    </div>
                    {/* Dots pattern */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl z-10 transition-all duration-700 opacity-100 group-hover:opacity-100" style={{backgroundImage: 'url(/landing/background.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', mask: 'radial-gradient(100% 100% at 0% 100%, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)'}} />
                    {/* Testimonial text */}
                    <div className="relative z-10">
                        <p className="text-white text-sm font-normal mb-6 max-w-[18.5rem]" style={{fontSize: '1rem', lineHeight: '1.3rem'}}>&quot;GitTLDR&apos;s smart dashboard gives us insights we never had before. Repository health, contributor patterns, and project velocity - all in customizable widgets.&quot;</p>
                        <div className="flex items-center gap-4 mt-4">
                            <img src="/landing/profile_11.png" alt="Rachel Thompson" className="w-10 h-10 object-cover rounded-full shadow-lg" />
                            <div className="h-10 w-px bg-white/20 mx-0.5 rounded" />
                            <div className="flex flex-col">
                                <span className="text-white/60 font-medium">Rachel Thompson</span>
                                <span className="text-white/40 text-sm font-semibold">Product Owner at ScaleApp</span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Testimonial 6 */}
                <div className="relative flex flex-col gap-4 pt-9 pb-8 px-8 bg-white/3 w-full bg-white/5 rounded-[16px] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.2),inset_0_-1px_2px_0_rgba(255,255,255,0.05)] opacity-100 overflow-hidden group">
                    {/* Blurred image background */}
                    <div className="absolute -left-18 -bottom-18 w-32 h-32 group-hover:h-40 group-hover:w-40 transition-all duration-700 opacity-90 group-hover:opacity-100" style={{filter: 'blur(40px)', borderRadius: '63px', overflow: 'hidden'}}>
                        <img src="/landing/profile_5.png" alt="James Wilson" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'full'}} />
                    </div>
                    {/* Dots pattern */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl z-10 transition-all duration-700 opacity-100 group-hover:opacity-100" style={{backgroundImage: 'url(/landing/background.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', mask: 'radial-gradient(100% 100% at 0% 100%, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)'}} />
                    {/* Testimonial text */}
                    <div className="relative z-10">
                        <p className="text-white text-sm font-normal mb-6 max-w-[18.5rem]" style={{fontSize: '1rem', lineHeight: '1.3rem'}}>&quot;Finally, repository management that makes sense. GitTLDR connects code changes with team conversations. Our code reviews are no longer archaeological expeditions.&quot;</p>
                        <div className="flex items-center gap-4 mt-4">
                            <img src="/landing/profile_5.png" alt="James Wilson" className="w-10 h-10 object-cover rounded-full shadow-lg" />
                            <div className="h-10 w-px bg-white/20 mx-1 rounded" />
                            <div className="flex flex-col">
                                <span className="text-white/60 font-medium">James Wilson</span>
                                <span className="text-white/40 text-sm font-semibold">CTO at BuildFast</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
