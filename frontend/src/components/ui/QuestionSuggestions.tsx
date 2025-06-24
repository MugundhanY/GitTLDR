'use client'

import { useState, useMemo } from 'react'
import { Repository } from '@/contexts/RepositoryContext'
import { 
  LightBulbIcon, 
  CommandLineIcon,
  CogIcon,
  CodeBracketIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  RocketLaunchIcon,
  BugAntIcon,
  ServerIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline'

interface QuestionTemplate {
  id: string
  category: string
  icon: React.ComponentType<any>
  title: string
  description: string
  template: string
  tags: string[]
}

interface QuestionSuggestionsProps {
  repository: Repository
  onSelectQuestion: (question: string) => void
  className?: string
}

// Replace all {repository.name} in template strings with 'this repository' for a more curated experience
const BASE_TEMPLATES: QuestionTemplate[] = [
  // Architecture & Overview
  {
    id: 'architecture',
    category: 'Architecture',
    icon: CodeBracketIcon,
    title: 'Overall Architecture',
    description: 'Understand the high-level structure and design patterns',
    template: `Explain the overall architecture and design patterns used in this repository. How are the main components organized?`,
    tags: ['architecture', 'overview', 'structure']
  },
  // --- Commit-related suggestions ---
  {
    id: 'recent-commits',
    category: 'Commits',
    icon: DocumentTextIcon,
    title: 'Recent Commits',
    description: 'See what has changed recently',
    template: `What are the most recent commits in this repository and what changes did they introduce?`,
    tags: ['commits', 'history', 'recent']
  },
  {
    id: 'commit-author',
    category: 'Commits',
    icon: DocumentTextIcon,
    title: 'Commits by Author',
    description: 'Find out who contributed what',
    template: `Which commits in this repository were made by a specific author and what did they change?`,
    tags: ['commits', 'author', 'contributions']
  },
  {
    id: 'commit-impact',
    category: 'Commits',
    icon: DocumentTextIcon,
    title: 'Impact of a Commit',
    description: 'Understand the effect of a specific commit',
    template: `What is the impact of commit <commit-hash> in this repository? Which files or features did it affect?`,
    tags: ['commits', 'impact', 'changes']
  },
  {
    id: 'getting-started',
    category: 'Getting Started',
    icon: RocketLaunchIcon,
    title: 'Setup & Installation',
    description: 'Learn how to set up and run the project',
    template: `How do I set up and run this repository locally? What are the prerequisites and installation steps?`,
    tags: ['setup', 'installation', 'getting-started']
  },
  {
    id: 'main-entry',
    category: 'Architecture',
    icon: DocumentTextIcon,
    title: 'Main Entry Point',
    description: 'Find and understand the main entry point',
    template: `What is the main entry point of this repository and how does the application start?`,
    tags: ['entry-point', 'main', 'startup']
  },
  
  // Configuration
  {
    id: 'config-files',
    category: 'Configuration',
    icon: CogIcon,
    title: 'Configuration Files',
    description: 'Understand configuration and settings',
    template: `What are the key configuration files in this repository and what do they control?`,
    tags: ['config', 'settings', 'environment']
  },
  {
    id: 'environment',
    category: 'Configuration',
    icon: CogIcon,
    title: 'Environment Setup',
    description: 'Learn about environment variables and settings',
    template: `What environment variables and settings need to be configured for this repository?`,
    tags: ['environment', 'env', 'settings']
  },
  
  // Development
  {
    id: 'dev-workflow',
    category: 'Development',
    icon: CommandLineIcon,
    title: 'Development Workflow',
    description: 'Understand the development process and commands',
    template: `What is the development workflow for this repository? What commands are used for building, testing, and deploying?`,
    tags: ['development', 'workflow', 'commands']
  },
  {
    id: 'testing',
    category: 'Development',
    icon: BugAntIcon,
    title: 'Testing Strategy',
    description: 'Learn about testing approaches and frameworks',
    template: `How is testing implemented in this repository? What testing frameworks and strategies are used?`,
    tags: ['testing', 'tests', 'qa']
  },
  
  // Security
  {
    id: 'security',
    category: 'Security',
    icon: ShieldCheckIcon,
    title: 'Security Measures',
    description: 'Understand security implementations',
    template: `What security measures and best practices are implemented in this repository?`,
    tags: ['security', 'authentication', 'authorization']
  }
];

function getSpecificTemplates(repository: Repository): QuestionTemplate[] {
  const repoName = repository.name.toLowerCase();
  const description = repository.description?.toLowerCase() || '';
  const isWebApp = repoName.includes('web') || repoName.includes('app') || repoName.includes('frontend') || repoName.includes('backend');
  const isAPI = repoName.includes('api') || repoName.includes('server') || description.includes('api');
  const isML = repoName.includes('ml') || repoName.includes('ai') || repoName.includes('model') || description.includes('machine learning');
  const isDatabase = repoName.includes('db') || repoName.includes('database') || description.includes('database');
  const isDevTool = repoName.includes('cli') || repoName.includes('tool') || description.includes('tool');
  const specificTemplates: QuestionTemplate[] = [];

  if (isWebApp) {
    specificTemplates.push(
      {
        id: 'routing',
        category: 'Web Development',
        icon: CodeBracketIcon,
        title: 'Routing System',
        description: 'Understand how routing works',
        template: `How does the routing system work in this repository? What are the main routes and their purposes?`,
        tags: ['routing', 'navigation', 'web']
      },
      {
        id: 'components',
        category: 'Web Development',
        icon: CodeBracketIcon,
        title: 'Component Structure',
        description: 'Learn about component organization',
        template: `How are components structured and organized in this repository? What are the main UI components?`,
        tags: ['components', 'ui', 'frontend']
      }
    )
  }

  if (isAPI) {
    specificTemplates.push(
      {
        id: 'api-endpoints',
        category: 'API',
        icon: ServerIcon,
        title: 'API Endpoints',
        description: 'Explore available API endpoints',
        template: `What are the main API endpoints in this repository and how do they work?`,
        tags: ['api', 'endpoints', 'routes']
      },
      {
        id: 'authentication-api',
        category: 'API',
        icon: ShieldCheckIcon,
        title: 'API Authentication',
        description: 'Understand API authentication mechanisms',
        template: `How does authentication work in the API? What authentication methods are supported?`,
        tags: ['api', 'auth', 'authentication']
      }
    )
  }

  if (isDatabase) {
    specificTemplates.push({
      id: 'database-schema',
      category: 'Database',
      icon: CircleStackIcon,
      title: 'Database Schema',
      description: 'Understand the database structure',
      template: `What is the database schema and structure used in this repository? How are the tables related?`,
      tags: ['database', 'schema', 'models']
    })
  }

  if (isML) {
    specificTemplates.push({
      id: 'ml-models',
      category: 'Machine Learning',
      icon: CodeBracketIcon,
      title: 'ML Models',
      description: 'Understand the machine learning models',
      template: `What machine learning models are implemented in this repository and how do they work?`,
      tags: ['ml', 'models', 'ai']
    })
  }

  if (isDevTool) {
    specificTemplates.push({
      id: 'cli-commands',
      category: 'CLI',
      icon: CommandLineIcon,
      title: 'CLI Commands',
      description: 'Learn about available commands',
      template: `What CLI commands are available in this repository and how do I use them?`,
      tags: ['cli', 'commands', 'tool']
    })
  }
  return specificTemplates;
}

const QuestionSuggestions = ({ repository, onSelectQuestion, className = '' }: QuestionSuggestionsProps) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Only recompute specific templates if name/description changes
  const specificTemplates = useMemo(() => getSpecificTemplates(repository), [repository.name, repository.description]);
  const questionTemplates = useMemo(() => [...BASE_TEMPLATES, ...specificTemplates], [specificTemplates])

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = questionTemplates.map(t => t.category)
    const cats = ['all', ...Array.from(new Set(uniqueCategories))]
    return cats
  }, [questionTemplates])

  // Filter templates by category
  const filteredTemplates = useMemo(() => {
    if (activeCategory === 'all') {
      return questionTemplates
    }
    return questionTemplates.filter(t => t.category === activeCategory)
  }, [questionTemplates, activeCategory])

  const handleSelectTemplate = (template: QuestionTemplate) => {
    onSelectQuestion(template.template)
  }

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-yellow-300 dark:border-yellow-700 shadow-lg ${className}`}>
      <div className="bg-slate-50 dark:bg-slate-800 border-b border-yellow-200 dark:border-yellow-700 px-6 py-4 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center animate-pulse">
            <LightBulbIcon className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Question Suggestions</h2>
        </div>
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mt-3">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 py-1 text-sm rounded-full font-semibold border border-yellow-200 dark:border-yellow-400 shadow-sm transition-colors ${
                activeCategory === category
                  ? 'bg-yellow-300 text-yellow-900 dark:bg-yellow-200 dark:text-yellow-900'
                  : 'bg-yellow-100 dark:bg-yellow-50 text-yellow-800 dark:text-yellow-900 hover:bg-yellow-200 dark:hover:bg-yellow-100'
              }`}
            >
              {category === 'all' ? 'All' : category}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 max-h-96 overflow-y-auto">
        <div className="space-y-3">
          {filteredTemplates.map((template) => {
            const IconComponent = template.icon
            return (
              <div
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="group p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-yellow-400 dark:hover:border-yellow-500 bg-slate-50 dark:bg-slate-800 hover:bg-yellow-50 dark:hover:bg-yellow-100/60 cursor-pointer transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 dark:bg-yellow-200 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 dark:group-hover:bg-yellow-300 transition-colors">
                    <IconComponent className="w-4 h-4 text-yellow-600 dark:text-yellow-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-yellow-800 dark:group-hover:text-yellow-900 transition-colors">
                        {template.title}
                      </h4>
                      <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-50 text-yellow-800 dark:text-yellow-900 font-semibold rounded border border-yellow-200 dark:border-yellow-400 shadow-sm">
                        {template.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 mb-2">
                      {template.description}
                    </p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 italic line-clamp-2">
                      &ldquo;{template.template}&rdquo;
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-50 text-yellow-800 dark:text-yellow-900 font-semibold rounded border border-yellow-200 dark:border-yellow-400 shadow-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {filteredTemplates.length === 0 && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <LightBulbIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No suggestions available for this category.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default QuestionSuggestions
