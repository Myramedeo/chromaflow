export type ExportFormat = "csv" | "pdf";

export async function exportTasks(
  workspaceId: string,
  projectId: string,
  projectName: string,
  format: ExportFormat
) {
  try {
    const response = await fetch(
      `/api/workspaces/${workspaceId}/projects/${projectId}/export/${format}`
    );

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectName}-tasks-${new Date().toISOString().split("T")[0]}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to export tasks:", error);
    throw error;
  }
}
