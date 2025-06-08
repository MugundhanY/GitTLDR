import Link from 'next/link'
import { ArrowRight, GitBranch, Zap, MessageSquare, CreditCard, Sparkles, Shield, Code, Bot } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50 to-secondary-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary-200/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-secondary-200/30 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-3/4 right-1/3 w-64 h-64 bg-accent-200/20 rounded-full blur-3xl animate-glow-pulse"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-primary rounded-xl animate-shimmer">
              <GitBranch className="h-8 w-8 text-white" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              GitTLDR
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="md"
              className="text-neutral-700 hover:text-primary-600"
            >
              <Link href="/auth/signin">Sign In</Link>
            </Button>
            <Button
              variant="primary"
              size="md"
              className="gradient-primary"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              <Link href="/auth/signup">Get Started</Link>
            </Button>
          </div>
        </nav>
      </header>      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-4 py-20 text-center">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 animate-fade-in-up">
            <div className="inline-flex items-center px-4 py-2 bg-glass-light border border-primary-200 rounded-full text-primary-700 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Code Intelligence
            </div>
            <h1 className="text-6xl md:text-7xl font-bold text-neutral-800 mb-6 leading-tight">
              Transform Your 
              <span className="block bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent animate-shimmer">
                GitHub Repositories
              </span>
              Into <span className="bg-gradient-to-r from-secondary-600 to-accent-600 bg-clip-text text-transparent">AI Insights</span>
            </h1>
            <p className="text-xl text-neutral-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              GitTLDR converts entire repositories into intelligent summaries and embeddings. 
              Ask questions, get instant answers, and understand your codebase like never before.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            <Button
              variant="primary"
              size="xl"
              className="gradient-primary"
              rightIcon={<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            >
              <Link href="/auth/signup">Start Analyzing Repositories</Link>
            </Button>
            <Button
              variant="outline"
              size="xl"
              className="border-primary-300 text-primary-600 hover:bg-primary-50"
            >
              <Link href="/demo">View Demo</Link>
            </Button>
          </div>

          {/* Social Proof */}
          <div className="flex items-center justify-center space-x-8 text-sm text-neutral-500 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
              <span>150+ Free Credits</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Enterprise Security</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Lightning Fast</span>
            </div>
          </div>
        </div>
      </section>      {/* Features Section */}
      <section className="relative z-10 container mx-auto px-4 py-20">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold text-neutral-800 mb-4">
            Powerful Features for 
            <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Modern Developers
            </span>
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Everything you need to understand, analyze, and work with your repositories more efficiently.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Repository Embedding */}
          <div className="group bg-glass-light border border-white/40 backdrop-blur-xl p-8 rounded-2xl hover:scale-105 transition-all duration-300 animate-fade-in-up">
            <div className="h-14 w-14 bg-gradient-primary rounded-xl flex items-center justify-center mb-6 group-hover:animate-pulse">
              <GitBranch className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-800 mb-3">
              Repository Embedding
            </h3>
            <p className="text-neutral-600 leading-relaxed">
              Convert entire GitHub repositories into searchable embeddings and intelligent summaries.
            </p>
          </div>

          {/* AI-Powered Q&A */}
          <div className="group bg-glass-light border border-white/40 backdrop-blur-xl p-8 rounded-2xl hover:scale-105 transition-all duration-300 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
            <div className="h-14 w-14 bg-gradient-secondary rounded-xl flex items-center justify-center mb-6 group-hover:animate-pulse">
              <Bot className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-800 mb-3">
              Intelligent Q&A
            </h3>
            <p className="text-neutral-600 leading-relaxed">
              Ask questions about your codebase and get instant, context-aware answers with file references.
            </p>
          </div>

          {/* Performance Optimized */}
          <div className="group bg-glass-light border border-white/40 backdrop-blur-xl p-8 rounded-2xl hover:scale-105 transition-all duration-300 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            <div className="h-14 w-14 bg-gradient-accent rounded-xl flex items-center justify-center mb-6 group-hover:animate-pulse">
              <Zap className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-800 mb-3">
              Lightning Fast
            </h3>
            <p className="text-neutral-600 leading-relaxed">
              Optimized performance with lazy-loading commit summaries and efficient data processing.
            </p>
          </div>

          {/* Flexible Billing */}
          <div className="group bg-glass-light border border-white/40 backdrop-blur-xl p-8 rounded-2xl hover:scale-105 transition-all duration-300 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
            <div className="h-14 w-14 bg-gradient-to-br from-neutral-600 to-neutral-700 rounded-xl flex items-center justify-center mb-6 group-hover:animate-pulse">
              <CreditCard className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-800 mb-3">
              Credit-Based Billing
            </h3>
            <p className="text-neutral-600 leading-relaxed">
              Start with 150 free credits. Only pay for what you use with transparent pricing.
            </p>
          </div>
        </div>
      </section>      {/* CTA Section */}
      <section className="relative z-10 bg-gradient-to-r from-primary-600 via-primary-700 to-secondary-600 py-20 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary-300/20 rounded-full blur-3xl animate-float-delayed"></div>
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 animate-fade-in-up">
            Ready to Supercharge Your 
            <span className="block text-secondary-200">Development Workflow?</span>
          </h2>
          <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{animationDelay: '0.1s'}}>
            Join thousands of developers who are already using GitTLDR to understand their codebases better.
          </p>
          <div className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            <Button
              variant="glass"
              size="xl"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              <Link href="/auth/signup">Get Started for Free</Link>
            </Button>
          </div>
        </div>
      </section>      {/* Footer */}
      <footer className="relative z-10 bg-neutral-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-primary rounded-xl">
                <GitBranch className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
                GitTLDR
              </span>
            </div>
            <p className="text-neutral-400">
              © 2025 GitTLDR. Built with ❤️ for developers.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
