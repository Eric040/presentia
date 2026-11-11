import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Coffee,
    CoffeeIcon,
    Loader2,
    LogIn,
    LogOut,
    MapPin,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

// =========================
// TYPES
// =========================

type SessionStatus = 'in_progress' | 'on_break' | 'complete' | 'incomplete' | 'absence';

type TimeLog = {
    id: number;
    type: 'arrival' | 'departure' | 'break_start' | 'break_end';
    timestamp: string;
    in_zone: boolean;
    approx_distance: number | null;
    flag: string | null;
    flag_label: string | null;
};

type AttendanceSession = {
    id: number;
    user: { id: number; name: string };
    date: string;
    arrival: string | null;
    departure: string | null;
    status: SessionStatus;
    late_minutes: number;
    time_logs: TimeLog[];
};

type TodaySession = {
    id: number;
    arrival: string | null;
    departure: string | null;
    status: string;
    late_minutes: number;
    on_break: boolean;
    has_arrived: boolean;
    has_departed: boolean;
    next_action: 'clock_in' | 'break_start_or_clock_out' | 'break_end' | 'done';
};

type Props = {
    sessions: AttendanceSession[];
    stats: { active: number; completed: number; on_break: number };
    todaySession: TodaySession | null;
    filters: { date_from?: string; date_to?: string; status?: string };
    canClockIn: boolean;
    schedule: { start_time: string } | null;
};

// =========================
// DONNÉES
// =========================

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    in_progress: { label: 'En cours',    variant: 'default' },
    on_break:    { label: 'En pause',    variant: 'secondary' },
    complete:    { label: 'Terminé',     variant: 'outline' },
    incomplete:  { label: 'Incomplet',   variant: 'destructive' },
    absence:     { label: 'Absence',     variant: 'destructive' },
};

const typeLabels: Record<string, string> = {
    arrival:     'Arrivée',
    departure:   'Départ',
    break_start: 'Début de pause',
    break_end:   'Fin de pause',
};

// =========================
// HELPERS
// =========================

const fmt = (iso: string | null) =>
    iso
        ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : '—';

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { dateStyle: 'short' });

const Err = ({ text }: { text?: string }) =>
    text ? (
        <Alert variant="destructive" className="mt-2">
            <AlertCircle className="size-4" />
            <AlertDescription>{text}</AlertDescription>
        </Alert>
    ) : null;

// =========================
// GEO HOOK
// =========================

type GeoState =
    | { status: 'idle' }
    | { status: 'requesting' }
    | { status: 'ready'; lat: number; lng: number; accuracy: number }
    | { status: 'error'; message: string };

function useGeolocation() {
    const [state, setState] = useState<GeoState>({ status: 'idle' });

    const request = useCallback(() => {
        if (! navigator.geolocation) {
            setState({ status: 'error', message: 'La géolocalisation n\'est pas disponible sur cet appareil.' });
            return;
        }

        setState({ status: 'requesting' });

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setState({
                    status: 'ready',
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                });
            },
            (err) => {
                const messages: Record<number, string> = {
                    1: 'Permission de géolocalisation refusée. Activez-la dans les paramètres de votre navigateur.',
                    2: 'Position indisponible. Vérifiez votre GPS.',
                    3: 'Délai d\'attente de la géolocalisation dépassé. Réessayez.',
                };
                setState({ status: 'error', message: messages[err.code] ?? 'Erreur de géolocalisation.' });
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        );
    }, []);

    const reset = useCallback(() => setState({ status: 'idle' }), []);

    return { state, request, reset };
}

// =========================
// CLOCK WIDGET
// =========================

