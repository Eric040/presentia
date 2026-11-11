import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Check, ExternalLink, FileText, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DatePicker } from '@/components/date-picker';
import { TimePicker } from '@/components/time-picker';

// =========================
// TYPES
// =========================

type Status = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';
type Characteristic = 'partial' | 'full_day' | 'external_mission' | 'remote_work';

type LeaveRequest = {
    id: number;
    start: string;
    end: string;
    reason: string | null;
    comment: string | null;
    status: Status;
    supporting_document: string | null;
    user: { id: number; name: string };
    type: { id: number; label: string };
    approver: { name: string } | null;
    can: { approve: boolean; cancel: boolean };
};

type LeaveTypeOption = { id: number; label: string; characteristic: Characteristic };
type ScheduleInfo = { days: number[]; start_time: string; end_time: string; break_start?: string; break_end?: string };

type Props = {
    leaveRequests: LeaveRequest[];
    types: LeaveTypeOption[];
    stats: { total: number; pending: number; approved: number; rejected: number };
    filters: { status?: string; type_id?: string };
    canCreate: boolean;
    schedule: ScheduleInfo | null;
};

// =========================
// DONNÉES
// =========================

const statuses: Record<Status, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: 'En attente', variant: 'secondary' },
    approved: { label: 'Approuvée', variant: 'default' },
    rejected: { label: 'Refusée', variant: 'destructive' },
    cancelled: { label: 'Annulée', variant: 'outline' },
    expired: { label: 'Expirée', variant: 'outline' },
};

const weekdayLabels = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const formatDate = (value: string) =>
    new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

const isoWeekday = (date: string) => ((new Date(date).getDay() + 6) % 7) + 1;

const Err = ({ text }: { text?: string }) =>
    text ? <p className="text-sm text-destructive">{text}</p> : null;

// =========================
// STYLES
// =========================

const textareaClass =
    'border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

