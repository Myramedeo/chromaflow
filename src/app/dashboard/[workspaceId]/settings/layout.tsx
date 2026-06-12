"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Users, CreditCard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const pathname = usePathname();

  const tabs = [
    {
      href: `/dashboard/${workspaceId}/settings/general`,
      label: "General",
      icon: Settings,
    },
    {
      href: `/dashboard/${workspaceId}/settings/members`,
      label: "Members",
      icon: Users,
    },
    {
      href: `/dashboard/${workspaceId}/settings/billing`,
      label: "Billing",
      icon: CreditCard,
    },
  ];

  return (
    <div className="pt-8">
      <div className="mx-auto max-w-4xl px-8">
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex items-center gap-2" aria-label="Settings sections">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "border-indigo-500 text-indigo-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
