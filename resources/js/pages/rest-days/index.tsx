import { Head, router, usePage } from '@inertiajs/react';
import { CalendarDays, Check, Plus, X } from 'lucide-react';
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
    Dialog,
    DialogContent,
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
import { DatePicker } from '@/components/date-picker';

// =========================
// TYPES
// =========================

type Status = 'pending' | 'approved' | 'rejected' | 'cancelled';

type RestDay = {
    id: number;
    date: string;
    status: Status;
    justification: string | null;
    user: { id: number; name: string };
    decider: { name: string } | null;
    can: { approve: boolean; cancel: boolean };
};

type QuotaInfo = {
    quota: number;
    approved_this_month: number;
    pending_this_month: number;
    remaining: number;
    can_propose: boolean;
};

type Props = {
    restDays: RestDay[];
    stats: { total: number; pending: number; approved: number; rejected: number };
    quotaInfo: QuotaInfo | null;
    filters: { status?: string; month?: string };
    canCreate: boolean;
};

// =========================
// DONNÉES STATIQUES
// =========================

const statuses: Record<Status, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending:   { label: 'En attente', variant: 'secondary' },
    approved:  { label: 'Approuvé',   variant: 'default' },
    rejected:  { label: 'Refusé',     variant: 'destructive' },
    cancelled: { label: 'Annulé',     variant: 'outline' },
};

const monthOptions = [
    { value: '1',  label: 'Janvier' },
    { value: '2',  label: 'Février' },
    { value: '3',  label: 'Mars' },
    { value: '4',  label: 'Avril' },
    { value: '5',  label: 'Mai' },
    { value: '6',  label: 'Juin' },
    { value: '7',  label: 'Juillet' },
    { value: '8',  label: 'Août' },
    { value: '9',  label: 'Septembre' },
    { value: '10', label: 'Octobre' },
    { value: '11', label: 'Novembre' },
    { value: '12', label: 'Décembre' },
];

// =========================
// HELPERS
// =========================

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('fr-FR', { dateStyle: 'long' });

const textareaClass =
    'border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

const Err = ({ text }: { text?: string }) =>
    text ? <p className="mt-1 text-sm text-destructive">{text}</p> : null;

// =========================
// PAGE
// =========================

