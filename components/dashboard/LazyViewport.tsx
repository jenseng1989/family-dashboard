"use client";
import { useHydrated } from "@/lib/hooks/use-client-clock";

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

type LazyViewportProps = {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  minHeightClassName?: string;
};

export default function LazyViewport({
  children,
  fallback,
  rootMargin = "500px 0px",
  minHeightClassName = "min-h-48",
}: LazyViewportProps) {
  const hydrated = useHydrated();
  const ref =
    useRef<HTMLDivElement | null>(null);

  const [
    shouldRender,
    setShouldRender,
  ] = useState(false);

  const shouldShow = shouldRender || (hydrated && !("IntersectionObserver" in window));

  useEffect(() => {
    if (shouldRender) {
      return;
    }

    const element =
      ref.current;

    if (!element) {
      return;
    }

    if (
      !(
        "IntersectionObserver" in
        window
      )
    ) {
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          if (
            entries.some(
              (entry) =>
                entry.isIntersecting
            )
          ) {
            setShouldRender(
              true
            );
            observer.disconnect();
          }
        },
        {
          rootMargin,
        }
      );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [
    rootMargin,
    shouldRender,
  ]);

  return (
    <div
      ref={ref}
      className={
        shouldShow
          ? undefined
          : minHeightClassName
      }
    >
      {shouldShow
        ? children
        : fallback ?? null}
    </div>
  );
}
