import { ReactNode } from "react";
import ClientDashboardTopNav from "./_components/client-navbar";
import ClientDashboardSideBar from "./_components/client-sidebar";
import { ErrorBoundary } from "@/components/error-boundary";

export default async function ClientDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden w-full">
      <ClientDashboardSideBar />
      <main className="flex-1 overflow-y-auto">
        <ErrorBoundary>
          <ClientDashboardTopNav>{children}</ClientDashboardTopNav>
        </ErrorBoundary>
      </main>
    </div>
  );
}