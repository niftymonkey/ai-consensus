"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import posthog from "posthog-js";

const sections = [
  { id: "problem-solution", label: "Problem & Solution" },
  { id: "how-it-works", label: "How It Works" },
  { id: "features", label: "Features" },
  { id: "cta", label: "Get Started" },
];

export function SectionNav() {
  const [activeSection, setActiveSection] = useState("hero");
  const [isVisible, setIsVisible] = useState(false);
  const visibleSections = useRef<Map<string, number>>(new Map());
  const viewedSections = useRef<Set<string>>(new Set());

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    // Track hero visibility to show/hide nav
    const heroElement = document.getElementById("hero");
    if (heroElement) {
      const heroObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // Hide nav when hero is mostly visible
            setIsVisible(!entry.isIntersecting);
            if (entry.isIntersecting) {
              setActiveSection("hero");
            }
          });
        },
        {
          rootMargin: "-20% 0px 0px 0px",
          threshold: 0,
        }
      );
      heroObserver.observe(heroElement);
      observers.push(heroObserver);
    }

    // Function to determine which section should be active
    const updateActiveSection = () => {
      // Check if we're near the bottom of the page - if so, activate the last section
      const scrolledToBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100;

      if (scrolledToBottom) {
        setActiveSection("cta");
        return;
      }

      if (visibleSections.current.size === 0) return;

      // Find the section with the highest intersection ratio
      let maxRatio = 0;
      let activeId = "";

      visibleSections.current.forEach((ratio, id) => {
        if (ratio > maxRatio) {
          maxRatio = ratio;
          activeId = id;
        }
      });

      if (activeId) {
        setActiveSection(activeId);
      }
    };

    // Also listen for scroll events to catch bottom-of-page
    const handleScroll = () => {
      const scrolledToBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100;

      if (scrolledToBottom) {
        setActiveSection("cta");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Track other sections with intersection ratios
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id;
          if (entry.isIntersecting) {
            visibleSections.current.set(id, entry.intersectionRatio);

            // Track first view of each section
            if (!viewedSections.current.has(id)) {
              viewedSections.current.add(id);
              posthog.capture("section_viewed", {
                section: id,
                section_label: sections.find(s => s.id === id)?.label,
              });
            }
          } else {
            visibleSections.current.delete(id);
          }
        });
        updateActiveSection();
      },
      {
        rootMargin: "-10% 0px -10% 0px",
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
      }
    );

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        sectionObserver.observe(element);
      }
    });
    observers.push(sectionObserver);

    return () => {
      observers.forEach((observer) => observer.disconnect());
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleClick = (id: string, label: string) => {
    posthog.capture("section_nav_clicked", {
      target_section: id,
      target_label: label,
      from_section: activeSection,
    });

    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Don't render when on hero section
  if (!isVisible) return null;

  return (
    <nav
      className="fixed right-4 lg:right-8 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col items-center gap-3 animate-in fade-in duration-300"
      aria-label="Page sections"
    >
      {sections.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => handleClick(id, label)}
          className="group relative flex items-center"
          aria-label={`Go to ${label}`}
          aria-current={activeSection === id ? "true" : undefined}
        >
          {/* Tooltip */}
          <span
            className={cn(
              "absolute right-full mr-3 px-2 py-1 text-xs font-medium rounded bg-popover border shadow-sm whitespace-nowrap",
              "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0",
              "transition-all duration-200 pointer-events-none"
            )}
          >
            {label}
          </span>

          {/* Dot */}
          <span
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-all duration-300 border",
              activeSection === id
                ? "bg-primary border-primary scale-125 shadow-sm shadow-primary/50"
                : "bg-foreground/20 border-foreground/40 hover:bg-foreground/40 hover:scale-110"
            )}
          />
        </button>
      ))}
    </nav>
  );
}
