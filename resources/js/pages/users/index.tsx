import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Check, Eye, EyeOff, Pencil, Plus, UserCheck, UserX } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
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
import { Pagination, type PaginationData } from '@/components/pagination';

// =========================
// TYPES
// =========================

type RoleOption = { value: string; label: string };
type ServiceOption = { id: number; name: string };

type UserRow = {
    id: number;
    name: string;
    email: string;
    identifier: string | null;
    role: string;
    role_label: string;
    service: { id: number; name: string } | null;
    rest_quota: number;
    active: boolean;
};

type Props = {
    users: PaginationData & { data: UserRow[] };
    services: ServiceOption[];
    roles: RoleOption[];
    filters: { role?: string; service_id?: string; active?: string };
    canCreate: boolean;
};

// =========================
// HELPERS
// =========================

const Err = ({ text }: { text?: string }) =>
    text ? <p className="mt-1 text-sm text-destructive">{text}</p> : null;

const roleBadgeVariant = (
    role: string,
): 'default' | 'secondary' | 'outline' | 'destructive' => {
    if (role === 'administrator') return 'destructive';
    if (role === 'hr') return 'default';
    if (role === 'manager') return 'secondary';
    return 'outline';
};

// =========================
// COMPONENT
// =========================

export default function Index({ users, services, roles, filters, canCreate }: Props) {
    const page = usePage<{ errors: Record<string, string> }>();
    const { errors } = page.props;

    const [creating, setCreating] = useState(false);
    const [editingQuota, setEditingQuota] = useState<UserRow | null>(null);
    const [editingRole, setEditingRole] = useState<UserRow | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [quotaValue, setQuotaValue] = useState('');
    const [roleValue, setRoleValue] = useState('');

    const form = useForm({
        name: '',
        email: '',
        identifier: '',
        role: 'employee',
        service_id: '',
        manager_id: '',
        rest_quota: '0',
        password: '',
    });

    // Managers: only users with role manager or administrator
    const managers = users.filter((u) =>
        u.role === 'manager' || u.role === 'administrator',
    );

    const filter = (key: string, value: string) =>
        router.get(
            '/users',
            { ...filters, [key]: value === 'all' ? undefined : value },
            { preserveState: true, replace: true },
        );

    const submit = () => {
        form.post('/users', {
            onSuccess: () => {
                form.reset();
                setCreating(false);
            },
        });
    };

    const saveQuota = () => {
        if (!editingQuota) return;
        router.patch(
            `/users/${editingQuota.id}/quota`,
            { rest_quota: parseInt(quotaValue, 10) },
            {
                preserveScroll: true,
                onSuccess: () => setEditingQuota(null),
            },
        );
    };

    const saveRole = () => {
        if (!editingRole) return;
        router.patch(
            `/users/${editingRole.id}/role`,
            { role: roleValue },
            {
                preserveScroll: true,
                onSuccess: () => setEditingRole(null),
            },
        );
    };

    const toggleActive = (user: UserRow) => {
        const url = user.active
            ? `/users/${user.id}/deactivate`
            : `/users/${user.id}/activate`;
        router.patch(url, {}, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Utilisateurs" />
            <div className="flex flex-col gap-6 p-4 lg:p-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Utilisateurs</CardTitle>
                        <CardDescription>
                            Comptes enregistrés dans Presentia
                        </CardDescription>
                        <CardAction className="flex flex-wrap gap-2">
                            {/* Filter: role */}
                            <Select
                                value={filters.role ?? 'all'}
                                onValueChange={(v) => filter('role', v)}
                            >
                                <SelectTrigger size="sm" className="w-44">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les rôles</SelectItem>
                                    {roles.map((r) => (
                                        <SelectItem key={r.value} value={r.value}>
                                            {r.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Filter: service */}
                            <Select
                                value={filters.service_id ?? 'all'}
                                onValueChange={(v) => filter('service_id', v)}
                            >
                                <SelectTrigger size="sm" className="w-44">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les services</SelectItem>
                                    {services.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Filter: active */}
                            <Select
                                value={filters.active ?? 'all'}
                                onValueChange={(v) => filter('active', v)}
                            >
                                <SelectTrigger size="sm" className="w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous</SelectItem>
                                    <SelectItem value="1">Actifs</SelectItem>
                                    <SelectItem value="0">Désactivés</SelectItem>
                                </SelectContent>
                            </Select>

                            {canCreate && (
                                <Button size="sm" onClick={() => setCreating(true)}>
                                    <Plus /> Nouvel utilisateur
                                </Button>
                            )}
                        </CardAction>
                    </CardHeader>
                    <CardContent>
                        <Err text={errors.email} />
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nom</TableHead>
                                        <TableHead className="hidden md:table-cell">Email</TableHead>
                                        <TableHead>Rôle</TableHead>
                                        <TableHead className="hidden lg:table-cell">Service</TableHead>
                                        <TableHead className="hidden lg:table-cell">Quota repos</TableHead>
                                        <TableHead className="hidden sm:table-cell">Statut</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={7}
                                                className="text-center text-muted-foreground"
                                            >
                                                Aucun utilisateur
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {users.map((u) => (
                                        <TableRow
                                            key={u.id}
                                            className={!u.active ? 'opacity-50' : ''}
                                        >
                                            <TableCell className="font-medium">
                                                {u.name}
                                                {u.identifier && (
                                                    <span className="ml-1 text-xs text-muted-foreground">
                                                        #{u.identifier}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-muted-foreground">
                                                {u.email}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={roleBadgeVariant(u.role)}>
                                                    {u.role_label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-muted-foreground">
                                                {u.service?.name ?? '—'}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                <span className="tabular-nums">
                                                    {u.rest_quota} j/mois
                                                </span>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                <Badge
                                                    variant={u.active ? 'default' : 'outline'}
                                                >
                                                    {u.active ? 'Actif' : 'Désactivé'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-1">
                                                    {/* Edit quota */}
                                                    {u.role !== 'administrator' && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            title="Modifier le quota de repos"
                                                            onClick={() => {
                                                                setEditingQuota(u);
                                                                setQuotaValue(String(u.rest_quota));
                                                            }}
                                                        >
                                                            <Pencil className="size-4" />
                                                        </Button>
                                                    )}
                                                    {/* Edit role */}
                                                    {u.role !== 'administrator' && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            title="Modifier le rôle"
                                                            onClick={() => {
                                                                setEditingRole(u);
                                                                setRoleValue(u.role);
                                                            }}
                                                        >
                                                            <UserCheck className="size-4" />
                                                        </Button>
                                                    )}
                                                    {/* Toggle active */}
                                                    {u.role !== 'administrator' && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            title={
                                                                u.active
                                                                    ? 'Désactiver le compte'
                                                                    : 'Réactiver le compte'
                                                            }
                                                            onClick={() => toggleActive(u)}
                                                        >
                                                            {u.active ? (
                                                                <UserX className="size-4 text-destructive" />
                                                            ) : (
                                                                <UserCheck className="size-4 text-green-600" />
                                                            )}
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

            {/* ── Dialog : Création d'un utilisateur ── */}
            <Dialog open={creating} onOpenChange={setCreating}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Nouvel utilisateur</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4">
                        {/* Nom */}
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nom complet</Label>
                            <Input
                                id="name"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                autoComplete="off"
                            />
                            <Err text={form.errors.name} />
                        </div>

                        {/* Email */}
                        <div className="grid gap-2">
                            <Label htmlFor="email">Adresse e-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                autoComplete="off"
                            />
                            <Err text={form.errors.email} />
                        </div>

                        {/* Identifiant interne */}
                        <div className="grid gap-2">
                            <Label htmlFor="identifier">
                                Identifiant interne{' '}
                                <span className="text-muted-foreground">(facultatif)</span>
                            </Label>
                            <Input
                                id="identifier"
                                value={form.data.identifier}
                                onChange={(e) =>
                                    form.setData('identifier', e.target.value)
                                }
                                placeholder="Ex : EMP-001"
                            />
                            <Err text={form.errors.identifier} />
                        </div>

                        {/* Mot de passe */}
                        <div className="grid gap-2">
                            <Label htmlFor="password">
                                Mot de passe provisoire
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.data.password}
                                    onChange={(e) =>
                                        form.setData('password', e.target.value)
                                    }
                                    autoComplete="new-password"
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    onClick={() => setShowPassword((v) => !v)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <EyeOff className="size-4" />
                                    ) : (
                                        <Eye className="size-4" />
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                12 caractères minimum. L'utilisateur devra le changer à sa première connexion.
                            </p>
                            <Err text={form.errors.password} />
                        </div>

                        {/* Rôle */}
                        <div className="grid gap-2">
                            <Label>Rôle</Label>
                            <Select
                                value={form.data.role}
                                onValueChange={(v) => form.setData('role', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles
                                        .filter((r) => r.value !== 'administrator')
                                        .map((r) => (
                                            <SelectItem key={r.value} value={r.value}>
                                                {r.label}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            <Err text={form.errors.role} />
                        </div>

                        {/* Service */}
                        <div className="grid gap-2">
                            <Label>
                                Service{' '}
                                <span className="text-muted-foreground">(facultatif)</span>
                            </Label>
                            <Select
                                value={form.data.service_id || 'none'}
                                onValueChange={(v) =>
                                    form.setData('service_id', v === 'none' ? '' : v)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Aucun service" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">— Aucun service —</SelectItem>
                                    {services.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Err text={form.errors.service_id} />
                        </div>

                        {/* Responsable */}
                        <div className="grid gap-2">
                            <Label>
                                Responsable hiérarchique{' '}
                                <span className="text-muted-foreground">(facultatif)</span>
                            </Label>
                            <Select
                                value={form.data.manager_id || 'none'}
                                onValueChange={(v) =>
                                    form.setData('manager_id', v === 'none' ? '' : v)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Aucun responsable" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">— Aucun responsable —</SelectItem>
                                    {managers.map((m) => (
                                        <SelectItem key={m.id} value={String(m.id)}>
                                            {m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Err text={form.errors.manager_id} />
                        </div>

                        {/* Quota jours de repos */}
                        <div className="grid gap-2">
                            <Label htmlFor="rest_quota">
                                Quota de jours de repos par mois
                            </Label>
                            <Input
                                id="rest_quota"
                                type="number"
                                min={0}
                                max={31}
                                value={form.data.rest_quota}
                                onChange={(e) =>
                                    form.setData('rest_quota', e.target.value)
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                0 = pas de droit aux jours de repos. Le module ne sera pas visible pour cet employé.
                            </p>
                            <Err text={form.errors.rest_quota} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                form.reset();
                                setCreating(false);
                            }}
                        >
                            Fermer
                        </Button>
                        <Button onClick={submit} disabled={form.processing}>
                            <Check /> Créer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Dialog : Modifier le quota de repos ── */}
            <Dialog
                open={editingQuota !== null}
                onOpenChange={(open) => !open && setEditingQuota(null)}
            >
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Quota de jours de repos</DialogTitle>
                    </DialogHeader>
                    {editingQuota && (
                        <div className="grid gap-4">
                            <p className="text-sm text-muted-foreground">
                                Modification du quota pour{' '}
                                <strong>{editingQuota.name}</strong>.
                                Le changement prend effet à partir du mois suivant.
                            </p>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-quota">Jours par mois</Label>
                                <Input
                                    id="edit-quota"
                                    type="number"
                                    min={0}
                                    max={31}
                                    value={quotaValue}
                                    onChange={(e) => setQuotaValue(e.target.value)}
                                />
                                <Err text={errors.rest_quota} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditingQuota(null)}
                        >
                            Fermer
                        </Button>
                        <Button onClick={saveQuota}>
                            <Check /> Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Dialog : Modifier le rôle ── */}
            <Dialog
                open={editingRole !== null}
                onOpenChange={(open) => !open && setEditingRole(null)}
            >
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Modifier le rôle</DialogTitle>
                    </DialogHeader>
                    {editingRole && (
                        <div className="grid gap-4">
                            <p className="text-sm text-muted-foreground">
                                Modification du rôle pour{' '}
                                <strong>{editingRole.name}</strong>.
                            </p>
                            <div className="grid gap-2">
                                <Label>Rôle</Label>
                                <Select
                                    value={roleValue}
                                    onValueChange={setRoleValue}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles
                                            .filter((r) => r.value !== 'administrator')
                                            .map((r) => (
                                                <SelectItem key={r.value} value={r.value}>
                                                    {r.label}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                <Err text={errors.role} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditingRole(null)}
                        >
                            Fermer
                        </Button>
                        <Button onClick={saveRole}>
                            <Check /> Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Utilisateurs', href: '/users' }],
};
