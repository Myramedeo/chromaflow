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
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <WorkspaceSearchCommand />
    </div>
  );
}
 