export default function Index({ restDays, stats, quotaInfo, filters, canCreate }: Props) {
    const page = usePage<{ errors: Record<string, string> }>();
    const { errors } = page.props;

    const [creating, setCreating]   = useState(false);
    const [rejecting, setRejecting] = useState<RestDay | null>(null);
    const [viewing, setViewing]     = useState<RestDay | null>(null);
    const [proposedDate, setProposedDate] = useState<string>('');
    const [justification, setJustification] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const cards = [
        { label: 'Total',      value: stats.total },
        { label: 'En attente', value: stats.pending },
        { label: 'Approuvés',  value: stats.approved },
        { label: 'Refusés',    value: stats.rejected },
    ];

    // Minimum date = today + 3 days (délai de prévenance F7.4)
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 3);

    // ── Filters ──
    const filter = (key: 'status' | 'month', value: string) =>
        router.get(
            '/rest-days',
            { ...filters, [key]: value === 'all' ? undefined : value },
            { preserveState: true, replace: true },
        );

    // ── Actions ──
    const submitProposal = () => {
        if (!proposedDate || submitting) return;
        setSubmitting(true);
        router.post(
            '/rest-days',
            { date: proposedDate },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setProposedDate('');
                    setCreating(false);
                },
                onFinish: () => setSubmitting(false),
            },
        );
    };

    const approve = (id: number) =>
        router.patch(`/rest-days/${id}/approve`, {}, { preserveScroll: true });

    const cancel = (id: number) =>
        router.patch(`/rest-days/${id}/cancel`, {}, { preserveScroll: true });

    const submitRejection = () => {
        if (!rejecting) return;
        router.patch(
            `/rest-days/${rejecting.id}/reject`,
            { justification },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setRejecting(null);
                    setViewing(null);
                    setJustification('');
                },
            },
        );
    };

    return (
        <>
            <Head title="Jours de repos" />
            <div className="flex flex-col gap-6 p-4 lg:p-6">

                {/* Quota banner — visible uniquement pour les employés avec quota > 0 */}
                {quotaInfo && (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-wrap items-center gap-4 py-4">
                            <CalendarDays className="size-8 shrink-0 text-muted-foreground" />
                            <div className="flex-1">
                                <p className="font-medium">
                                    Quota ce mois : {quotaInfo.quota} jour{quotaInfo.quota > 1 ? 's' : ''}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {quotaInfo.approved_this_month} approuvé{quotaInfo.approved_this_month > 1 ? 's' : ''}
                                    {' · '}
                                    {quotaInfo.pending_this_month} en attente
                                    {' · '}
                                    {quotaInfo.remaining} restant{quotaInfo.remaining > 1 ? 's' : ''}
                                </p>
                            </div>
                            {canCreate && quotaInfo.can_propose && (
                                <Button size="sm" onClick={() => setCreating(true)}>
                                    <Plus /> Proposer une date
                                </Button>
                            )}
                            {canCreate && !quotaInfo.can_propose && (
                                <p className="text-sm text-muted-foreground italic">
                                    Quota atteint pour ce mois.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Cartes statistiques */}
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

                {/* Tableau */}
                <Card>
                    <CardHeader>
                        <CardTitle>Jours de repos</CardTitle>
                        <CardDescription>Propositions et décisions</CardDescription>
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
                                    {Object.entries(statuses).map(([k, { label }]) => (
                                        <SelectItem key={k} value={k}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.month ?? 'all'}
                                onValueChange={(v) => filter('month', v)}
                            >
                                <SelectTrigger size="sm" className="w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les mois</SelectItem>
                                    {monthOptions.map((m) => (
                                        <SelectItem key={m.value} value={m.value}>
                                            {m.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Bouton pour admin/RH sans quota */}
                            {canCreate && !quotaInfo && (
                                <Button size="sm" onClick={() => setCreating(true)}>
                                    <Plus /> Proposer une date
                                </Button>
                            )}
                        </CardAction>
                    </CardHeader>
                    <CardContent>
                        <Err text={errors.status} />
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employé</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead className="hidden md:table-cell">Décidé par</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {restDays.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="text-center text-muted-foreground"
                                            >
                                                Aucune proposition
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {restDays.map((item) => (
                                        <TableRow
                                            key={item.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => setViewing(item)}
                                        >
                                            <TableCell className="font-medium">
                                                {item.user.name}
                                            </TableCell>
                                            <TableCell>{formatDate(item.date)}</TableCell>
                                            <TableCell>
                                                <Badge variant={statuses[item.status].variant}>
                                                    {statuses[item.status].label}
                                                </Badge>
                                                {item.justification && (
                                                    <p className="mt-1 max-w-xs truncate text-xs text-muted-foreground">
                                                        {item.justification}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-muted-foreground">
                                                {item.decider?.name ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                <div
                                                    className="flex justify-end gap-2"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {item.status === 'pending' && item.can.approve && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => approve(item.id)}
                                                            >
                                                                <Check /> Approuver
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setRejecting(item)}
                                                            >
                                                                <X /> Refuser
                                                            </Button>
                                                        </>
                                                    )}
                                                    {item.can.cancel && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => cancel(item.id)}
                                                        >
                                                            Annuler
                                                        </Button>
                                                    )}
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

            {/* ── Dialog : Proposer une date ── */}
            <Dialog
                open={creating}
                onOpenChange={(open) => { setCreating(open); if (!open) setProposedDate(''); }}
            >
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Proposer un jour de repos</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <p className="text-sm text-muted-foreground">
                            Choisissez une date dans le mois en cours ou le mois suivant.
                            Le délai minimum de prévenance est de <strong>3 jours calendaires</strong>.
                        </p>
                        <div className="grid gap-2">
                            <Label>Date proposée</Label>
                            <DatePicker
                                value={proposedDate ? new Date(proposedDate) : undefined}
                                onChange={(date) =>
                                    setProposedDate(date ? date.toLocaleDateString('fr-CA') : '')
                                }
                                disabled={(date) => date < minDate}
                            />
                            <Err text={errors.date} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => { setCreating(false); setProposedDate(''); }}
                        >
                            Fermer
                        </Button>
                        <Button
                            onClick={submitProposal}
                            disabled={!proposedDate || submitting}
                        >
                            Envoyer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Dialog : Détail ── */}
            <Dialog
                open={viewing !== null}
                onOpenChange={(open) => !open && setViewing(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Détail du jour de repos</DialogTitle>
                    </DialogHeader>
                    {viewing && (
                        <div className="grid gap-4 text-sm">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Employé</p>
                                    <p className="mt-0.5">{viewing.user.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Date</p>
                                    <p className="mt-0.5">{formatDate(viewing.date)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Statut</p>
                                    <div className="mt-0.5">
                                        <Badge variant={statuses[viewing.status].variant}>
                                            {statuses[viewing.status].label}
                                        </Badge>
                                    </div>
                                </div>
                                {viewing.decider && (
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground">Décidé par</p>
                                        <p className="mt-0.5">{viewing.decider.name}</p>
                                    </div>
                                )}
                            </div>

                            {viewing.justification && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Motif du refus</p>
                                    <p className="mt-1 rounded-md bg-muted px-3 py-2 leading-relaxed">
                                        {viewing.justification}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter className="flex-row flex-wrap gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setViewing(null)}
                            className="mr-auto"
                        >
                            Fermer
                        </Button>
                        {viewing?.can.cancel && (
                            <Button
                                variant="ghost"
                                onClick={() => { cancel(viewing.id); setViewing(null); }}
                            >
                                Annuler
                            </Button>
                        )}
                        {viewing?.status === 'pending' && viewing.can.approve && (
                            <>
                                <Button
                                    variant="destructive"
                                    onClick={() => { setRejecting(viewing); setViewing(null); }}
                                >
                                    <X /> Refuser
                                </Button>
                                <Button
                                    onClick={() => { approve(viewing.id); setViewing(null); }}
                                >
                                    <Check /> Approuver
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Dialog : Motif du refus ── */}
            <Dialog
                open={rejecting !== null}
                onOpenChange={(open) => { if (!open) { setRejecting(null); setJustification(''); } }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Refuser la proposition</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label>Motif du refus</Label>
                        <textarea
                            className={textareaClass}
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            placeholder="Expliquez la raison du refus (obligatoire)"
                        />
                        <Err text={errors.justification} />
                        {errors.status && (
                            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                {errors.status}
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => { setRejecting(null); setJustification(''); }}
                        >
                            Fermer
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={submitRejection}
                            disabled={!justification.trim()}
                        >
                            Refuser
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Jours de repos', href: '/rest-days' }],
};
