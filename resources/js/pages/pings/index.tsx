import { Head, router, usePage } from '@inertiajs/react';
import {
    Bell,
    BellRing,
    Check,
    CheckCircle2,
    Loader2,
    MapPin,
    X,
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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

type PingStatus = 'pending' | 'responded' | 'undeliverable';
type PingResult = 'in_zone' | 'out_of_zone' | 'no_response' | null;

type Ping = {
    id: number;
    user: { id: number; name: string };
    sent_at: string;
    expires_at: string;
    responded_at: string | null;
    result: PingResult;
    deliverability: string;
    status: PingStatus;
    can_respond: boolean;
};

type Props = {
    pings: Ping[];
    stats: { total: number; pending: number; responded: number; undeliverable: number };
    isAdmin: boolean;
};

// =========================
// HELPERS
// =========================

const fmtDT = (iso: string | null) =>
    iso
        ? new Date(iso).toLocaleString('fr-FR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
          })
        : '—';

const statusConfig: Record<PingStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending:       { label: 'En attente',   variant: 'secondary' },
    responded:     { label: 'Répondu',      variant: 'default' },
    undeliverable: { label: 'Non livrable', variant: 'destructive' },
};

const resultLabels: Record<string, string> = {
    in_zone:     '✓ En zone',
    out_of_zone: '✗ Hors zone',
    no_response: '— Sans réponse',
};

const Err = ({ text }: { text?: string }) =>
    text ? (
        <Alert variant="destructive" className="mt-2">
            <AlertDescription>{text}</AlertDescription>
        </Alert>
    ) : null;

// =========================
// GEO HOOK (same as attendance)
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
            setState({ status: 'error', message: 'Géolocalisation non disponible.' });
            return;
        }
        setState({ status: 'requesting' });
        navigator.geolocation.getCurrentPosition(
            (pos) => setState({
                status: 'ready',
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
            }),
            (err) => {
                const m: Record<number, string> = {
                    1: 'Permission de géolocalisation refusée.',
                    2: 'Position indisponible.',
                    3: 'Délai dépassé. Réessayez.',
                };
                setState({ status: 'error', message: m[err.code] ?? 'Erreur GPS.' });
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        );
    }, []);

    return { state, request };
}

// =========================
// PING RESPONSE WIDGET
// =========================

function RespondWidget({ ping }: { ping: Ping }) {
    const page = usePage<{ errors: Record<string, string> }>();
    const { errors } = page.props;
    const { state: geo, request: requestGeo } = useGeolocation();
    const [busy, setBusy] = useState(false);

    const expiresAt = new Date(ping.expires_at);
    const isExpired = expiresAt < new Date();

    if (isExpired) {
        return (
            <p className="text-sm text-muted-foreground italic">
                Ce ping a expiré à {fmtDT(ping.expires_at)}.
            </p>
        );
    }

    const handleRespond = () => {
        if (geo.status !== 'ready') {
            requestGeo();
            return;
        }
        setBusy(true);
        router.post(
            `/pings/${ping.id}/respond`,
            { latitude: geo.lat, longitude: geo.lng, accuracy: geo.accuracy },
            { preserveScroll: true, onFinish: () => setBusy(false) },
        );
    };

    return (
        <div className="flex flex-col gap-2">
            {geo.status === 'error' && <Err text={geo.message} />}
            {errors.ping && <Err text={errors.ping} />}

            {geo.status === 'requesting' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Lecture de la position…
                </div>
            )}
            {geo.status === 'ready' && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="size-4" />
                    Position prête (±{Math.round(geo.accuracy)} m)
                </div>
            )}

            <Button onClick={handleRespond} disabled={busy || geo.status === 'requesting'}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
                Confirmer ma présence
            </Button>
        </div>
    );
}

// =========================
// PAGE
// =========================

export default function Index({ pings, stats, isAdmin }: Props) {
    const page = usePage<{ errors: Record<string, string> }>();
    const { errors } = page.props;

    const [responding, setResponding] = useState<Ping | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const cards = [
        { label: 'Total',        value: stats.total,         icon: <Bell className="size-5" /> },
        { label: 'En attente',   value: stats.pending,       icon: <BellRing className="size-5" /> },
        { label: 'Répondus',     value: stats.responded,     icon: <Check className="size-5" /> },
        { label: 'Non livrables', value: stats.undeliverable, icon: <X className="size-5" /> },
    ];

    const filtered = statusFilter === 'all'
        ? pings
        : pings.filter((p) => p.status === statusFilter);

    return (
        <>
            <Head title="Pings de présence" />
            <div className="flex flex-col gap-6 p-4 lg:p-6">

                {/* Ping en attente pour l'employé courant */}
                {pings.some((p) => p.can_respond) && (
                    <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
                        <CardContent className="flex flex-wrap items-center gap-4 py-4">
                            <BellRing className="size-8 shrink-0 text-orange-500 animate-pulse" />
                            <div className="flex-1">
                                <p className="font-semibold">Vérification de présence en cours</p>
                                <p className="text-sm text-muted-foreground">
                                    Confirmez votre présence dans la zone de travail avant l'expiration.
                                </p>
                            </div>
                            {pings.filter((p) => p.can_respond).map((p) => (
                                <Button key={p.id} onClick={() => setResponding(p)}>
                                    <MapPin className="size-4" /> Répondre
                                </Button>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Stats */}
                <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                        <CardTitle>Pings de présence</CardTitle>
                        <CardDescription>Vérifications ponctuelles envoyées aux employés</CardDescription>
                        <CardAction className="flex flex-wrap gap-2">
                            <Select
                                value={statusFilter}
                                onValueChange={setStatusFilter}
                            >
                                <SelectTrigger size="sm" className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous</SelectItem>
                                    <SelectItem value="pending">En attente</SelectItem>
                                    <SelectItem value="responded">Répondus</SelectItem>
                                    <SelectItem value="undeliverable">Non livrables</SelectItem>
                                </SelectContent>
                            </Select>
                        </CardAction>
                    </CardHeader>
                    <CardContent>
                        <Err text={errors.ping} />
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employé</TableHead>
                                        <TableHead className="hidden sm:table-cell">Envoyé</TableHead>
                                        <TableHead className="hidden lg:table-cell">Expire</TableHead>
                                        <TableHead className="hidden md:table-cell">Répondu</TableHead>
                                        <TableHead className="hidden md:table-cell">Résultat</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                                                Aucun ping
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {filtered.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium">{p.user.name}</TableCell>
                                            <TableCell className="hidden sm:table-cell whitespace-nowrap">{fmtDT(p.sent_at)}</TableCell>
                                            <TableCell className="hidden lg:table-cell whitespace-nowrap text-muted-foreground">
                                                {fmtDT(p.expires_at)}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell whitespace-nowrap">
                                                {fmtDT(p.responded_at)}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                {p.result ? (
                                                    <span className={
                                                        p.result === 'in_zone'
                                                            ? 'text-green-600 text-sm'
                                                            : 'text-destructive text-sm'
                                                    }>
                                                        {resultLabels[p.result] ?? p.result}
                                                    </span>
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={statusConfig[p.status].variant}>
                                                    {statusConfig[p.status].label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {p.can_respond && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => setResponding(p)}
                                                    >
                                                        Répondre
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dialog de réponse */}
            <Dialog
                open={responding !== null}
                onOpenChange={(open) => !open && setResponding(null)}
            >
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Confirmer votre présence</DialogTitle>
                    </DialogHeader>
                    {responding && <RespondWidget ping={responding} />}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResponding(null)}>
                            Fermer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Pings de présence', href: '/pings' }],
};
