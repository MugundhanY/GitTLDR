import Navbar from '@/components/landing/Navbar'
import CTA from '@/components/landing/CTA'
import Footer from '@/components/landing/Footer'
import SmoothScrollProvider from '../SmoothScrollProvider';

export default function About() {

    const stats = [
    { value: '<50ms', label: 'Search Response Time' },
    { value: '10GB', label: 'Max Repository Size' },
    { value: '<5min', label: 'Analysis Time' },
    { value: '99.5%', label: 'Uptime Reliability' },
  ];
  return (
    <SmoothScrollProvider>
      <div style={{ background: '#07090E', minHeight: '100vh', width: '100vw', scrollBehavior: 'smooth' }}>
        <Navbar />
        <section className="w-full flex flex-col items-center justify-center md:pt-44 pt-32 pb-16 px-4" style={{ position: 'relative' }}>

                {/* Content Wrapper */}
                <div className="relative z-10 w-full flex flex-col items-center">
                    {/* Badge */}
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
                        About
                    </p>
                </div>
            </div>

                    {/* Headline with word-by-word animation */}
                    <h1
                        className="text-center text-white font-inter font-medium lg:text-6xl text-4xl md:text-5xl mb-4 mx-auto max-w-4xl md:pl-24 md:pr-24 lg:pl-4 lg:pr-4"
                        style={{ lineHeight: 1.1 }}
                    >
                        {["Transforming", "how", "teams", "understand", "and", "collaborate", "on", "code"].map((word, index) => (
                            <span 
                                key={word} 
                                className="inline-block mr-4" 
                                style={{ 
                                    letterSpacing: '-0.05em',
                                }}
                            >
                                {word}
                            </span>
                        ))}
                    </h1>

                    {/* Subheadline */}
                    <p className="text-center text-white/60 font-inter font-normal lg:text-xl text-lg mx-auto max-w-xl mb-8">
  <span className="inline-block">AI-powered</span>{' '}
  <span className="inline-block">repository</span>{' '}
  <span className="inline-block">intelligence</span>{' '}
  <span className="inline-block">that</span>{' '}
  <span className="inline-block">makes</span>{' '}
  <span className="inline-block">code</span>{' '}
  <span className="inline-block">reviews</span>{' '}
  <span className="inline-block">effortless</span>{' '}
  <span className="inline-block">and</span>{' '}
  <span className="inline-block">team</span>{' '}
  <span className="inline-block">coordination</span>{' '}
  <span className="inline-block">seamless.</span>
</p>

                </div>
            <div className="w-full flex flex-col lg:flex-row lg:items-start lg:justify-center md:flex-row md:items-start md:justify-center max-w-7xl mx-auto my-18">
        {/* Left: FAQ Header */}
        <div className="lg:w-1/2 md:w-1/2 flex flex-col justify-center lg:justify-start lg:items-start md:justify-start md:items-start items-center text-center md:text-left lg:text-left lg:mb-0 mx-auto px-4 md:mr-auto md:ml-0 lg:mr-auto lg:ml-0">
          {/* Headline */}
          <h1
            className="text-white font-inter font-medium lg:text-5xl text-3xl md:text-4xl mb-4 max-w-full"
            style={{ lineHeight: 1.1 }}
          >
            {["Built", "from", "frustration", "with", "lengthy", "code", "reviews"].map((word, index) => (
              <span 
                key={word} 
                className="inline-block mr-2" 
                style={{ letterSpacing: '-0.05em' }}
              >
                {word}
              </span>
            ))}
          </h1>
        </div>
        {/* Right: FAQ List */}
        <div className="lg:w-1/2 md:w-1/2 flex flex-col gap-4 w-full sm:max-w-full max-w-2xl mx-auto px-4 md:ml-auto md:mr-0 lg:ml-auto lg:mr-0">
        <p className="text-white/60 font-inter font-normal text-base max-w-xl lg:max-w-xl md:max-w-lg">
            Traditional repository management tools show you what changed but not why it matters. Code reviews become archaeological expeditions, and team knowledge lives in scattered conversations. We knew there had to be a better way.
          </p>
        <p className="text-white/60 font-inter font-normal text-base max-w-xl lg:max-w-xl md:max-w-lg">
            GitTLDR combines AI-powered summarization with real-time team coordination to make repository management actually efficient. Using advanced language models and vector embeddings, we extract meaningful insights from your repositories without drowning in documentation.
          </p>
        <p className="text-white/60 font-inter font-normal text-base max-w-xl lg:max-w-xl md:max-w-lg">
            Today, development teams rely on GitTLDR to understand code relationships, track changes in real-time, and connect repository context with team discussions. We&apos;re helping teams rediscover what it feels like when repository intelligence actually works.
        </p>
        </div>
      </div>

      <h4 className="text-center text-white text-base font-normal mb-12 mt-18 w-full">
        GitTLDR Performance & Scale
      </h4>

      <div className="w-full px-2 sm:px-6 lg:px-32">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 w-full items-center">
          {stats.map((item, index) => (
            <div key={index} className="text-center w-full">
              <h1
                className="lg:text-6xl md:text-4xl sm:text-3xl font-semibold text-transparent bg-clip-text mb-4"
                style={{width: '100%', backgroundImage: 'linear-gradient(0deg, rgb(255, 255, 255), #3399FF)', letterSpacing: '-1px'}}
              >
                {item.value}
              </h1>
              <p className="text-white/60 text-sm w-full">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
            </section>
        <CTA />
        <Footer />
      </div>
      </SmoothScrollProvider>
  )
}
