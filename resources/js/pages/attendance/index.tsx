import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Coffee,
    CoffeeIcon,
    Loader2,
    LogIn,
    LogOut,
    MapPin,
    RefreshCw,
} from 'lucide-react';
import { useCallback, useState } from 'react';

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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
    justification: string | null;
    time_logs: TimeLog[];
};

type TodaySession = {
    id: number;
    arrival: string | null;
    departure: string | null;
    status: string;
    late_minutes: number;
    justification: string | null;
    on_break: boolean;
    has_arrived: boolean;
    has_departed: boolean;
    next_action: 'clock_in' | 'break_start_or_clock_out' | 'break_end' | 'done';
    is_absent: boolean;
    can_justify: boolean;
};

type Props = {
    sessions: AttendanceSession[];
    stats: { active: number; completed: number; on_break: number };
    todaySession: TodaySession | null;
    filters: { date_from?: string; date_to?: string; status?: string };
    canClockIn: boolean;
    schedule: { start_time: string } | null;
};

type AccuracyLevel = 'excellent' | 'acceptable' | 'poor';

// =========================
// DONNÉES
// =========================

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    in_progress: { label: 'En cours',   variant: 'default' },
    on_break:    { label: 'En pause',   variant: 'secondary' },
    complete:    { label: 'Terminé',    variant: 'outline' },
    incomplete:  { label: 'Incomplet',  variant: 'destructive' },
    absence:     { label: 'Absence',    variant: 'destructive' },
};

const typeLabels: Record<string, string> = {
    arrival:     'Arrivée',
    departure:   'Départ',
    break_start: 'Début de pause',
    break_end:   'Fin de pause',
};

// Seuils GPS : mobile vs PC
const GPS_THRESHOLDS = {
    mobile: { ideal: 150, margin: 10 }, // jusqu'à 160m acceptable
    desktop: { ideal: 200, margin: 10 }, // jusqu'à 210m acceptable
};

// =========================
// HELPERS
// =========================

const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { dateStyle: 'short' });

