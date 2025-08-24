"use client";

import { useState } from "react";

export default function Pricing() {
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annually'>('annually');
    return (
        <section className="w-full flex flex-col items-center justify-center md:pt-20 pt-20 pb-16 px-4" style={{ position: 'relative' }}>
            {/* Pricing Badge */}
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
                        Pricing
                    </p>
                </div>
            </div>

            {/* Headline */}
            <h1
                className="text-center text-white font-inter font-medium lg:text-5xl text-3xl md:text-4xl mb-4 mx-auto max-w-xs lg:max-w-md md:max-w-sm"
                style={{ lineHeight: 1.1 }}
            >
                {["Choose", "the", "Perfect", "Plan", "for", "Your", "Team"].map((word, index) => (
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
            <p className="text-center text-white/60 font-inter font-normal text-base mx-auto mb-12 max-w-lg lg:max-w-2xl md:max-w-xl">
                Whether you're just starting or scaling up, Aurix has a plan that fits your needs.
            </p>
            {/* Billing Period Toggle */}
            <div className="flex justify-center mb-12">
                <div
                    className="flex gap-2 items-center px-2 py-2"
                    style={{
                        background: billingPeriod === 'monthly' ? 'none' : 'radial-gradient(50% 100% at 100% 50%, #112920 0%, #0C0E13 100%)',
                        borderRadius: '28px',
                        boxShadow: 'rgba(255,255,255,0.2) 0px 1px 1px 0px inset, rgba(255,255,255,0.05) 0px -1px 2px 0px inset',
                        opacity: 1,
                    }}
                >
                    {/* Monthly */}
                    <div
                        className="flex items-center gap-2 px-2 py-[0.95] cursor-pointer"
                        style={{ borderRadius: '30px', opacity: 1 }}
                        tabIndex={0}
                        onClick={() => setBillingPeriod('monthly')}
                    >
                        <div
                            className="flex items-center justify-center"
                            style={{
                                borderRadius: '30px',
                                border: '1px solid #fff',
                                width: '24px',
                                height: '24px',
                                position: 'relative',
                                boxShadow: 'none',
                                opacity: 1,
                            }}
                        >
                            <div
                                style={{
                                    backgroundColor: '#00C078',
                                    borderRadius: '30px',
                                    boxShadow: '0px 0px 6px 0px #00C078, inset 0px 0px 0px 1px #00FFA6',
                                    width: '11px',
                                    height: '11px',
                                    position: 'absolute',
                                    left: '50%',
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    opacity: billingPeriod === 'monthly' ? 1 : 0,
                                }}
                            />
                        </div>
                        <span className="text-white text-sm font-medium" style={{fontFamily: 'Inter', fontWeight: 500, fontSize: '14px', lineHeight: '1.1em'}}>Monthly</span>
                    </div>
                    {/* Annually */}
                    <div
                        className="flex items-center gap-2 px-2 py-[0.95] cursor-pointer"
                        style={{ borderRadius: '30px', opacity: 1 }}
                        tabIndex={0}
                        onClick={() => setBillingPeriod('annually')}
                    >
                        <div
                            className="flex items-center justify-center"
                            style={{
                                borderRadius: '30px',
                                border: '1px solid #fff',
                                width: '24px',
                                height: '24px',
                                position: 'relative',
                                boxShadow: 'none',
                                opacity: 1,
                            }}
                        >
                            <div
                                style={{
                                    backgroundColor: '#00C078',
                                    borderRadius: '30px',
                                    boxShadow: '0px 0px 6px 0px #00C078, inset 0px 0px 0px 1px #00FFA6',
                                    width: '11px',
                                    height: '11px',
                                    position: 'absolute',
                                    left: '50%',
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    opacity: billingPeriod === 'annually' ? 1 : 0,
                                }}
                            />
                        </div>
                        <span className="text-white text-sm font-medium" style={{fontFamily: 'Inter', fontWeight: 500, fontSize: '14px', lineHeight: '1.1em'}}>Annually</span>
                        <span className={`${billingPeriod === 'monthly' ? 'text-white/40' : 'text-[#80FFD2]'} text-sm font-medium px-2 py-1`}>
  Save 15%
</span>


                    </div>
                </div>
            </div>

            {/* Pricing Cards */}
            <div className="flex flex-col md:flex-row gap-6 md:gap-4 w-full max-w-[70rem] mx-auto">
                {/* Free Plan */}
                <div className="flex-1 p-5 md:p-7 relative"
  style={{
    background: 'linear-gradient(0deg, rgb(12, 14, 19) 0%, rgb(20, 23, 31) 100%)',
    borderRadius: '20px',
    boxShadow:
      'rgba(255, 255, 255, 0.2) 0px 1px 1px 0px inset, rgba(255, 255, 255, 0.05) 0px -1px 2px 0px inset',
    opacity: 1,
  }}
>
                    {/* Dots pattern */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl -z-10" style={{backgroundImage: 'url(/landing/background.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', mask: 'linear-gradient(0deg, rgba(0,0,0,0) 0%, #000 100%)'}} />
                    <div className="relative z-10">
                        <p className="text-white/60 text-lg font-medium mb-6">Free</p>
                        <div className="flex items-end space-x-2 mb-4">
  <h3 className="text-white text-4xl md:text-5xl font-medium">$0</h3>
  <h3 className="text-white text-xs md:text-sm font-medium pb-1">Forever</h3>
</div>
                        <p className="text-white/60 text-[0.95rem] mb-7">Perfect for small teams and startups</p>
                        <a
  href="/auth"
  className="block bg-white text-[#07090E] font-bold text-center py-2 rounded-xl mb-2 shadow transition transform hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] text-sm md:text-base"
>
  Sign Up Now
</a>
                        <p className="text-white/40 text-xs md:text-sm mb-7 text-center">
  {billingPeriod === 'monthly' ? 'Billed monthly.' : 'Billed in one annual payment.'}
</p>        <div className="w-full h-[0.1rem] bg-white/10 rounded my-3 mb-5" />
                        <p className="text-white text-base font-medium mb-4">Free Plan includes</p>
                        <ul className="mb-4">
                            <li className="flex items-center gap-2 text-white/60 text-sm md:text-base font-normal mb-2"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>Collaborate with up to 3 teammates</li>
                            <li className="flex items-center gap-2 text-white/60 text-sm md:text-base font-normal mb-2"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>Core task management features</li>
                            <li className="flex items-center gap-2 text-white/60 text-sm md:text-base font-normal mb-2"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>Unlimited projects and tasks</li>
                            <li className="flex items-center gap-2 text-white/60 text-sm md:text-base font-normal mb-2"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>Board and list views</li>
                            <li className="flex items-center gap-2 text-white/60 text-sm md:text-base font-normal mb-2"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>Basic integrations</li>
                        </ul>
                    </div>
                </div>
                {/* Pro Plan */}
                <div className="flex-1 p-5 md:p-7 relative"
                style={{
    background: `linear-gradient(
      0deg,
      rgb(0, 192, 120) 0%,
      rgb(0, 55, 37) 100%
    )`,
    borderRadius: '20px',
    boxShadow: `
      rgba(0, 255, 166, 0.15) 0px 1.68px 8.4px -0.625px,
      rgba(0, 255, 166, 0.145) 0px 3.98px 19.9px -1.25px,
      rgba(0, 255, 166, 0.137) 0px 7.26px 36.3px -1.875px,
      rgba(0, 255, 166, 0.133) 0px 12.07px 60.36px -2.5px,
      rgba(0, 255, 166, 0.12) 0px 19.5px 97.48px -3.125px,
      rgba(0, 255, 166, 0.1) 0px 31.91px 159.57px -3.75px,
      rgba(0, 255, 166, 0.067) 0px 54.95px 274.76px -4.375px,
      rgba(0, 255, 166, 0) 0px 100px 500px -5px,
      rgba(255, 255, 255, 0.4) 0px 0px 2px 1px inset
    `,
    opacity: 1,
  }}>
                    {/* Dots pattern */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl " style={{backgroundImage: 'url(/landing/background.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', mask: 'linear-gradient(0deg, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 100%)', opacity: 0.3}} />
                        <div className="relative z-10">
                        <p className="text-white/60 text-lg font-medium mb-6">Pro</p>
                        <div className="flex items-end space-x-2 mb-4">
  <h3 className="text-white text-4xl md:text-5xl font-medium">
  {billingPeriod === 'monthly' ? '$19' : '$16'}</h3>
  <h3 className="text-white text-xs md:text-sm font-medium pb-1">per month</h3>
</div>
                        <p className="text-white/60 text-[0.95rem] mb-7">Advanced tools for growing teams.</p>
                        <a
  href="/auth"
  className="block bg-white text-[#07090E] font-bold text-center py-2 rounded-xl mb-2 shadow transition transform hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] text-sm md:text-base"
>Start Free Trial</a>
                        <p className="text-white/60 text-xs md:text-sm mb-7 text-center">
  {billingPeriod === 'monthly' ? 'Billed monthly.' : 'Billed in one annual payment.'}
</p>        <div className="w-full h-[0.1rem] bg-white/50 rounded my-3 mb-5" />
                        <p className="text-white text-base font-medium mb-4">All Free plan features, plus</p>
                        <ul className="mb-4">
                            <li className="flex items-center gap-2 text-white text-sm md:text-base font-normal mb-2"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>Collaborate with up to 10 teammates</li>
                            <li className="flex items-center gap-2 text-white text-sm md:text-base font-normal mb-2"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>Custom workflows and templates</li>
                            <li className="flex items-center gap-2 text-white text-sm md:text-base font-normal mb-2"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>Advanced tracking & reports</li>
                            <li className="flex items-center gap-2 text-white text-sm md:text-base font-normal mb-2"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>Priority integrations</li>
                            <li className="flex items-center gap-2 text-white text-sm md:text-base font-normal mb-2"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>Email support</li>
                        </ul>
                    </div>
                </div>
                {/* Team Plan */}
                <div className="flex-1 p-5 md:p-7 relative"
                style={{
    background: 'linear-gradient(0deg, rgb(12, 14, 19) 0%, rgb(20, 23, 31) 100%)',
    borderRadius: '20px',
    boxShadow:
      'rgba(255, 255, 255, 0.2) 0px 1px 1px 0px inset, rgba(255, 255, 255, 0.05) 0px -1px 2px 0px inset',
    opacity: 1,
  }}
>
                    {/* Dots pattern */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl -z-10" style={{backgroundImage: 'url(/landing/background.png?scale-down-to=1024)', backgroundRepeat: 'repeat', backgroundSize: '267.5px', mask: 'linear-gradient(0deg, rgba(0,0,0,0) 0%, #000 100%)'}} />
                    <div className="relative z-10">
                        <p className="text-white/60 text-lg font-medium mb-6">Team</p>
                        <div className="flex items-end space-x-2 mb-5">
  <h3 className="text-white text-4xl md:text-5xl font-medium">{billingPeriod === 'monthly' ? '$49' : '$42'}</h3>
  <h3 className="text-white text-xs md:text-sm font-medium pb-1">per month</h3>
</div>
                        <p className="text-white/60 text-[0.95rem] mb-7">Complete collaboration for larger teams.</p>
                        <a
  href="/auth"
  className="block bg-white text-[#07090E] font-bold text-center py-2 rounded-xl mb-2 shadow transition transform hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] text-sm md:text-base"
>Start Free Trial</a>
                        <p className="text-white/40 text-xs md:text-sm mb-7 text-center">
  {billingPeriod === 'monthly' ? 'Billed monthly.' : 'Billed in one annual payment.'}
</p>        <div className="w-full h-[0.1rem] bg-white/10 rounded my-3 mb-4" />
                        <p className="text-white text-base font-medium mb-4">All Pro plan features, plus</p>
                        <ul className="mb-4">
                            <li className="flex items-center gap-2 text-white/60 text-sm md:text-base font-normal mb-2"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>Up to 25 teammates</li>
                            <li className="flex items-center gap-2 text-white/60 text-sm md:text-base font-normal mb-2"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>Unlimited workflows & automations</li>
                            <li className="flex items-center gap-2 text-white/60 text-sm md:text-base font-normal mb-2"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>Real-time analytics</li>
                            <li className="flex items-center gap-2 text-white/60 text-sm md:text-base font-normal mb-2"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>Premium integrations</li>
                            <li className="flex items-center gap-2 text-white/60 text-sm md:text-base font-normal mb-2"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>Priority support</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
