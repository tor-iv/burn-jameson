'use client'

import { useState, useEffect } from 'react'
import ThreeFireAnimation from '@/components/ThreeFireAnimation'

/**
 * Standalone test page for ThreeFireAnimation
 * Visit: http://localhost:3000/test-3fire
 *
 * This page directly imports and tests the ThreeFireAnimation component
 * without the complexity of the scanning flow. Perfect for debugging.
 */
export default function Test3FirePage() {
  const [animationComplete, setAnimationComplete] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  console.log('[Test3Fire] 🧪 Page rendered', {
    animationComplete,
    isMounted
  })

  // Mock bounding box (centered on screen, 30% width, 80% height)
  const mockBoundingBox = {
    x: 0.35,
    y: 0.1,
    width: 0.3,
    height: 0.8
  }

  // Mock bottle image (1x1 transparent PNG data URL)
  const mockImageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

  const handleAnimationComplete = () => {
    console.log('[Test3Fire] ✅ Animation completed!')
    setAnimationComplete(true)
  }

  const handleRestart = () => {
    console.log('[Test3Fire] 🔄 Restarting animation')
    setAnimationComplete(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-black/50 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-center">
          ThreeFireAnimation Test Page
        </h1>
        <p className="text-sm text-gray-400 text-center mt-2">
          Testing 3fire animation in isolation
        </p>
      </div>

      {/* Instructions */}
      <div className="absolute top-20 left-4 right-4 z-40 bg-blue-900/30 backdrop-blur-sm p-4 rounded-lg border border-blue-500/30">
        <h2 className="font-semibold mb-2">Instructions:</h2>
        <ul className="text-sm space-y-1 text-gray-300">
          <li>• Open browser DevTools console (F12)</li>
          <li>• Watch for [ThreeFireAnimation] logs</li>
          <li>• Animation should play for 6 seconds</li>
          <li>• You should see burning paper with fire particles</li>
          <li>• Check for any errors in the console</li>
        </ul>
      </div>

      {/* Status */}
      <div className="absolute top-64 left-4 right-4 z-40 bg-purple-900/30 backdrop-blur-sm p-3 rounded-lg border border-purple-500/30">
        <div className="text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Status:</span>
            {animationComplete ? (
              <span className="text-green-400">✓ Complete</span>
            ) : (
              <span className="text-yellow-400">⏳ Playing...</span>
            )}
          </div>
          <div className="mt-2">
            <span className="text-gray-400">Bounding Box: {JSON.stringify(mockBoundingBox)}</span>
          </div>
        </div>
      </div>

      {/* Control Button */}
      {animationComplete && (
        <div className="absolute top-80 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={handleRestart}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-semibold shadow-lg transition-colors"
          >
            🔄 Restart Animation
          </button>
        </div>
      )}

      {/* Animation Container */}
      {!animationComplete && (
        <div className="relative w-full h-screen">
          <ThreeFireAnimation
            boundingBox={mockBoundingBox}
            imageUrl={mockImageUrl}
            onBurnComplete={handleAnimationComplete}
          />
        </div>
      )}

      {/* Background Grid (for reference) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="w-full h-full grid grid-cols-10 grid-rows-10">
          {Array.from({ length: 100 }).map((_, i) => (
            <div key={i} className="border border-gray-700" />
          ))}
        </div>
      </div>

      {/* Debug Info */}
      <div className="absolute bottom-4 right-4 z-40 bg-gray-900/80 backdrop-blur-sm p-3 rounded-lg border border-gray-700 text-xs font-mono">
        <div className="text-gray-400">Window Size:</div>
        <div className="text-white">
          {isMounted ? `${window.innerWidth}x${window.innerHeight}` : 'Loading...'}
        </div>
        <div className="text-gray-400 mt-2">Pixel Box:</div>
        <div className="text-white">
          {isMounted ? (
            <>
              x: {Math.round(mockBoundingBox.x * window.innerWidth)}px<br />
              y: {Math.round(mockBoundingBox.y * window.innerHeight)}px<br />
              w: {Math.round(mockBoundingBox.width * window.innerWidth)}px<br />
              h: {Math.round(mockBoundingBox.height * window.innerHeight)}px
            </>
          ) : (
            'Loading...'
          )}
        </div>
      </div>

      {/* WebGL Support Check */}
      <div className="absolute bottom-4 left-4 z-40 bg-gray-900/80 backdrop-blur-sm p-3 rounded-lg border border-gray-700 text-xs">
        <div className="text-gray-400">WebGL Status:</div>
        <div className="text-white">
          {isMounted && (() => {
            try {
              const canvas = document.createElement('canvas')
              const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
              return gl ? '✓ Supported' : '✗ Not Supported'
            } catch (e) {
              return '✗ Error checking'
            }
          })()}
        </div>
      </div>
    </div>
  )
}
