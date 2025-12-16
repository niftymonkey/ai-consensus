import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutoScrollOptions {
  enabled?: boolean;
  offset?: number; // Offset from bottom to consider "at bottom" (default: 100px)
  behavior?: ScrollBehavior; // 'smooth' or 'auto' (default: 'smooth')
}

/**
 * Hook for managing auto-scroll behavior as new content appears.
 *
 * Features:
 * - Auto-scrolls to new content as it appears
 * - Pauses when user manually scrolls up
 * - Resumes when user scrolls back to bottom
 * - Persists user preference to localStorage
 */
export function useAutoScroll(options: UseAutoScrollOptions = {}) {
  const {
    enabled: enabledProp = true,
    offset = 100,
    behavior = 'smooth',
  } = options;

  // Get preference from localStorage
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return enabledProp;
    const stored = localStorage.getItem('autoScrollEnabled');
    return stored !== null ? stored === 'true' : enabledProp;
  });

  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Persist preference to localStorage
  useEffect(() => {
    localStorage.setItem('autoScrollEnabled', String(enabled));
  }, [enabled]);

  // Check if user is at bottom of page
  const isAtBottom = useCallback(() => {
    if (typeof window === 'undefined') return false;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;

    return scrollHeight - (scrollTop + clientHeight) <= offset;
  }, [offset]);

  // Handle scroll events to detect manual scrolling away from bottom
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set timeout to check position after scroll settles
      scrollTimeoutRef.current = setTimeout(() => {
        const atBottom = isAtBottom();

        // If enabled and user scrolled away from bottom → disable auto-scroll
        if (enabled && !atBottom) {
          setEnabled(false);
          setIsUserScrolling(true);
        }

        // If at bottom, clear the user scrolling flag
        if (atBottom) {
          setIsUserScrolling(false);
        }
      }, 150); // Debounce to avoid checking during scroll animation
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [enabled, isAtBottom]);

  /**
   * Scroll to a specific element
   */
  const scrollToElement = useCallback((element: HTMLElement | null) => {
    if (typeof window === 'undefined') return;
    if (!enabled || isUserScrolling || !element) return;

    element.scrollIntoView({
      behavior,
      block: 'start',
    });
  }, [enabled, isUserScrolling, behavior]);

  /**
   * Scroll to bottom of page
   */
  const scrollToBottom = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!enabled || isUserScrolling) return;

    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior,
    });
  }, [enabled, isUserScrolling, behavior]);

  /**
   * Scroll to a ref element
   */
  const scrollToRef = useCallback((ref: React.RefObject<HTMLElement>) => {
    scrollToElement(ref.current);
  }, [scrollToElement]);

  /**
   * Toggle auto-scroll preference (disable only - use resumeAutoScroll to re-enable)
   */
  const toggleEnabled = useCallback(() => {
    setEnabled(prev => !prev);
  }, []);

  /**
   * Pause auto-scroll (disable it when user interacts with UI)
   */
  const pauseAutoScroll = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Actually disable auto-scroll, not just pause
    setEnabled(false);
    setIsUserScrolling(true);

    // Clear any pending scroll timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  }, []);

  /**
   * Resume auto-scroll and scroll to bottom (where current content is)
   */
  const resumeAutoScroll = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Re-enable auto-scroll
    setEnabled(true);
    setIsUserScrolling(false);

    // Immediately scroll to bottom where current processing is happening
    setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth',
      });
    }, 100);
  }, []);

  return {
    enabled,
    isUserScrolling,
    scrollToElement,
    scrollToBottom,
    scrollToRef,
    toggleEnabled,
    pauseAutoScroll,
    resumeAutoScroll,
    isAtBottom: typeof window !== 'undefined' ? isAtBottom() : false,
  };
}
