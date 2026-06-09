import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WeShare Admin",
  robots: { index: false, follow: false },
};

export default function AdminVerifyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
