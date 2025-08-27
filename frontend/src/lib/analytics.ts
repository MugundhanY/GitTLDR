// Google Analytics 4 Setup for GitTLDR
// Add this to your Next.js app for comprehensive SEO tracking

declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: Record<string, any>) => void
  }
}

export const GA_TRACKING_ID = 'G-CX4BBZMVDL'

// Track page views
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      page_location: url,
    })
  }
}

// Track specific events
export const event = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}

// Track GitTLDR specific events
export const trackGitTLDREvent = (eventName: string, properties?: Record<string, any>) => {
  event(eventName, 'GitTLDR', JSON.stringify(properties))
}

// Common GitTLDR tracking events
export const trackEvents = {
  // Landing page interactions
  heroButtonClick: () => trackGitTLDREvent('hero_cta_click'),
  featuresView: () => trackGitTLDREvent('features_section_view'),
  pricingView: () => trackGitTLDREvent('pricing_section_view'),
  
  // Repository interactions
  repositoryConnect: (provider: string) => trackGitTLDREvent('repository_connect', { provider }),
  analyticsView: (repoName: string) => trackGitTLDREvent('analytics_view', { repository: repoName }),
  meetingSummaryGenerate: () => trackGitTLDREvent('meeting_summary_generate'),
  
  // Search and discovery
  searchGitTLDR: (query: string) => trackGitTLDREvent('search', { query }),
  shareResults: (type: string) => trackGitTLDREvent('share_results', { type }),
}
