// Export utilities for analytics data

export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
    }).join(','))
  ].join('\n');
  
  downloadFile(csvContent, filename + '.csv', 'text/csv');
};

export const exportToJSON = (data: any, filename: string) => {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename + '.json', 'application/json');
};

export const exportAnalyticsReport = (analytics: any, timeRange: string) => {
  const report = {
    generated: new Date().toISOString(),
    timeRange,
    summary: {
      totalUsers: analytics.overview?.totalUsers || 0,
      totalRepositories: analytics.overview?.totalRepositories || 0,
      totalMeetings: analytics.overview?.totalMeetings || 0,
      totalQuestions: analytics.overview?.totalQuestions || 0,
      totalFiles: analytics.overview?.totalFiles || 0,
      totalStorageGB: analytics.overview?.totalStorageGB || 0
    },
    meetingStats: analytics.meetingStats || {},
    qaStats: analytics.qaStats || {},
    fileStats: analytics.fileStats || {},
    userActivity: analytics.userActivity || {}
  };
  
  exportToJSON(report, `analytics-report-${timeRange}-${new Date().toISOString().split('T')[0]}`);
};

const downloadFile = (content: string, filename: string, contentType: string) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

export const formatAnalyticsForSharing = (analytics: any, timeRange: string) => {
  return `📊 Analytics Report (${timeRange})

👥 Team: ${analytics.overview?.totalUsers || 0} users
📁 Projects: ${analytics.overview?.totalRepositories || 0} repositories  
🎥 Meetings: ${analytics.overview?.totalMeetings || 0} total
❓ Q&A: ${analytics.overview?.totalQuestions || 0} questions
📄 Files: ${analytics.overview?.totalFiles || 0} processed
💾 Storage: ${(analytics.overview?.totalStorageGB || 0).toFixed(1)} GB

Generated: ${new Date().toLocaleDateString()}`;
};
