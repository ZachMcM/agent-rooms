import { createMDX } from 'fumadocs-mdx/next'

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: ['@agent-rooms/ui-library'],
}

const withMDX = createMDX()

export default withMDX(config)
