import { Link, usePage } from '@inertiajs/react';
import { ClipboardList, LayoutGrid, Plus } from 'lucide-react';
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

const mainNavItems: NavItem[] = [
    { title: 'Tableau de bord', href: dashboard(), icon: LayoutGrid },
    { title: 'Demandes', href: '/leave-requests', icon: ClipboardList },
];

export function AppSidebar() {
    const { auth } = usePage<{ auth: { user: { role?: string } | null } }>().props;
    const canRequest = auth.user?.role !== 'administrator';

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