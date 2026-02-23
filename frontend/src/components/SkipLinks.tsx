/**
 * SkipLinks Component - Accessibility navigation shortcuts
 * Allows keyboard users to jump to main content areas
 */

export default function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <a
        href="#main-content"
        className="absolute top-0 left-0 bg-blue-600 text-white px-4 py-2 text-sm font-medium rounded-br-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-50"
      >
        Skip to main content
      </a>
      <a
        href="#main-nav"
        className="absolute top-0 left-32 bg-blue-600 text-white px-4 py-2 text-sm font-medium rounded-br-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-50"
      >
        Skip to navigation
      </a>
    </div>
  );
}

