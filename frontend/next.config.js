/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'avatars.githubusercontent.com', 
      'github.com',
      'avatars0.githubusercontent.com',
      'avatars1.githubusercontent.com', 
      'avatars2.githubusercontent.com',
      'avatars3.githubusercontent.com',
      'secure.gravatar.com'
    ],
  },
  env: {
    CUSTOM_KEY: 'gittldr',
  },
}

module.exports = nextConfig
