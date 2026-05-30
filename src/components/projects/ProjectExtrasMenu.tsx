"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, MoreHorizontal } from "lucide-react";
import type { ExportFormat } from "@/lib/export";

type Props = {
  projectId: string;
  workspaceId: string;
  projectName: string;
  onExport: (format: ExportFormat) => Promise<void>;
  disabled?: boolean;
};

export function ProjectExtrasMenu({
  onExport,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(exportFormat);
      setOpen(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
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
      </PopoverContent>
    </Popover>
  );
}