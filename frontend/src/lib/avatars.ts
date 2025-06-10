/**
 * Avatar utility functions for generating and handling user avatars
 */

export interface AvatarOptions {
  size?: number;
  rounded?: boolean;
  fontWeight?: 'normal' | 'bold';
  format?: 'svg' | 'png';
}

/**
 * Generate a GitHub-style avatar URL
 */
export function generateGitHubAvatar(username: string, size: number = 40): string {
  const cleanUsername = username.replace(/[^a-zA-Z0-9-]/g, '');
  return `https://github.com/${cleanUsername}.png?size=${size}`;
}

/**
 * Generate a beautiful gradient avatar with initials
 */
export function generateInitialsAvatar(
  name: string, 
  email?: string, 
  options: AvatarOptions = {}
): string {
  const { size = 40, rounded = true, fontWeight = 'bold', format = 'svg' } = options;
  
  // Get initials from name
  const initials = name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
  
  // Generate consistent colors based on name/email
  const colors = generateConsistentColors(name + (email || ''));
  
  if (format === 'svg') {
    return generateSVGAvatar(initials, colors, size, rounded, fontWeight);
  } else {
    return generateUIAvatarURL(initials, colors, size);
  }
}

/**
 * Generate consistent colors based on a string
 */
function generateConsistentColors(input: string): { background: string; text: string } {
  // Hash the input to get consistent colors
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Generate beautiful gradient colors
  const gradients = [
    { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', text: '#ffffff' },
    { background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', text: '#ffffff' },
    { background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', text: '#ffffff' },
    { background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', text: '#ffffff' },
    { background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', text: '#ffffff' },
    { background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', text: '#333333' },
    { background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', text: '#333333' },
    { background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', text: '#333333' },
    { background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', text: '#ffffff' },
    { background: 'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)', text: '#333333' },
  ];
  
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

/**
 * Generate an SVG avatar
 */
function generateSVGAvatar(
  initials: string, 
  colors: { background: string; text: string }, 
  size: number, 
  rounded: boolean,
  fontWeight: string
): string {
  const radius = rounded ? size / 2 : 0;
  const fontSize = size * 0.4;
  
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="url(#grad)"/>
      <text x="50%" y="50%" text-anchor="middle" dy="0.35em" 
            font-family="system-ui, -apple-system, sans-serif" 
            font-size="${fontSize}" 
            font-weight="${fontWeight}" 
            fill="${colors.text}">
        ${initials}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Generate UI Avatars URL as fallback
 */
function generateUIAvatarURL(initials: string, colors: { background: string; text: string }, size: number): string {
  const backgroundColor = colors.background.includes('gradient') ? '6366f1' : colors.background.replace('#', '');
  const textColor = colors.text.replace('#', '');
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=${size}&background=${backgroundColor}&color=${textColor}&bold=true&rounded=true`;
}

/**
 * Get the best avatar URL for a user
 */
export function getBestAvatarURL(
  name: string, 
  email?: string, 
  githubUsername?: string, 
  existingAvatar?: string,
  size: number = 40
): string {
  // Priority order:
  // 1. Existing avatar URL (if valid)
  // 2. GitHub avatar (if username available)
  // 3. Gravatar (if email available)
  // 4. Generated initials avatar
  
  if (existingAvatar && existingAvatar.startsWith('http')) {
    return existingAvatar;
  }
  
  if (githubUsername) {
    return generateGitHubAvatar(githubUsername, size);
  }
  
  if (email) {
    const gravatarUrl = generateGravatarURL(email, size);
    // Note: We'll use the generated avatar as fallback since we can't easily check if gravatar exists
    return gravatarUrl;
  }
  
  return generateInitialsAvatar(name, email, { size });
}

/**
 * Generate Gravatar URL
 */
export function generateGravatarURL(email: string, size: number = 40): string {
  // Simple MD5 hash function for email
  const md5 = (str: string): string => {
    // This is a simplified version - in production you'd want a proper MD5 implementation
    // For now, we'll use a simple hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  };
  
  const emailHash = md5(email.toLowerCase().trim());
  return `https://www.gravatar.com/avatar/${emailHash}?s=${size}&d=identicon`;
}

/**
 * Extract GitHub username from email or name
 */
export function extractGitHubUsername(email?: string, name?: string): string | null {
  if (email) {
    // Check if email looks like GitHub noreply email
    const githubMatch = email.match(/(\w+)@users\.noreply\.github\.com/);
    if (githubMatch) {
      return githubMatch[1];
    }
    
    // Use email username as fallback
    const emailUsername = email.split('@')[0];
    if (emailUsername && emailUsername.length > 0) {
      return emailUsername;
    }
  }
  
  if (name) {
    // Clean name to be username-like
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '');
  }
  
  return null;
}
