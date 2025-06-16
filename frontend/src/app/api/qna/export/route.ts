import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/qna/export - Export Q&A sessions as documentation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('repositoryId');
    const userId = searchParams.get('userId');
    const format = searchParams.get('format') || 'markdown'; // markdown, json, html
    const favoritesOnly = searchParams.get('favoritesOnly') === 'true';
    const category = searchParams.get('category');

    if (!repositoryId || !userId) {
      return NextResponse.json(
        { error: 'Repository ID and user ID are required' },
        { status: 400 }
      );
    }

    // Build where clause
    const whereClause: any = {
      repositoryId,
      userId,
    };

    if (favoritesOnly) {
      whereClause.isFavorite = true;
    }

    if (category) {
      whereClause.category = category;
    }

    // Fetch questions for export
    const questions = await prisma.question.findMany({
      where: whereClause,
      include: {
        repository: {
          select: {
            name: true,
            description: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions found for export' },
        { status: 404 }
      );
    }

    const repository = questions[0].repository;
    const exportDate = new Date().toISOString().split('T')[0];

    let exportContent = '';
    let fileName = '';
    let mimeType = '';

    switch (format) {
      case 'markdown':
        fileName = `${repository?.name || 'repository'}-qna-${exportDate}.md`;
        mimeType = 'text/markdown';
        exportContent = generateMarkdownExport(questions, repository);
        break;
      
      case 'html':
        fileName = `${repository?.name || 'repository'}-qna-${exportDate}.html`;
        mimeType = 'text/html';
        exportContent = generateHTMLExport(questions, repository);
        break;
      
      case 'json':
        fileName = `${repository?.name || 'repository'}-qna-${exportDate}.json`;
        mimeType = 'application/json';
        exportContent = JSON.stringify({
          repository: repository,
          exportDate: exportDate,
          questionsCount: questions.length,
          questions: questions.map(q => ({
            id: q.id,
            query: q.query,
            answer: q.answer,
            createdAt: q.createdAt.toISOString(),
            updatedAt: q.updatedAt.toISOString(),
            confidence: q.confidenceScore,
            relevantFiles: q.relevantFiles,
            isFavorite: q.isFavorite,
            tags: q.tags,
            category: q.category,
            notes: q.notes
          }))
        }, null, 2);
        break;
      
      default:
        return NextResponse.json(
          { error: 'Unsupported format. Use markdown, html, or json' },
          { status: 400 }
        );
    }

    await prisma.$disconnect();

    return new NextResponse(exportContent, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error('Error exporting Q&A:', error);
    await prisma.$disconnect();
    return NextResponse.json(
      { error: 'Failed to export Q&A' },
      { status: 500 }
    );
  }
}

function generateMarkdownExport(questions: any[], repository: any) {
  const exportDate = new Date().toISOString().split('T')[0];
  
  let markdown = `# Q&A Documentation: ${repository?.name || 'Repository'}\n\n`;
  
  if (repository?.description) {
    markdown += `**Description:** ${repository.description}\n\n`;
  }
  
  markdown += `**Export Date:** ${exportDate}\n`;
  markdown += `**Total Questions:** ${questions.length}\n\n`;
    // Group by category if available
  const categorized = questions.reduce((acc, q) => {
    const category = q.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(q);
    return acc;
  }, {} as Record<string, typeof questions>);

  Object.entries(categorized).forEach(([category, categoryQuestions]) => {
    markdown += `## ${category}\n\n`;
    
    (categoryQuestions as typeof questions).forEach((question, index) => {
      markdown += `### ${index + 1}. ${question.query}\n\n`;
      
      if (question.isFavorite) {
        markdown += `⭐ **Favorite**\n\n`;
      }
      
      if (question.tags && question.tags.length > 0) {
        markdown += `**Tags:** ${question.tags.map((tag: string) => `\`${tag}\``).join(', ')}\n\n`;
      }
      
      if (question.answer) {
        markdown += `**Answer:**\n\n${question.answer}\n\n`;
      }
      
      if (question.relevantFiles && question.relevantFiles.length > 0) {
        markdown += `**Related Files:**\n`;
        question.relevantFiles.forEach((file: string) => {
          markdown += `- \`${file}\`\n`;
        });
        markdown += `\n`;
      }
      
      if (question.notes) {
        markdown += `**Notes:** ${question.notes}\n\n`;
      }
      
      if (question.confidenceScore) {
        markdown += `**Confidence:** ${Math.round(question.confidenceScore * 100)}%\n\n`;
      }
      
      markdown += `**Created:** ${new Date(question.createdAt).toLocaleString()}\n\n`;
      markdown += `---\n\n`;
    });
  });
  
  return markdown;
}

