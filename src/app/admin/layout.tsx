import React from "react";
import AdminNotifier from "@/components/AdminNotifier";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminNotifier />
      {children}
    </>
  );
}
