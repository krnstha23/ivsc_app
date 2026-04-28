"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import {
    Widget4,
    AlarmAdd,
    UsersGroupRounded,
    CartLarge2,
    LayersMinimalistic,
    UserRounded,
    CalendarMark,
    Notebook,
    UserCheck,
    CalendarDate,
    Chart,
    Document,
    DocumentText,
} from "@solar-icons/react";

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

const NAV_MAIN = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: Widget4,
        allowedRoles: ["ADMIN", "TEACHER", "USER"] as Role[],
    },
    {
        title: "Profile",
        url: "/profile",
        icon: UserRounded,
        allowedRoles: ["ADMIN", "TEACHER", "USER"] as Role[],
    },
    {
        title: "My Bookings",
        url: "/bookings",
        icon: CalendarMark,
        allowedRoles: ["USER"] as Role[],
    },
    {
        title: "My Sessions",
        url: "/bookings/teaching",
        icon: Notebook,
        allowedRoles: ["ADMIN", "TEACHER"] as Role[],
    },
    {
        title: "Calendar",
        url: "/calendar",
        icon: AlarmAdd,
        allowedRoles: ["ADMIN"] as Role[],
    },
    {
        title: "Users",
        url: "/users",
        icon: UsersGroupRounded,
        allowedRoles: ["ADMIN"] as Role[],
    },
    {
        title: "Teachers",
        url: "/teachers",
        icon: UsersGroupRounded,
        allowedRoles: ["ADMIN", "TEACHER"] as Role[],
    },
    {
        title: "Manage Teachers",
        url: "/teachers/manage",
        icon: UserCheck,
        allowedRoles: ["ADMIN"] as Role[],
    },
    {
        title: "Book a Session",
        url: "/students",
        icon: CartLarge2,
        allowedRoles: ["USER"] as Role[],
    },
    {
        title: "Packages",
        url: "/packages",
        icon: CartLarge2,
        allowedRoles: ["ADMIN"] as Role[],
    },
    {
        title: "Question Bank",
        url: "/question-bank",
        icon: DocumentText,
        allowedRoles: ["ADMIN", "TEACHER"] as Role[],
    },
    {
        title: "Timetable",
        url: "/timetable",
        icon: CalendarDate,
        allowedRoles: ["ADMIN"] as Role[],
    },
    {
        title: "Static Pages",
        url: "/pages",
        icon: Document,
        allowedRoles: ["ADMIN"] as Role[],
    },
    {
        title: "Reports",
        url: "/reports",
        icon: Chart,
        allowedRoles: ["ADMIN"] as Role[],
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
                                <LayersMinimalistic
                                    size={20}
                                    className="size-5!"
                                />
                                <span className="text-base font-semibold">
                                    Admin panel
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
