import { NavHeader } from "@/components/nav-header";
import { Sidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/components/sidebar-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <NavHeader />
          <main className="flex-1 overflow-auto p-6" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
