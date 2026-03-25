"use client";

import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  Tooltip as TooltipRoot,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  className,
}) => {
  return (
    <TooltipProvider>
      <TooltipRoot>
        <TooltipTrigger asChild>
          <span className={className}>{children}</span>
        </TooltipTrigger>
        <TooltipPrimitive.Content
          sideOffset={4}
          className={cn(
            "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
          )}
        >
          <p>{content}</p>
        </TooltipPrimitive.Content>
      </TooltipRoot>
    </TooltipProvider>
  );
};

export default Tooltip;
