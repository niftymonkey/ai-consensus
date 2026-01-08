"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";

const SCROLL_MILESTONES = [25, 50, 75, 100];

export function ScrollTracker() {
  const reachedMilestones = useRef<Set<number>>(new Set());
  const hasScrolled = useRef(false);
  const pageLoadTime = useRef<number>(Date.now());

  useEffect(() => {
    const handleScroll = () => {
      // Track time to first scroll
      if (!hasScrolled.current) {
        hasScrolled.current = true;
        const timeToScroll = Date.now() - pageLoadTime.current;
        posthog.capture("first_scroll", {
          time_to_scroll_ms: timeToScroll,
          time_to_scroll_seconds: Math.round(timeToScroll / 1000),
        });
      }

      // Calculate scroll depth percentage
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

      // Check for milestone crossings
      for (const milestone of SCROLL_MILESTONES) {
        if (scrollPercent >= milestone && !reachedMilestones.current.has(milestone)) {
          reachedMilestones.current.add(milestone);
          posthog.capture("scroll_depth_reached", {
            depth_percent: milestone,
          });
        }
      }
    };

    // Use passive listener for better scroll performance
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