export default function Index({ leaveRequests, types, stats, filters, canCreate, schedule }: Props) {
    // =========================
    // ÉTATS
    // =========================

    const page = usePage<{ errors: Record<string, string> }>();
    const { errors } = page.props;
    const isNew = page.url.includes('new=1');

    const [creating, setCreating] = useState(false);
    const [viewing, setViewing] = useState<LeaveRequest | null>(null);
    const [rejecting, setRejecting] = useState<LeaveRequest | null>(null);
    const [comment, setComment] = useState('');
    const [hourlyDate, setHourlyDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [validationError, setValidationError] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const form = useForm({
        type_id: '',
        start: '',
        end: '',
        reason: '',
        supporting_document: null as File | null,
    });

    const selectedType = types.find((type) => String(type.id) === form.data.type_id);
    const isHourly = !selectedType || selectedType.characteristic === 'partial' || selectedType.characteristic === 'external_mission';
    const dayAllowed = !schedule || !hourlyDate || schedule.days.includes(isoWeekday(hourlyDate));
    const scheduleHint = schedule
        ? schedule.break_start && schedule.break_end
            ? `Horaires : ${schedule.start_time.slice(0, 5)} - ${schedule.end_time.slice(0, 5)} (pause ${schedule.break_start.slice(0, 5)}-${schedule.break_end.slice(0, 5)}), les ${schedule.days.map((d) => weekdayLabels[d]).join(', ')}.`
            : `Horaires : ${schedule.start_time.slice(0, 5)} - ${schedule.end_time.slice(0, 5)}, les ${schedule.days.map((d) => weekdayLabels[d]).join(', ')}.`
        : null;

    const isWorkDay = (date: Date) => {
        if (!schedule) return true;
        const weekday = ((date.getDay() + 6) % 7) + 1;
        return schedule.days.includes(weekday);
    };

    const cards = [
        { label: 'Total', value: stats.total },
        { label: 'En attente', value: stats.pending },
        { label: 'Approuvées', value: stats.approved },
        { label: 'Refusées', value: stats.rejected },
    ];

    // =========================
    // EFFETS
    // =========================

    useEffect(() => {
        if (isNew && canCreate) setCreating(true);
    }, [isNew, canCreate]);

    useEffect(() => {
        if (isHourly) {
            if (startTime && endTime && startTime >= endTime) {
                setValidationError("L'heure de début doit être inférieure à l'heure de fin.");
            } else {
                setValidationError('');
            }
        } else {
            if (form.data.start && form.data.end && form.data.start > form.data.end) {
                setValidationError("La date de début doit être inférieure ou égale à la date de fin.");
            } else {
                setValidationError('');
            }
        }
    }, [isHourly, hourlyDate, startTime, endTime, form.data.start, form.data.end]);

    useEffect(() => {
        if (form.data.supporting_document) {
            const file = form.data.supporting_document;
            if (file.type.startsWith('image/')) {
                const url = URL.createObjectURL(file);
                setPreviewUrl(url);
                return () => URL.revokeObjectURL(url);
            } else {
                setPreviewUrl(null);
            }
        } else {
            setPreviewUrl(null);
        }
    }, [form.data.supporting_document]);

    // =========================
    // ACTIONS
    // =========================

    const filter = (key: 'status' | 'type_id', value: string) =>
        router.get(
            '/leave-requests',
            { ...filters, [key]: value === 'all' ? undefined : value },
            { preserveState: true, replace: true },
        );

    const toggleCreate = (open: boolean) => {
        setCreating(open);

        if (!open && isNew) {
            router.get('/leave-requests', { ...filters }, { preserveState: true, replace: true });
        }
    };

    const selectType = (value: string) => {
        form.setData('type_id', value);
        form.setData('start', '');
        form.setData('end', '');
        setHourlyDate('');
        setStartTime('');
        setEndTime('');
    };

    const isFormValid = () => {
        if (validationError) return false;
        if (!form.data.type_id) return false;
        if (!form.data.reason) return false;

        if (isHourly) {
            return !!(hourlyDate && startTime && endTime);
        } else {
            return !!(form.data.start && form.data.end);
        }
    };

    const submit = () => {
        if (validationError) return;
        if (!isFormValid()) return;

        form.transform((data) => {
            const transformed = isHourly
                ? { ...data, start: `${hourlyDate} ${startTime}:00`, end: `${hourlyDate} ${endTime}:00` }
                : { ...data, start: `${data.start} 00:00:00`, end: `${data.end} 23:59:59` };

            // Remove null file to avoid sending "null" string in FormData
            if (!transformed.supporting_document) {
                const { supporting_document, ...rest } = transformed;
                return rest;
            }

            return transformed;
        });

        form.post('/leave-requests', {
            forceFormData: true,
            onSuccess: () => {
                form.reset();
                setHourlyDate('');
                setStartTime('');
                setEndTime('');
                toggleCreate(false);
            },
        });
    };

    const approve = (id: number) => router.patch(`/leave-requests/${id}/approve`, {}, { preserveScroll: true });

    const cancel = (id: number) => router.patch(`/leave-requests/${id}/cancel`, {}, { preserveScroll: true });

    const reject = () => {
        if (!rejecting) return;

        router.patch(
            `/leave-requests/${rejecting.id}/reject`,
            { comment },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setRejecting(null);
                    setViewing(null);
                    setComment('');
                },
            },
        );
    };

    // =========================
    // RENDU
    // =========================

    return (
        <>
            <Head title="Demandes" />
            <div className="flex flex-col gap-6 p-4 lg:p-6">
                <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {cards.map((card) => (
                        <Card key={card.label}>
                            <CardHeader>
                                <CardDescription>{card.label}</CardDescription>
                                <CardTitle className="text-3xl font-semibold tabular-nums">{card.value}</CardTitle>
                            </CardHeader>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Demandes</CardTitle>
                        <CardDescription>Permissions, absences et autres demandes</CardDescription>
                        <CardAction className="flex flex-wrap gap-2">
                            <Select value={filters.status ?? 'all'} onValueChange={(value) => filter('status', value)}>
                                <SelectTrigger size="sm" className="w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les statuts</SelectItem>
                                    {Object.entries(statuses).map(([key, { label }]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={filters.type_id ?? 'all'} onValueChange={(value) => filter('type_id', value)}>
                                <SelectTrigger size="sm" className="w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les types</SelectItem>
                                    {types.map((type) => (
                                        <SelectItem key={type.id} value={String(type.id)}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {canCreate && (
                                <Button size="sm" onClick={() => toggleCreate(true)}>
                                    <Plus /> Nouvelle demande
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
                                        <TableHead>Demandeur</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Période</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Validateur</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {leaveRequests.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                Aucune demande
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {leaveRequests.map((item) => (
                                        <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setViewing(item)}>
                                            <TableCell className="font-medium">{item.user.name}</TableCell>
                                            <TableCell>{item.type.label}</TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {formatDate(item.start)} → {formatDate(item.end)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={statuses[item.status].variant}>{statuses[item.status].label}</Badge>
                                                {item.comment && <p className="mt-1 text-xs text-muted-foreground">{item.comment}</p>}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{item.approver?.name ?? '—'}</TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                    {item.status === 'pending' && item.can.approve && (
                                                        <>
                                                            <Button size="sm" variant="outline" onClick={() => approve(item.id)}>
                                                                <Check /> Approuver
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={() => setRejecting(item)}>
                                                                <X /> Refuser
                                                            </Button>
                                                        </>
                                                    )}
                                                    {item.can.cancel && (
                                                        <Button size="sm" variant="ghost" onClick={() => cancel(item.id)}>
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

            <Dialog open={creating && canCreate} onOpenChange={toggleCreate}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Nouvelle demande</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label>Type</Label>
                            <Select value={form.data.type_id} onValueChange={selectType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir un type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {types.map((type) => (
                                        <SelectItem key={type.id} value={String(type.id)}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedType && (
                                <p className="text-xs text-muted-foreground">
                                    {selectedType.characteristic === 'partial' && 'Une permission avec une heure de début et de fin précises.'}
                                    {selectedType.characteristic === 'external_mission' && 'Une sortie de quelques heures, en dehors des locaux.'}
                                    {selectedType.characteristic === 'full_day' && 'Une ou plusieurs journées complètes, sans heure à préciser.'}
                                    {selectedType.characteristic === 'remote_work' && 'Un ou plusieurs jours de télétravail.'}
                                </p>
                            )}
                            <Err text={form.errors.type_id} />
                        </div>

                        {isHourly ? (
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label>Date</Label>
                                    <DatePicker value={hourlyDate ? new Date(hourlyDate) : undefined}
                                        onChange={(date: Date | undefined) => setHourlyDate(date ? date.toLocaleDateString('fr-CA') : "")}
                                        disabled={(date: Date) => !isWorkDay(date)} />
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label>Heure de début</Label>
                                        <TimePicker
                                            id="start-time"
                                            min={schedule?.start_time.slice(0, 5)}
                                            max={schedule?.end_time.slice(0, 5)}
                                            breakStart={schedule?.break_start?.slice(0, 5)}
                                            breakEnd={schedule?.break_end?.slice(0, 5)}
                                            value={startTime}
                                            onChange={setStartTime}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Heure de fin</Label>
                                        <TimePicker
                                            id="end-time"
                                            min={schedule?.start_time.slice(0, 5)}
                                            max={schedule?.end_time.slice(0, 5)}
                                            breakStart={schedule?.break_start?.slice(0, 5)}
                                            breakEnd={schedule?.break_end?.slice(0, 5)}
                                            value={endTime}
                                            onChange={setEndTime}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Err text={form.errors.start} />
                                    <Err text={validationError} />
                                    {scheduleHint && (
                                        <p className={`text-xs ${dayAllowed ? 'text-muted-foreground' : 'text-destructive'}`}>
                                            {scheduleHint}
                                            {!dayAllowed && hourlyDate && ' — ce jour ne fait pas partie des jours travaillés.'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label>Du</Label>
                                    <DatePicker value={form.data.start ? new Date(form.data.start) : undefined}
                                        onChange={(date: Date | undefined) => form.setData('start', date ? date.toLocaleDateString('fr-CA') : "")}
                                        disabled={(date: Date) => !isWorkDay(date)} />
                                    <Err text={form.errors.start} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Au</Label>
                                    <DatePicker value={form.data.end ? new Date(form.data.end) : undefined}
                                        onChange={(date: Date | undefined) => form.setData('end', date ? date.toLocaleDateString('fr-CA') : "")}
                                        disabled={(date: Date) => !isWorkDay(date)} />
                                    <Err text={form.errors.end} />
                                </div>
                                <div className="sm:col-span-2">
                                    <Err text={validationError} />
                                    <p className="text-xs text-muted-foreground">
                                        Jours couverts, du matin du premier jour au soir du dernier.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label>Motif</Label>
                            <textarea className={textareaClass} value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} />
                            <Err text={form.errors.reason} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Justificatif (facultatif)</Label>
                            <Input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => form.setData('supporting_document', e.target.files?.[0] ?? null)}
                            />
                            {form.data.supporting_document && (
                                <div className="flex items-center gap-2">
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Aperçu" className="h-20 w-20 rounded-md object-cover border" />
                                    ) : (
                                        <div className="flex h-20 w-20 items-center justify-center rounded-md border bg-muted">
                                            <FileText className="size-8 text-muted-foreground" />
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground">{form.data.supporting_document.name}</p>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground">PDF ou photo (JPG, PNG), 10 Mo maximum.</p>
                            <Err text={form.errors.supporting_document} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => toggleCreate(false)}>
                            Fermer
                        </Button>
                        <Button onClick={submit} disabled={form.processing || !isFormValid()}>
                            Envoyer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog de détail d'une demande */}
            <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Détail de la demande</DialogTitle>
                    </DialogHeader>
                    {viewing && (
                        <div className="grid gap-4 text-sm">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Demandeur</p>
                                    <p className="mt-0.5">{viewing.user.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Type</p>
                                    <p className="mt-0.5">{viewing.type.label}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Début</p>
                                    <p className="mt-0.5">{formatDate(viewing.start)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Fin</p>
                                    <p className="mt-0.5">{formatDate(viewing.end)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Statut</p>
                                    <div className="mt-0.5">
                                        <Badge variant={statuses[viewing.status].variant}>
                                            {statuses[viewing.status].label}
                                        </Badge>
                                    </div>
                                </div>
                                {viewing.approver && (
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground">Validateur</p>
                                        <p className="mt-0.5">{viewing.approver.name}</p>
                                    </div>
                                )}
                            </div>

                            {viewing.reason && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Motif</p>
                                    <p className="mt-1 rounded-md bg-muted px-3 py-2 leading-relaxed">{viewing.reason}</p>
                                </div>
                            )}

                            {viewing.comment && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {viewing.status === 'rejected' ? 'Motif du refus' : 'Commentaire'}
                                    </p>
                                    <p className="mt-1 rounded-md bg-muted px-3 py-2 leading-relaxed">{viewing.comment}</p>
                                </div>
                            )}

                            {viewing.supporting_document && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Justificatif</p>
                                    <a
                                        href={`/storage/${viewing.supporting_document}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-1 flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 transition-colors hover:bg-muted"
                                    >
                                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                                        <span className="flex-1 truncate">
                                            {viewing.supporting_document.split('/').pop()}
                                        </span>
                                        <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter className="flex-row flex-wrap gap-2">
                        <Button variant="outline" onClick={() => setViewing(null)} className="mr-auto">
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

            <Dialog open={rejecting !== null} onOpenChange={(open) => !open && setRejecting(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Refuser la demande</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label>Motif du refus</Label>
                        <textarea className={textareaClass} value={comment} onChange={(e) => setComment(e.target.value)} />
                        <Err text={errors.comment} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejecting(null)}>
                            Fermer
                        </Button>
                        <Button variant="destructive" onClick={reject}>
                            Refuser
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Demandes', href: '/leave-requests' }],
}