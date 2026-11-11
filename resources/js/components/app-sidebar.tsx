import { Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Bell,
    CalendarOff,
    ClipboardList,
    Clock,
    LayoutGrid,
    Plus,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { auth } = usePage<{ auth: { user: { role?: string } | null } }>().props;
    const role = auth.user?.role;
    const isAdmin = role === 'administrator';
    const isHr    = role === 'hr';
    const isEmployee = role === 'employee';

    const mainNavItems: NavItem[] = [
        { title: 'Tableau de bord', href: dashboard(),         icon: LayoutGrid },
        { title: 'Demandes',        href: '/leave-requests',   icon: ClipboardList },
        { title: 'Jours de repos',  href: '/rest-days',        icon: CalendarOff },
        { title: 'Pointage',        href: '/attendance',       icon: Clock },
        { title: 'Pings',           href: '/pings',            icon: Bell },
    ];

    // Anomalies : visible pour manager, admin, hr mais PAS pour l'employé standard
    // (l'employé peut justifier ses anomalies via la page pointage ou depuis une notification)
    if (! isEmployee) {
        mainNavItems.push({ title: 'Anomalies', href: '/anomalies', icon: AlertTriangle });
    }

    if (isAdmin) {
        mainNavItems.push({ title: 'Utilisateurs', href: '/users', icon: Users });
    }

    // Non-admin users can submit a leave request
    const canRequest = ! isAdmin;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {canRequest && (
                    <SidebarGroup className="px-2 pb-0">
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    tooltip="Nouvelle demande"
                                    className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                                >
                                    <Link href="/leave-requests?new=1">
                                        <Plus />
                                        <span>Nouvelle demande</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>
                )}
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