function generateHTMLExport(questions: any[], repository: any) {
  const exportDate = new Date().toISOString().split('T')[0];
  
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Q&A Documentation: ${repository?.name || 'Repository'}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 2px solid #e1e5e9; padding-bottom: 20px; margin-bottom: 30px; }
        .question { border: 1px solid #e1e5e9; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .question-title { color: #0366d6; margin-bottom: 10px; }
        .answer { background: #f6f8fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .metadata { font-size: 0.9em; color: #586069; margin-top: 15px; }
        .favorite { color: #ffd700; }
        .tags { margin: 10px 0; }
        .tag { background: #0366d6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; margin-right: 5px; }
        .files { margin: 10px 0; }
        .file { background: #f1f3f4; padding: 2px 6px; border-radius: 4px; font-family: monospace; margin-right: 5px; }
        pre { background: #f6f8fa; padding: 15px; border-radius: 6px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Q&A Documentation: ${repository?.name || 'Repository'}</h1>`;
  
  if (repository?.description) {
    html += `<p><strong>Description:</strong> ${repository.description}</p>`;
  }
  
  html += `<p><strong>Export Date:</strong> ${exportDate}</p>
        <p><strong>Total Questions:</strong> ${questions.length}</p>
    </div>`;
    // Group by category
  const categorized = questions.reduce((acc, q) => {
    const category = q.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(q);
    return acc;
  }, {} as Record<string, typeof questions>);

  Object.entries(categorized).forEach(([category, categoryQuestions]) => {
    html += `<h2>${category}</h2>`;
    
    (categoryQuestions as typeof questions).forEach((question, index) => {
      html += `<div class="question">
        <h3 class="question-title">${index + 1}. ${escapeHtml(question.query)}</h3>`;
      
      if (question.isFavorite) {
        html += `<span class="favorite">⭐ Favorite</span><br>`;
      }
      
      if (question.tags && question.tags.length > 0) {
        html += `<div class="tags">`;
        question.tags.forEach((tag: string) => {
          html += `<span class="tag">${escapeHtml(tag)}</span>`;
        });
        html += `</div>`;
      }
      
      if (question.answer) {
        html += `<div class="answer">
          <strong>Answer:</strong><br>
          <pre>${escapeHtml(question.answer)}</pre>
        </div>`;
      }
      
      if (question.relevantFiles && question.relevantFiles.length > 0) {
        html += `<div class="files"><strong>Related Files:</strong><br>`;
        question.relevantFiles.forEach((file: string) => {
          html += `<span class="file">${escapeHtml(file)}</span>`;
        });
        html += `</div>`;
      }
      
      if (question.notes) {
        html += `<p><strong>Notes:</strong> ${escapeHtml(question.notes)}</p>`;
      }
      
      html += `<div class="metadata">`;
      if (question.confidenceScore) {
        html += `Confidence: ${Math.round(question.confidenceScore * 100)}% • `;
      }
      html += `Created: ${new Date(question.createdAt).toLocaleString()}
        </div>
      </div>`;
    });
  });
  
  html += `</body></html>`;
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
