"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  requireTypedConfirmation?: string;
  onConfirm: () => Promise<void>;
  loading?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  requireTypedConfirmation,
  onConfirm,
  loading = false,
}: ConfirmDeleteDialogProps) {
  const [typed, setTyped] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next) setTyped("");
    onOpenChange(next);
  }

  const confirmationMatches =
    !requireTypedConfirmation || typed === requireTypedConfirmation;

  async function handleConfirm() {
    if (!confirmationMatches) return;
    await onConfirm();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {requireTypedConfirmation && (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-delete-input">
              Type{" "}
              <span className="font-medium">&quot;{requireTypedConfirmation}&quot;</span>
              {" "}to confirm.
            </Label>
            <Input
              id="confirm-delete-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireTypedConfirmation}
              autoComplete="off"
            />
          </div>
        )}

        <DialogFooter className="border-t-0 bg-transparent p-4 pt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || !confirmationMatches}
          >
            {loading ? "Deleting…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
