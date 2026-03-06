import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Transpile app lib + R3F packages so they use the app's React (fixes ReactCurrentOwner in dynamic chunks)
  transpilePackages: ['sport-assets', '@react-three/fiber', '@react-three/drei', '@react-three/rapier'],
  // bundle-barrel-imports: optimize three/drei imports (fewer modules, faster dev/build)
  experimental: {
    optimizePackageImports: ['@react-three/drei', '@react-three/fiber'],
  },
  // Note: Custom react/react-dom aliases were removed because Turbopack does not support
  // absolute paths in resolveAlias. If you see ReactCurrentOwner warnings with R3F,
  // run with webpack: next build --no-turbopack (or next dev --webpack) and add aliases there.
}

export default nextConfig
