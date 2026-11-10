import { Head } from '@inertiajs/react';

import { ActivityChart, type Point } from '@/components/dashboard/activity-chart';
import { RequestsTable, type Row } from '@/components/dashboard/requests-table';
import { StatCards, type Stat } from '@/components/dashboard/stat-cards';
import { dashboard } from '@/routes';

type Props = {
    view: 'admin' | 'personal';
    stats: Stat[];
    chartData: Point[];
    requests: Row[];
};

// =========================
// RENDU
// =========================

export default function Dashboard({ view, stats, chartData, requests }: Props) {
    const admin = view === 'admin';

    return (
        <>
            <Head title="Tableau de bord" />
            <div className="@container/main flex flex-col gap-6 p-4 lg:p-6">
                <StatCards stats={stats} />
                <ActivityChart
                    data={chartData}
                    title={admin ? 'Présences par jour' : 'Heures travaillées'}
                    label={admin ? 'Présents' : 'Heures'}
                />
                <RequestsTable
                    rows={requests}
                    showUser={admin}
                    title={admin ? 'Demandes à valider' : 'Mes dernières demandes'}
                    description={admin ? 'Les plus anciennes en attente' : 'Permissions, jours de repos et régularisations'}
                />
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Tableau de bord', href: dashboard() }],
};