function ClockWidget({
    today,
    canClockIn,
    schedule,
}: {
    today: TodaySession | null;
    canClockIn: boolean;
    schedule: { start_time: string } | null;
}) {
    const page = usePage<{ errors: Record<string, string> }>();
    const { errors } = page.props;
    const { state: geo, request: requestGeo, reset: resetGeo } = useGeolocation();
    const [pendingAction, setPendingAction] = useState<string | null>(null);

    // Hooks must run unconditionally — gate the render at the bottom
    const hasArrived  = today?.has_arrived ?? false;
    const hasDeparted = today?.has_departed ?? false;
    const onBreak     = today?.on_break ?? false;
    const isBusy      = pendingAction !== null || geo.status === 'requesting';

    if (! canClockIn) return null;

    const doAction = (endpoint: string, action: string) => {
        if (geo.status !== 'ready') {
            requestGeo();
            return;
        }
        setPendingAction(action);
        router.post(
            endpoint,
            { latitude: geo.lat, longitude: geo.lng, accuracy: geo.accuracy },
            {
                // full navigation so Inertia reloads todaySession + sessions table
                preserveScroll: false,
                onFinish: () => {
                    setPendingAction(null);
                    // Reset geo so the next action re-reads the position (F3.2)
                    resetGeo();
                },
            },
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MapPin className="size-4 text-muted-foreground" />
                    Pointage du jour
                </CardTitle>
                {today && (
                    <CardDescription>
                        {today.late_minutes > 0 && (
                            <span className="text-destructive">
                                Retard : {today.late_minutes} min
                            </span>
                        )}
                        {today.late_minutes === 0 && today.has_arrived && (
                            <span className="text-muted-foreground">
                                Arrivée : {fmt(today.arrival)}
                                {today.has_departed && ` · Départ : ${fmt(today.departure)}`}
                            </span>
                        )}
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                {geo.status === 'error' && <Err text={geo.message} />}
                {errors.clock && <Err text={errors.clock} />}

                {geo.status === 'requesting' && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Lecture de la position…
                    </div>
                )}

                {geo.status === 'ready' && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 className="size-4" />
                        Position obtenue (précision ~{Math.round(geo.accuracy)} m)
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    {/* Arrivée */}
                    {! hasArrived && (
                        <Button
                            onClick={() => doAction('/attendance/clock-in', 'clock-in')}
                            disabled={isBusy}
                        >
                            {pendingAction === 'clock-in' ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <LogIn className="size-4" />
                            )}
                            Pointer l'arrivée
                        </Button>
                    )}

                    {/* Début de pause */}
                    {hasArrived && ! hasDeparted && ! onBreak && (
                        <Button
                            variant="outline"
                            onClick={() => doAction('/attendance/break/start', 'break-start')}
                            disabled={isBusy}
                        >
                            {pendingAction === 'break-start' ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Coffee className="size-4" />
                            )}
                            Début de pause
                        </Button>
                    )}

                    {/* Fin de pause */}
                    {hasArrived && ! hasDeparted && onBreak && (
                        <Button
                            variant="outline"
                            onClick={() => doAction('/attendance/break/end', 'break-end')}
                            disabled={isBusy}
                        >
                            {pendingAction === 'break-end' ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <CoffeeIcon className="size-4" />
                            )}
                            Fin de pause
                        </Button>
                    )}

                    {/* Départ */}
                    {hasArrived && ! hasDeparted && (
                        <Button
                            variant="outline"
                            onClick={() => doAction('/attendance/clock-out', 'clock-out')}
                            disabled={isBusy}
                        >
                            {pendingAction === 'clock-out' ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <LogOut className="size-4" />
                            )}
                            Pointer le départ
                        </Button>
                    )}
                </div>

                {geo.status === 'idle' && ! hasArrived && (
                    <p className="text-xs text-muted-foreground">
                        La géolocalisation sera demandée au moment du pointage.
                    </p>
                )}

                {hasDeparted && (
                    <div className="flex flex-col gap-1">
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="size-4 text-green-600" />
                            Session terminée — départ pointé à {fmt(today?.departure ?? null)}.
                        </p>
                        {schedule && (
                            <p className="text-xs text-muted-foreground">
                                Prochain pointage demain à partir de <strong>{schedule.start_time}</strong>.
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// =========================
// PAGE
// =========================

export default function Index({ sessions, stats, todaySession, filters, canClockIn, schedule }: Props) {
    const page = usePage<{ errors: Record<string, string> }>();
    const { errors } = page.props;

    const filter = (key: string, value: string) =>
        router.get(
            '/attendance',
            { ...filters, [key]: value === 'all' ? undefined : value },
            { preserveState: true, replace: true },
        );

    const cards = [
        { label: 'En cours',   value: stats.active,    icon: <Clock className="size-5" /> },
        { label: 'En pause',   value: stats.on_break,  icon: <Coffee className="size-5" /> },
        { label: 'Terminées',  value: stats.completed, icon: <CheckCircle2 className="size-5" /> },
    ];

    return (
        <>
            <Head title="Pointage" />
            <div className="flex flex-col gap-6 p-4 lg:p-6">

                {/* Clock widget */}
                <ClockWidget today={todaySession} canClockIn={canClockIn} schedule={schedule} />

                {/* Stats */}
                <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid gap-4 sm:grid-cols-3">
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

                {/* Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Sessions de pointage</CardTitle>
                        <CardDescription>Arrivées, départs et pauses</CardDescription>
                        <CardAction className="flex flex-wrap gap-2">
                            <Select
                                value={filters.status ?? 'all'}
                                onValueChange={(v) => filter('status', v)}
                            >
                                <SelectTrigger size="sm" className="w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les statuts</SelectItem>
                                    {Object.entries(statusConfig).map(([k, { label }]) => (
                                        <SelectItem key={k} value={k}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <input
                                type="date"
                                className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                                value={filters.date_from ?? ''}
                                onChange={(e) => filter('date_from', e.target.value || 'all')}
                            />
                            <input
                                type="date"
                                className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                                value={filters.date_to ?? ''}
                                onChange={(e) => filter('date_to', e.target.value || 'all')}
                            />
                        </CardAction>
                    </CardHeader>
                    <CardContent>
                        <Err text={errors.clock} />
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employé</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Arrivée</TableHead>
                                        <TableHead>Départ</TableHead>
                                        <TableHead>Retard</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Pointages</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessions.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={7}
                                                className="text-center text-muted-foreground"
                                            >
                                                Aucune session
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {sessions.map((s) => (
                                        <TableRow key={s.id}>
                                            <TableCell className="font-medium">
                                                {s.user.name}
                                            </TableCell>
                                            <TableCell>{fmtDate(s.date)}</TableCell>
                                            <TableCell>{fmt(s.arrival)}</TableCell>
                                            <TableCell>{fmt(s.departure)}</TableCell>
                                            <TableCell>
                                                {s.late_minutes > 0 ? (
                                                    <span className="text-destructive text-sm">
                                                        +{s.late_minutes} min
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        (statusConfig[s.status] ?? statusConfig.incomplete).variant
                                                    }
                                                >
                                                    {(statusConfig[s.status] ?? statusConfig.incomplete).label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    {s.time_logs.map((tl) => (
                                                        <div
                                                            key={tl.id}
                                                            className="flex items-center gap-1.5 text-xs text-muted-foreground"
                                                        >
                                                            <span className="font-medium text-foreground">
                                                                {typeLabels[tl.type] ?? tl.type}
                                                            </span>
                                                            <span>{fmt(tl.timestamp)}</span>
                                                            {! tl.in_zone && (
                                                                <MapPin className="size-3 text-destructive" />
                                                            )}
                                                            {tl.flag_label && (
                                                                <Badge variant="outline" className="text-[10px] h-4 px-1">
                                                                    {tl.flag_label}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Pointage', href: '/attendance' }],
};
