"use client";

import { X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface CustomErrorToastProps {
  id: string | number;
  title: string;
  description: string;
  actionLabel: string;
  actionOnClick: () => void;
  cancelLabel?: string;
  cancelOnClick?: () => void;
}

export function CustomErrorToast({
  id,
  title,
  description,
  actionLabel,
  actionOnClick,
  cancelLabel,
  cancelOnClick,
}: CustomErrorToastProps) {
  const handleAction = () => {
    actionOnClick();
    toast.dismiss(id);
  };

  const handleCancel = () => {
    if (cancelOnClick) cancelOnClick();
    toast.dismiss(id);
  };

  const handleClose = () => {
    toast.dismiss(id);
  };

  return (
    <div className="flex w-full items-start gap-3 rounded-lg border border-border bg-background p-4 shadow-lg">
      <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive mt-0.5" />
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="font-semibold text-foreground leading-5">{title}</div>
            <div className="text-sm text-muted-foreground">{description}</div>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleAction}>
            {actionLabel}
          </Button>
          {cancelLabel && (
            <Button size="sm" variant="secondary" onClick={handleCancel}>
              {cancelLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
