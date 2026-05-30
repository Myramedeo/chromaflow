// Server Component shell
// Sidebar is a Client Component nested inside.
 
import { Sidebar } from "../../components/layout/Sidebar";
import WorkspaceSearchCommand from "@/components/search/WorkspaceSearchCommand";
 
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto dark:bg-gray-950">{children}</main>
      <WorkspaceSearchCommand />
    </div>
  );
}
 