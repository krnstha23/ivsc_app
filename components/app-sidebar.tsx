"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import LayoutDashboardIcon from "@/components/ui/layout-dashboard-icon";
import LayersIcon from "@/components/ui/layers-icon";
import ShoppingCartIcon from "@/components/ui/shopping-cart-icon";
import UsersIcon from "@/components/ui/users-icon";
import AlarmClockPlusIcon from "@/components/ui/alarm-clock-plus-icon";

import { NavMain } from "@/components/nav-main";
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { filterByRole, type Role } from "@/lib/permissions";

// Single dashboard: admins see all, teachers see teacher pages, users see user pages only.
const NAV_MAIN = [
    // Shared (all roles)
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboardIcon,
        allowedRoles: ["ADMIN", "TEACHER", "USER"] as Role[],
    },
    {
        title: "Calendar",
        url: "/calendar",
        icon: AlarmClockPlusIcon,
        allowedRoles: ["ADMIN", "TEACHER", "USER"] as Role[],
    },
    {
        title: "Users",
        url: "/users",
        icon: UsersIcon,
        allowedRoles: ["ADMIN"] as Role[],
    },
    {
        title: "Teachers",
        url: "/teachers",
        icon: UsersIcon,
        allowedRoles: ["ADMIN", "TEACHER", "USER"] as Role[],
    },
    {
        title: "Students",
        url: "/students",
        icon: ShoppingCartIcon,
        allowedRoles: ["ADMIN", "TEACHER", "USER"] as Role[],
    },
    {
        title: "Packages",
        url: "/packages",
        icon: ShoppingCartIcon,
        allowedRoles: ["ADMIN", "TEACHER", "USER"] as Role[],
    },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { data: session, status } = useSession();
    const role = (session?.user as { role?: string } | undefined)?.role as
        | Role
        | undefined;

    const navMain = React.useMemo(() => filterByRole(NAV_MAIN, role), [role]);

    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:p-1.5!"
                        >
                            <a href="/dashboard">
                                <LayersIcon size={20} className="size-5!" />
                                <span className="text-base font-semibold">
                                    IVCS
                                </span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                {status !== "loading" && (
                    <>
                        <NavMain items={navMain} />
                    </>
                )}
            </SidebarContent>
        </Sidebar>
    );
}
