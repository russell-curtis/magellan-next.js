import { ReactNode } from "react";
import DashboardTopNav from "./_components/navbar";
import DashboardSideBar from "./_components/sidebar";
import Chatbot from "./_components/chatbot";
import { ErrorBoundary } from "@/components/error-boundary";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden w-full">
      <DashboardSideBar />
      <main className="flex-1 overflow-y-auto">
        <ErrorBoundary>
          <DashboardTopNav>{children}</DashboardTopNav>
        </ErrorBoundary>
      </main>
      <ErrorBoundary>
        <Chatbot />
      </ErrorBoundary>
    </div>
  );
}
