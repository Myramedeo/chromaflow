"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { Download, MoreHorizontal, Trash2 } from "lucide-react";
import type { ExportFormat } from "@/lib/export";

type Props = {
  projectId: string;
  workspaceId: string;
  projectName: string;
  onExport: (format: ExportFormat) => Promise<void>;
  onDelete?: () => Promise<void>;
  canDelete?: boolean;
  disabled?: boolean;
};

export function ProjectExtrasMenu({
  onExport,
  onDelete,
  canDelete = false,
  disabled,
  projectName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(exportFormat);
      setOpen(false);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
      setDeleteOpen(false);
      setOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500 hover:text-gray-900 dark:hover:text-white"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </PopoverTrigger>

        <PopoverContent side="bottom" align="end" className="w-44 p-1">
          <Button
            variant={exportFormat === "csv" ? "secondary" : "ghost"}
            size="sm"
            className="justify-start w-full"
            onClick={() => setExportFormat("csv")}
          >
            CSV
          </Button>

          <Button
            variant={exportFormat === "pdf" ? "secondary" : "ghost"}
            size="sm"
            className="justify-start w-full"
            onClick={() => setExportFormat("pdf")}
          >
            PDF
          </Button>

          <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />

          <Button
            variant="ghost"
            size="sm"
            className="justify-start w-full gap-2"
            onClick={handleExport}
            disabled={disabled || isExporting}
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export"}
          </Button>

          {canDelete && onDelete && (
            <>
              <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
              <Button
                variant="ghost"
                size="sm"
                className="justify-start w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteOpen(true)}
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4" />
                Delete project
              </Button>
            </>
          )}
        </PopoverContent>
      </Popover>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete project"
        description={`"${projectName}" will be removed from this workspace and archived. This frees a project slot on your plan. You can create a new project afterward.`}
        confirmLabel="Delete project"
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </>
  );
}
