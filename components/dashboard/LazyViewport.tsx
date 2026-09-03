"use client";

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
  const ref =
    useRef<HTMLDivElement | null>(null);

  const [
    shouldRender,
    setShouldRender,
  ] = useState(false);

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
      setShouldRender(true);
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
        shouldRender
          ? undefined
          : minHeightClassName
      }
    >
      {shouldRender
        ? children
        : fallback ?? null}
    </div>
  );
}
