'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  QuestionMarkCircleIcon,
  BookOpenIcon,
  CommandLineIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  PlayIcon,
  LightBulbIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  VideoCameraIcon,
  CodeBracketIcon,
  SparklesIcon,
  BugAntIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'getting-started' | 'features' | 'troubleshooting' | 'billing' | 'integrations';
}

interface GuideItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  href: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openFAQItems, setOpenFAQItems] = useState<Set<string>>(new Set());

  const toggleFAQ = (id: string) => {
    const newOpenItems = new Set(openFAQItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenFAQItems(newOpenItems);
  };

  const categories = [
    { id: 'all', name: 'All Topics', icon: BookOpenIcon },
    { id: 'getting-started', name: 'Getting Started', icon: RocketLaunchIcon },
    { id: 'features', name: 'Features', icon: SparklesIcon },
    { id: 'troubleshooting', name: 'Troubleshooting', icon: BugAntIcon },
    { id: 'billing', name: 'Billing', icon: CreditCardIcon },
    { id: 'integrations', name: 'Integrations', icon: CodeBracketIcon },
  ];

  const faqs: FAQItem[] = [
    {
      id: '1',
      question: 'How do I get started with GitTLDR?',
      answer: 'To get started, simply connect your GitHub repository, and our AI will automatically analyze your codebase to provide intelligent insights, summaries, and Q&A capabilities.',
      category: 'getting-started'
    },
    {
      id: '2',
      question: 'What types of repositories does GitTLDR support?',
      answer: 'GitTLDR supports all GitHub repositories, both public and private. We work with all programming languages and can analyze codebases of any size.',
      category: 'getting-started'
    },
    {
      id: '3',
      question: 'How does the AI code analysis work?',
      answer: 'Our AI creates embeddings of your code and documentation, allowing you to ask natural language questions about your codebase and get intelligent, context-aware answers.',
      category: 'features'
    },
    {
      id: '4',
      question: 'Can I use GitTLDR with private repositories?',
      answer: 'Yes! GitTLDR works with both public and private repositories. We ensure your code remains secure and private throughout the analysis process.',
      category: 'features'
    },
    {
      id: '5',
      question: 'Why is my repository processing taking so long?',
      answer: 'Processing time depends on repository size and complexity. Large repositories may take several minutes to fully analyze. You can monitor progress on your dashboard.',
      category: 'troubleshooting'
    },
    {
      id: '6',
      question: 'What happens if processing fails?',
      answer: 'If processing fails, you can retry from your dashboard. Common causes include very large files or network issues. Contact support if problems persist.',
      category: 'troubleshooting'
    },
    {
      id: '7',
      question: 'How does billing work?',
      answer: 'GitTLDR uses a credit-based system. You consume credits when processing repositories and asking AI questions. Check your billing page for current usage and to purchase more credits.',
      category: 'billing'
    },
    {
      id: '8',
      question: 'Can I integrate GitTLDR with my existing workflow?',
      answer: 'Yes! GitTLDR offers API access and webhook integrations to incorporate our AI insights into your existing development tools and processes.',
      category: 'integrations'
    }
  ];

  const guides: GuideItem[] = [
    {
      id: '1',
      title: 'Quick Start Guide',
      description: 'Get up and running with GitTLDR in under 5 minutes',
      icon: RocketLaunchIcon,
      href: '#quick-start',
      duration: '5 min',
      difficulty: 'Beginner'
    },
    {
      id: '2',
      title: 'Setting Up Your First Repository',
      description: 'Learn how to connect and analyze your GitHub repository',
      icon: CodeBracketIcon,
      href: '#first-repo',
      duration: '10 min',
      difficulty: 'Beginner'
    },
    {
      id: '3',
      title: 'AI Q&A Best Practices',
      description: 'Tips for getting the most out of AI-powered code questions',
      icon: SparklesIcon,
      href: '#ai-qa',
      duration: '15 min',
      difficulty: 'Intermediate'
    },
    {
      id: '4',
      title: 'Meeting Analysis Features',
      description: 'Explore advanced meeting transcription and analysis tools',
      icon: VideoCameraIcon,
      href: '#meetings',
      duration: '20 min',
      difficulty: 'Intermediate'
    },
    {
      id: '5',
      title: 'Team Collaboration',
      description: 'Set up team access and collaborative workflows',
      icon: UserGroupIcon,
      href: '#team',
      duration: '25 min',
      difficulty: 'Advanced'
    },
    {
      id: '6',
      title: 'API Integration',
      description: 'Integrate GitTLDR into your development pipeline',
      icon: CommandLineIcon,
      href: '#api',
      duration: '30 min',
      difficulty: 'Advanced'
    }
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const supportOptions = [
    {
      title: 'Documentation',
      description: 'Comprehensive guides and API references',
      icon: BookOpenIcon,
      href: '#docs',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Community Forum',
      description: 'Connect with other developers and get help',
      icon: UserGroupIcon,
      href: '#community',
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Video Tutorials',
      description: 'Step-by-step video guides and walkthroughs',
      icon: PlayIcon,
      href: '#videos',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Contact Support',
      description: 'Get direct help from our support team',
      icon: ChatBubbleLeftRightIcon,
      href: '#contact',
      color: 'from-orange-500 to-orange-600'
    }
  ];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <QuestionMarkCircleIcon className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              How can we help you?
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Find answers, explore guides, and get the support you need to make the most of GitTLDR
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for help articles, guides, or FAQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/95 backdrop-blur-sm rounded-2xl border-0 text-gray-900 placeholder-gray-500 focus:ring-4 focus:ring-white/30 transition-all duration-200 text-lg"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Quick Support Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {supportOptions.map((option) => (
              <Link
                key={option.title}
                href={option.href}
                className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 bg-gradient-to-r ${option.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <option.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {option.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {option.description}
                </p>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Getting Started Guides */}
            <div className="lg:col-span-2">
              <div className="flex items-center mb-8">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mr-4">
                  <BookOpenIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Getting Started Guides
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {guides.map((guide) => (
                  <Link
                    key={guide.id}
                    href={guide.href}
                    className="group bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <guide.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {guide.duration}
                        </span>
                        <div className={`text-xs px-2 py-1 rounded-full mt-1 ${
                          guide.difficulty === 'Beginner' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : guide.difficulty === 'Intermediate'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        }`}>
                          {guide.difficulty}
                        </div>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {guide.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {guide.description}
                    </p>
                  </Link>
                ))}
              </div>

              {/* FAQ Section */}
              <div className="flex items-center mb-8">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-4">
                  <QuestionMarkCircleIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Frequently Asked Questions
                </h2>
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-8">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center px-4 py-2 rounded-full border transition-all duration-200 ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400'
                    }`}
                  >
                    <category.icon className="w-4 h-4 mr-2" />
                    {category.name}
                  </button>
                ))}
              </div>

              {/* FAQ Items */}
              <div className="space-y-4">
                {filteredFAQs.map((faq) => (
                  <div
                    key={faq.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200"
                  >
                    <button
                      onClick={() => toggleFAQ(faq.id)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between focus:outline-none focus:ring-4 focus:ring-blue-500/20 rounded-2xl"
                    >
                      <span className="font-semibold text-gray-900 dark:text-white pr-4">
                        {faq.question}
                      </span>
                      {openFAQItems.has(faq.id) ? (
                        <ChevronUpIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      )}
                    </button>
                    {openFAQItems.has(faq.id) && (
                      <div className="px-6 pb-4">
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredFAQs.length === 0 && (
                <div className="text-center py-12">
                  <MagnifyingGlassIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No results found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try adjusting your search terms or category filter
                  </p>
                </div>
              )}
            </div>

            {/* Contact & Support Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 mb-8">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-3">
                      <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Need More Help?
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Can't find what you're looking for? Our support team is here to help.
                  </p>
                  <div className="space-y-3">
                    <Link
                      href="mailto:support@gittldr.com"
                      className="flex items-center w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <EnvelopeIcon className="w-5 h-5 mr-3" />
                      Email Support
                    </Link>
                    <button className="flex items-center w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                      <ChatBubbleLeftRightIcon className="w-5 h-5 mr-3" />
                      Live Chat
                    </button>
                  </div>
                </div>

                {/* Quick Tips */}
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-yellow-200 dark:border-yellow-700/50">
                  <div className="flex items-center mb-4">
                    <LightBulbIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mr-3" />
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                      Pro Tips
                    </h3>
                  </div>
                  <ul className="space-y-3 text-sm text-yellow-700 dark:text-yellow-300">
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Use specific keywords when asking AI questions about your code
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Process smaller repositories first to understand the workflow
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Check your credit usage regularly in the billing section
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
