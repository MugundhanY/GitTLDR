import Image from 'next/image';
import Link from 'next/link';
import { FaGithub, FaLinkedin, FaYoutube } from 'react-icons/fa';

const Footer = () => {
  const navLinks = {
    Product: [
      { name: 'Features', href: '#features' },
      { name: 'Benefits', href: '#benefits' },
      { name: 'Integration', href: '/integrations' },
      { name: 'Pricing', href: '#pricing' },
      { name: 'Changelog', href: '/changelog' },
    ],
    Company: [
      { name: 'About', href: '/about' },
    ],
    Resources: [
      { name: 'Contact', href: '/contact' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms & conditions', href: '/terms' },
    ],
  };

  return (
    <footer
      className="w-full text-white"
      style={{
        backdropFilter: 'blur(50px)',
        background: 'radial-gradient(50% 100% at 50% 0%, rgba(12, 14, 19, 0.9) 0%, rgb(7, 9, 14) 100%)',
      }}
      id="footer"
    >
      {/* Top decorative line */}
      <div
        className="h-px w-full"
        style={{
          background: 'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0) 100%)',
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-7">
        {/* Top section: Logo, social links, and navigation */}
  <div className="flex flex-col lg:flex-row justify-between gap-12 pt-4 md:px-4">
          {/* Left side: Logo and social icons (responsive) */}
          <div className="w-full lg:w-auto flex flex-row lg:flex-col items-center lg:items-start justify-between lg:justify-between gap-6">
            <div className="flex items-center w-full lg:w-auto">
              <Link href="#hero" className="flex h-auto" style={{opacity: 1}}>
                  <Image
                    src="/GitTLDR_logo.png"
                    alt="GitTLDR Logo"
                    height={35}
                    width={35}
                    className="h-auto"
                  />
                  <span className="ml-2 text-white font-bold tracking-wide flex items-center" style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.5rem', display: 'flex', alignItems: 'center', height: '2.8rem' }}>GitTLDR</span>
              </Link>
              {/* Social links for md/sm screens */}
              <div className="flex-1 flex justify-end items-center gap-4 text-white lg:hidden">
                <a href="https://www.youtube.com/@TeamMaverick-k4s" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">
                  <FaYoutube size='28px'/>
                </a>
                <a href="https://github.com/MugundhanY" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">
                  <FaGithub size='28px'/>
                </a>
                <a href="https://www.linkedin.com/in/mugundhan-y-0ab2772a7/" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">
                  <FaLinkedin size='28px' />
                </a>
              </div>
            </div>
            {/* Social links for lg screens */}
            <div className="hidden lg:flex items-center gap-4 text-white">
              <a href="https://www.youtube.com/@TeamMaverick-k4s" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">
                <FaYoutube size='28px'/>
              </a>
              <a href="https://github.com/MugundhanY" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">
                <FaGithub size='28px'/>
              </a>
              <a href="https://www.linkedin.com/in/mugundhan-y-0ab2772a7/" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">
                <FaLinkedin size='28px' />
              </a>
            </div>
          </div>

          {/* Right side: Navigation links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {Object.entries(navLinks).map(([title, links]) => (
              <div key={title} className="flex flex-col gap-4 md:pl-4">
                <h3 className="font-semibold text-white tracking-tight">{title}</h3>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="my-8 h-px bg-white/10" />

        {/* Bottom section: Copyright and credits */}
  <div className="flex flex-col md:flex-row items-center justify-between gap-0 text-sm text-gray-500">
          <p>© 2025 GitTLDR. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
