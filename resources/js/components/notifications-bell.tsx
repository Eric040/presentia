import { router } from '@inertiajs/react';
import { Bell, Check, Trash2, X, Clock, AlertTriangle, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

// =========================
// TYPES
// =========================

type Notification = {
    id: number;
    type: string;
    content: string;
    data: {
        action_url?: string;
        action_label?: string;
        anomaly_id?: number;
        date?: string;
    } | null;
    read_at: string | null;
    created_at: string;
    is_unread: boolean;
};

// =========================
// HELPERS
// =========================

type NotificationConfig = {
    icon: any;
    color: string;
    bgColor: string;
};

const getNotificationConfig = (type: string): NotificationConfig => {
    const configs: Record<string, NotificationConfig> = {
        resume_reminder: {
            icon: Clock,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
        },
        anomaly_created: {
            icon: AlertCircle,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
        },
        anomaly_pending: {
            icon: Bell,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
        },
        anomaly_processed: {
            icon: CheckCircle2,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
        },
    };
    return configs[type] ?? {
        icon: Info,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
    };
};

const formatRelativeTime = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

// =========================
// COMPONENT
// =========================

export function NotificationsBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/notifications');
            const data = await response.json();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unread_count || 0);
        } catch (error) {
            console.error('Erreur chargement notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Rafraîchir toutes les 30 secondes
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (notificationId: number) => {
        try {
            await fetch(`/notifications/${notificationId}/read`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            await fetchNotifications();
        } catch (error) {
            console.error('Erreur marquage lecture:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetch('/notifications/mark-all-read', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            await fetchNotifications();
        } catch (error) {
            console.error('Erreur marquage tout lu:', error);
        }
    };

    const deleteNotification = async (notificationId: number, event: React.MouseEvent) => {
        event.stopPropagation();
        try {
            await fetch(`/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            await fetchNotifications();
        } catch (error) {
            console.error('Erreur suppression:', error);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read_at) {
            markAsRead(notification.id);
        }
        if (notification.data?.action_url) {
            setIsOpen(false);
            router.visit(notification.data.action_url);
        }
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="size-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full p-0 text-[10px]"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-4 py-3">
                    <h3 className="font-semibold">Notifications</h3>
                    <div className="flex flex-col items-start gap-1">
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={markAllAsRead}
                                className="h-7 text-xs"
                            >
                                <Check className="mr-1 size-3" />
                                Tout marquer lu
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setIsOpen(false);
                                router.visit('/notifications');
                            }}
                            className="h-7 text-xs"
                        >
                            Voir tout
                        </Button>
                    </div>
                </div>
                <DropdownMenuSeparator />
                {loading ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Chargement...
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Aucune notification
                    </div>
                ) : (
                    <ScrollArea className="max-h-96">
                        {notifications.map((notif) => {
                            const config = getNotificationConfig(notif.type);
                            const Icon = config.icon;
                            return (
                                <DropdownMenuItem
                                    key={notif.id}
                                    className={`flex cursor-pointer flex-col items-start gap-1 px-4 py-3 ${
                                        notif.is_unread ? 'bg-primary/5' : ''
                                    }`}
                                    onClick={() => handleNotificationClick(notif)}
                                >
                                    <div className="flex w-full items-start justify-between gap-2">
                                        <div className="flex flex-1 gap-2">
                                            <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${config.bgColor}`}>
                                                <Icon className={`size-4 ${config.color}`} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm leading-tight">
                                                    {notif.content}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {formatRelativeTime(notif.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {notif.is_unread && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-6"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        markAsRead(notif.id);
                                                    }}
                                                    title="Marquer comme lu"
                                                >
                                                    <Check className="size-3" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-6"
                                                onClick={(e) => deleteNotification(notif.id, e)}
                                                title="Supprimer"
                                            >
                                                <Trash2 className="size-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            );
                        })}
                    </ScrollArea>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
