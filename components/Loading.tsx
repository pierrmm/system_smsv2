"use client";
import React from 'react';

type Size = "sm" | "md" | "lg";

export function Loading({
  message,
  size = "md",
  fullscreen = false,
  className = "",
}: {
  message?: string;
  size?: Size;
  fullscreen?: boolean;
  className?: string;
}) {
  const wrapper = fullscreen
    ? "min-h-screen flex items-center justify-center"
    : "flex items-center justify-center";

  const sizeClass = size === "lg" ? "sms-loader-lg" : size === "sm" ? "sms-loader-sm" : "sms-loader-md";

  return (
    <div className={`${wrapper} ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <div className={`sms-loader ${sizeClass}`} aria-label="Loading" />
        {message && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
        )}
      </div>
    </div>
  );
}

export default Loading;

