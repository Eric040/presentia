import { Head, router } from '@inertiajs/react';
import { AlertCircle, Bell, Check, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

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

type Props = {
    notifications: {
        data: Notification[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    stats: {
        total: number;
        unread: number;
    };
    filters: {
        type?: string;
        status?: string;
    };
};

// =========================
// HELPERS
// =========================

const getNotificationIcon = (type: string) => {
    const icons: Record<string, { icon: any; color: string; bgColor: string }> = {
        resume_reminder: { icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-50' },
        anomaly_created: { icon: AlertCircle, color: 'text-orange-600', bgColor: 'bg-orange-50' },
        anomaly_pending: { icon: Bell, color: 'text-purple-600', bgColor: 'bg-purple-50' },
        anomaly_processed: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50' },
    };
    return icons[type] ?? { icon: Bell, color: 'text-gray-600', bgColor: 'bg-gray-50' };
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
    
    return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const typeLabels: Record<string, string> = {
    resume_reminder: 'Rappel de reprise',
    anomaly_created: 'Anomalie créée',
    anomaly_pending: 'Anomalie en attente',
    anomaly_processed: 'Anomalie traitée',
};

// =========================
// PAGE
// =========================

export default function Index({ notifications, stats, filters }: Props) {
    const [processing, setProcessing] = useState(false);

    const filter = (key: string, value: string | undefined) => {
        router.get('/notifications', { ...filters, [key]: value }, { preserveState: true, replace: true });
    };

    const markAsRead = async (notificationId: number) => {
        setProcessing(true);
        try {
            await fetch(`/notifications/${notificationId}/read`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            router.reload({ preserveScroll: true });
        } catch (error) {
            console.error('Erreur:', error);
        } finally {
            setProcessing(false);
        }
    };

    const markAllAsRead = async () => {
        setProcessing(true);
        try {
            await fetch('/notifications/mark-all-read', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            router.reload({ preserveScroll: true });
        } catch (error) {
            console.error('Erreur:', error);
        } finally {
            setProcessing(false);
        }
    };

    const deleteNotification = async (notificationId: number) => {
        setProcessing(true);
        try {
            await fetch(`/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            router.reload({ preserveScroll: true });
        } catch (error) {
            console.error('Erreur:', error);
        } finally {
            setProcessing(false);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read_at) {
            markAsRead(notification.id);
        }
        if (notification.data?.action_url) {
            router.visit(notification.data.action_url);
        }
    };

    const cards = [
        { label: 'Total', value: stats.total },
        { label: 'Non lues', value: stats.unread },
    ];

    return (
        <>
            <Head title="Notifications" />
            <div className="flex flex-col gap-6 p-4 lg:p-6">

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-2">
                    {cards.map((c) => (
                        <Card key={c.label}>
                            <CardHeader>
                                <CardDescription>{c.label}</CardDescription>
                                <CardTitle className="text-3xl font-semibold tabular-nums">
                                    {c.value}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    ))}
                </div>

                {/* Liste */}
                <Card>
                    <CardHeader>
                        <CardTitle>Toutes les notifications</CardTitle>
                        <CardDescription>Historique complet de vos notifications</CardDescription>
                        <CardAction className="flex flex-wrap gap-2">
                            <Select
                                value={filters.status ?? 'all'}
                                onValueChange={(v) => filter('status', v === 'all' ? undefined : v)}
                            >
                                <SelectTrigger size="sm" className="w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Toutes</SelectItem>
                                    <SelectItem value="unread">Non lues</SelectItem>
                                    <SelectItem value="read">Lues</SelectItem>
                                </SelectContent>
                            </Select>

                            {stats.unread > 0 && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={markAllAsRead}
                                    disabled={processing}
                                    className="hover:bg-primary/10 hover:text-primary"
                                >
                                    <Check className="mr-1 size-4" />
                                    Tout marquer lu
                                </Button>
                            )}
                        </CardAction>
                    </CardHeader>
                    <CardContent>
                        {notifications.data.length === 0 ? (
                            <div className="flex flex-col items-center gap-3 py-12 text-center">
                                <Bell className="size-16 text-muted-foreground/40" />
                                <div>
                                    <p className="font-medium">Aucune notification</p>
                                    <p className="text-sm text-muted-foreground">
                                        Vous êtes à jour !
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {notifications.data.map((notification) => {
                                    const { icon: Icon, color, bgColor } = getNotificationIcon(notification.type);
                                    return (
                                        <div
                                            key={notification.id}
                                            className={cn(
                                                'group flex items-start gap-4 p-4 transition-colors hover:bg-muted/50',
                                                notification.is_unread && 'bg-primary/5',
                                            )}
                                        >
                                            <div className={cn('rounded-lg p-3 shadow-sm', bgColor)}>
                                                <Icon className={cn('size-5', color)} />
                                            </div>

                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <p className="font-medium leading-tight">
                                                            {notification.content}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <Clock className="size-3" />
                                                            <span>{formatRelativeTime(notification.created_at)}</span>
                                                            {notification.is_unread && (
                                                                <>
                                                                    <span>•</span>
                                                                    <Badge variant="secondary" className="h-5 px-2">
                                                                        Nouveau
                                                                    </Badge>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {notification.data?.action_url && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleNotificationClick(notification)}
                                                            className="hover:bg-primary hover:text-primary-foreground"
                                                        >
                                                            {notification.data.action_label || 'Voir'}
                                                        </Button>
                                                    )}
                                                    {notification.is_unread && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => markAsRead(notification.id)}
                                                            disabled={processing}
                                                            className="hover:bg-primary/10 hover:text-primary"
                                                        >
                                                            <Check className="mr-1 size-3" />
                                                            Marquer lu
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => deleteNotification(notification.id)}
                                                        disabled={processing}
                                                        className="ml-auto hover:bg-destructive/10 hover:text-destructive"
                                                    >
                                                        <Trash2 className="mr-1 size-3" />
                                                        Supprimer
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Pagination */}
                        {notifications.data.length > 0 && notifications.last_page > 1 && (
                            <div className="flex items-center justify-between border-t pt-4 mt-4">
                                <p className="text-sm text-muted-foreground">
                                    Page {notifications.current_page} sur {notifications.last_page}
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={notifications.current_page === 1}
                                        onClick={() => filter('page', String(notifications.current_page - 1))}
                                    >
                                        Précédent
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={notifications.current_page === notifications.last_page}
                                        onClick={() => filter('page', String(notifications.current_page + 1))}
                                    >
                                        Suivant
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Notifications', href: '/notifications' }],
};
