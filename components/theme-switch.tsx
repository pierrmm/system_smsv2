"use client";

import { FC } from "react";
import { VisuallyHidden } from "@react-aria/visually-hidden";
import { SwitchProps, useSwitch } from "@heroui/switch";
import { useTheme } from "next-themes";
import { useIsSSR } from "@react-aria/ssr";
import clsx from "clsx";

import { SunFilledIcon, MoonFilledIcon } from "@/components/icons";

export interface ThemeSwitchProps {
  className?: string;
  classNames?: SwitchProps["classNames"];
}

export const ThemeSwitch: FC<ThemeSwitchProps> = ({
  className,
  classNames,
}) => {
  const { theme, setTheme } = useTheme();
  const isSSR = useIsSSR();

  const onChange = () => {
    theme === "light" ? setTheme("dark") : setTheme("light");
  };

  const {
    Component,
    slots,
    isSelected,
    getBaseProps,
    getInputProps,
    getWrapperProps,
  } = useSwitch({
    isSelected: theme === "light" || isSSR,
    "aria-label": `Switch to ${theme === "light" || isSSR ? "dark" : "light"} mode`,
    onChange,
  });

  return (
    <Component
      {...getBaseProps({
        className: clsx(
          "px-px transition-opacity hover:opacity-80 cursor-pointer",
          className,
          classNames?.base,
        ),
      })}
    >
      <VisuallyHidden>
        <input {...getInputProps()} />
      </VisuallyHidden>
      <div
        {...getWrapperProps()}
        className={slots.wrapper({
          class: clsx(
            [
              "w-9 h-9",
              "rounded-full",
              "border border-neutral-300 dark:border-neutral-600",
              "bg-neutral-100 dark:bg-neutral-800",
              "flex items-center justify-center",
              "shadow-sm",
              "transition-colors",
              "hover:bg-neutral-200 dark:hover:bg-neutral-700",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-offset-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600",
              "!text-neutral-700 dark:!text-neutral-200",
            ],
            classNames?.wrapper,
          ),
        })}
      >
        {!isSelected || isSSR ? (
          <SunFilledIcon size={18} />
        ) : (
          <MoonFilledIcon size={18} />
        )}
      </div>
    </Component>
  );
};