const formatLateMinutes = (minutes: number): string => {
    if (minutes <= 0) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}h ${mins.toString().padStart(2, '0')}min`;
    }
    return `${mins}min`;
};

const Err = ({ text }: { text?: string }) =>
    text ? (
        <Alert variant="destructive" className="mt-2">
            <AlertCircle className="size-4" />
            <AlertDescription>{text}</AlertDescription>
        </Alert>
    ) : null;

// Détection mobile vs PC
const isMobileDevice = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Évalue la qualité de la précision GPS
const evaluateAccuracy = (accuracy: number): { level: AccuracyLevel; color: string; icon: any; message: string } => {
    const threshold = isMobileDevice() ? GPS_THRESHOLDS.mobile : GPS_THRESHOLDS.desktop;
    const maxAcceptable = threshold.ideal + threshold.margin;

    if (accuracy <= threshold.ideal) {
        return {
            level: 'excellent',
            color: 'text-green-600',
            icon: CheckCircle2,
            message: `Position excellente (${Math.round(accuracy)}m)`,
        };
    }
    if (accuracy <= maxAcceptable) {
        return {
            level: 'acceptable',
            color: 'text-yellow-600',
            icon: AlertTriangle,
            message: `Précision limite (${Math.round(accuracy)}m) — dans la marge acceptable`,
        };
    }
    return {
        level: 'poor',
        color: 'text-red-600',
        icon: AlertCircle,
        message: `Précision insuffisante (${Math.round(accuracy)}m) — Hors marge`,
    };
};

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
        if (!navigator.geolocation) {
            setState({ status: 'error', message: "La géolocalisation n'est pas disponible sur cet appareil." });
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
                    1: 'Permission de géolocalisation refusée. Activez-la dans les paramètres.',
                    2: 'Position indisponible. Vérifiez votre GPS.',
                    3: "Délai d'attente GPS dépassé. Réessayez.",
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
    const [pendingEndpoint, setPendingEndpoint] = useState<string | null>(null);
    const [attemptCount, setAttemptCount] = useState(0);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [justifying, setJustifying] = useState(false);
    const [justificationText, setJustificationText] = useState(today?.justification ?? '');

    const hasArrived  = today?.has_arrived  ?? false;
    const hasDeparted = today?.has_departed ?? false;
    const onBreak     = today?.on_break     ?? false;
    const isAbsent    = today?.is_absent    ?? false;
    const canJustify  = today?.can_justify  ?? false;
    const isBusy      = pendingAction !== null || geo.status === 'requesting';

    if (!canClockIn) return null;

    const accuracyEval = geo.status === 'ready' ? evaluateAccuracy(geo.accuracy) : null;
    const canProceed = geo.status === 'ready' && (accuracyEval?.level === 'excellent' || accuracyEval?.level === 'acceptable');
    const needsRetry = geo.status === 'ready' && accuracyEval?.level === 'poor';
    const canForce = attemptCount >= 3 && needsRetry;

    const initiateAction = (endpoint: string, action: string) => {
        setPendingEndpoint(endpoint);
        setPendingAction(action);
        setAttemptCount(0);
        requestGeo();
    };

    const retryGeo = () => {
        setAttemptCount((prev) => prev + 1);
        requestGeo();
    };

    const proceedWithAction = () => {
        if (!pendingEndpoint || geo.status !== 'ready') return;
        
        setShowConfirmDialog(false);
        router.post(
            pendingEndpoint,
            { 
                latitude: geo.lat, 
                longitude: geo.lng, 
                accuracy: geo.accuracy,
                force_anomaly: canForce, // Flag pour créer une anomalie "hors zone"
            },
            {
                preserveScroll: false,
                onFinish: () => {
                    setPendingAction(null);
                    setPendingEndpoint(null);
                    setAttemptCount(0);
                    resetGeo();
                },
            },
        );
    };

    const submitJustification = () => {
        if (!today) return;
        router.patch(
            `/attendance/${today.id}/justify`,
            { justification: justificationText },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setJustifying(false);
                    setJustificationText('');
                },
            },
        );
    };

    const getActionButton = (endpoint: string, action: string, icon: any, label: string) => {
        const Icon = icon;
        return (
            <Button 
                onClick={() => initiateAction(endpoint, action)} 
                disabled={isBusy}
                variant={action === pendingAction ? 'default' : 'outline'}
            >
                {pendingAction === action && geo.status === 'requesting' ? (
                    <Loader2 className="size-4 animate-spin" />
                ) : (
                    <Icon className="size-4" />
                )}
                {label}
            </Button>
        );
    };

    return (
        <>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MapPin className="size-4 text-muted-foreground" />
                    Pointage du jour
                </CardTitle>
                {today && (
                    <CardDescription>
                        {isAbsent ? (
                            <span className="font-medium text-destructive">Absence (retard &gt; 2h)</span>
                        ) : today.late_minutes > 0 ? (
                            <span className="text-destructive">Retard : {formatLateMinutes(today.late_minutes)}</span>
                        ) : today.has_arrived ? (
                            <span className="text-muted-foreground">
                                Arrivée : {fmt(today.arrival)}
                                {today.has_departed && ` · Départ : ${fmt(today.departure)}`}
                            </span>
                        ) : null}
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                {geo.status === 'error' && <Err text={geo.message} />}
                {errors.clock && <Err text={errors.clock} />}

                {/* État de la géolocalisation */}
                {geo.status === 'requesting' && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Lecture de la position GPS{attemptCount > 0 && ` (tentative ${attemptCount + 1})`}…
                    </div>
                )}

                {geo.status === 'ready' && accuracyEval && (
                    <Alert variant={accuracyEval.level === 'poor' ? 'destructive' : 'default'} className="border-2">
                        <accuracyEval.icon className={`size-4 ${accuracyEval.color}`} />
                        <AlertDescription className="font-medium">
                            {accuracyEval.message}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Boutons d'action */}
                {!hasDeparted && !isAbsent && !pendingAction && (
                    <div className="flex flex-wrap gap-2">
                        {!hasArrived && getActionButton('/attendance/clock-in', 'clock-in', LogIn, 'Pointer l\'arrivée')}
                        {hasArrived && !onBreak && getActionButton('/attendance/break/start', 'break-start', Coffee, 'Début de pause')}
                        {hasArrived && onBreak && getActionButton('/attendance/break/end', 'break-end', CoffeeIcon, 'Fin de pause')}
                        {hasArrived && getActionButton('/attendance/clock-out', 'clock-out', LogOut, 'Pointer le départ')}
                    </div>
                )}

                {/* Actions après lecture GPS */}
                {pendingAction && geo.status === 'ready' && (
                    <div className="flex flex-wrap gap-2">
                        {canProceed && (
                            <Button onClick={proceedWithAction}>
                                <CheckCircle2 className="size-4" />
                                Confirmer le pointage
                            </Button>
                        )}
                        
                        {needsRetry && !canForce && (
                            <Button onClick={retryGeo} variant="outline">
                                <RefreshCw className="size-4" />
                                Réessayer ({attemptCount}/3)
                            </Button>
                        )}

                        {canForce && (
                            <>
                                <Button onClick={retryGeo} variant="outline">
                                    <RefreshCw className="size-4" />
                                    Réessayer encore
                                </Button>
                                <Button onClick={() => setShowConfirmDialog(true)} variant="destructive">
                                    <AlertTriangle className="size-4" />
                                    Pointer malgré tout
                                </Button>
                            </>
                        )}

                        <Button 
                            onClick={() => {
                                setPendingAction(null);
                                setPendingEndpoint(null);
                                setAttemptCount(0);
                                resetGeo();
                            }} 
                            variant="ghost"
                        >
                            Annuler
                        </Button>
                    </div>
                )}

                {canJustify && today && (
                    <Button variant="outline" onClick={() => setJustifying(true)} disabled={justifying}>
                        {today.justification ? 'Modifier la justification' : 'Justifier'}
                    </Button>
                )}

                {!hasArrived && geo.status === 'idle' && (
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

        {/* Dialogue de confirmation forcée */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="size-5" />
                        Précision GPS insuffisante
                    </DialogTitle>
                    <DialogDescription>
                        Votre position GPS a une précision de <strong>{geo.status === 'ready' ? Math.round(geo.accuracy) : '?'}m</strong>, 
                        ce qui dépasse la marge acceptable. 
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-4">
                    <p className="text-sm">
                        Si vous continuez malgré tout, une <strong>anomalie "Hors zone"</strong> sera enregistrée 
                        et vous devrez la justifier.
                    </p>
                    <Alert>
                        <AlertCircle className="size-4" />
                        <AlertDescription className="text-xs">
                            Vous avez déjà effectué {attemptCount} tentative{attemptCount > 1 ? 's' : ''}. 
                            Vous pouvez réessayer ou forcer le pointage.
                        </AlertDescription>
                    </Alert>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                        Annuler
                    </Button>
                    <Button variant="destructive" onClick={proceedWithAction}>
                        Pointer quand même
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Dialogue de justification */}
        <Dialog open={justifying} onOpenChange={(open) => !open && setJustifying(false)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Justifier {isAbsent ? 'l\'absence' : 'le retard'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                    {today && (
                        <p className="text-sm text-muted-foreground">
                            {isAbsent ? 'Absence (retard > 2h)' : `Retard : ${formatLateMinutes(today.late_minutes)}`}
                        </p>
                    )}
                    <div className="grid gap-2">
                        <Label>Justification</Label>
                        <textarea
                            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            value={justificationText}
                            onChange={(e) => setJustificationText(e.target.value)}
                            placeholder="Expliquez la raison (embouteillage, problème personnel, urgence…)"
                        />
                        {errors.justification && <p className="mt-1 text-sm text-destructive">{errors.justification}</p>}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setJustifying(false)}>
                        Annuler
                    </Button>
                    <Button onClick={submitJustification} disabled={!justificationText.trim()}>
                        Enregistrer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}

// =========================
// PAGE
// =========================

export default function Index({ sessions, stats, todaySession, filters, canClockIn, schedule }: Props) {
    const page = usePage<{ errors: Record<string, string> }>();
    const { errors } = page.props;

    const filter = (key: string, value: string | undefined) =>
        router.get('/attendance', { ...filters, [key]: value }, { preserveState: true, replace: true });

    const cards = [
        { label: 'En cours',  value: stats.active,    icon: <Clock className="size-5" /> },
        { label: 'En pause',  value: stats.on_break,  icon: <Coffee className="size-5" /> },
        { label: 'Terminées', value: stats.completed, icon: <CheckCircle2 className="size-5" /> },
    ];

    return (
        <>
            <Head title="Pointage" />
            <div className="flex flex-col gap-6 p-4 lg:p-6">

                <ClockWidget today={todaySession} canClockIn={canClockIn} schedule={schedule} />

                {/* Stats */}
                <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid gap-4 sm:grid-cols-3">
                    {cards.map((c) => (
                        <Card key={c.label}>
                            <CardHeader>
                                <CardDescription>{c.label}</CardDescription>
                                <CardTitle className="text-3xl font-semibold tabular-nums">{c.value}</CardTitle>
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
                                onValueChange={(v) => filter('status', v === 'all' ? undefined : v)}
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
                                onChange={(e) => filter('date_from', e.target.value || undefined)}
                            />
                            <span className="self-center text-sm text-muted-foreground">→</span>
                            <input
                                type="date"
                                className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                                value={filters.date_to ?? ''}
                                onChange={(e) => filter('date_to', e.target.value || undefined)}
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
                                        <TableHead className="hidden sm:table-cell">Départ</TableHead>
                                        <TableHead className="hidden md:table-cell">Retard</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead className="hidden lg:table-cell">Pointages</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessions.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                                                Aucune session
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {sessions.map((s) => (
                                        <TableRow key={s.id}>
                                            <TableCell className="font-medium">{s.user.name}</TableCell>
                                            <TableCell>{fmtDate(s.date)}</TableCell>
                                            <TableCell>{fmt(s.arrival)}</TableCell>
                                            <TableCell className="hidden sm:table-cell">{fmt(s.departure)}</TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                {s.late_minutes > 0 ? (
                                                    <span className="text-sm text-destructive">{formatLateMinutes(s.late_minutes)}</span>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={(statusConfig[s.status] ?? statusConfig.incomplete).variant}>
                                                    {(statusConfig[s.status] ?? statusConfig.incomplete).label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                <div className="flex flex-col gap-0.5">
                                                    {s.time_logs.map((tl) => (
                                                        <div key={tl.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <span className="font-medium text-foreground">
                                                                {typeLabels[tl.type] ?? tl.type}
                                                            </span>
                                                            <span>{fmt(tl.timestamp)}</span>
                                                            {!tl.in_zone && <MapPin className="size-3 text-destructive" />}
                                                            {tl.flag_label && (
                                                                <Badge variant="outline" className="h-4 px-1 text-[10px]">
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
