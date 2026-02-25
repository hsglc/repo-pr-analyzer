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
          <main
            className="flex-1 overflow-auto p-4 sm:p-5 md:p-6 lg:p-8"
            style={{ backgroundColor: "var(--color-bg-secondary)" }}
          >
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
