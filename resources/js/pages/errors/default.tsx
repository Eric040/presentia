import { AlertTriangle } from 'lucide-react';

import { ErrorLayout } from './error-layout';

type Props = {
    status?: number;
};

export default function ErrorDefault({ status = 500 }: Props) {
    const messages: Record<number, { title: string; message: string }> = {
        400: {
            title: 'Requête invalide',
            message: 'La requête envoyée est invalide ou mal formée.',
        },
        401: {
            title: 'Non authentifié',
            message: 'Vous devez être connecté pour accéder à cette ressource.',
        },
        402: {
            title: 'Paiement requis',
            message: 'Un paiement est requis pour accéder à cette ressource.',
        },
        405: {
            title: 'Méthode non autorisée',
            message: 'La méthode HTTP utilisée n\'est pas autorisée pour cette ressource.',
        },
        408: {
            title: 'Délai d\'attente dépassé',
            message: 'Le serveur a mis trop de temps à répondre.',
        },
        429: {
            title: 'Trop de requêtes',
            message: 'Vous avez envoyé trop de requêtes. Veuillez patienter avant de réessayer.',
        },
        500: {
            title: 'Erreur serveur',
            message: 'Une erreur interne s\'est produite sur le serveur.',
        },
        502: {
            title: 'Passerelle invalide',
            message: 'Le serveur a reçu une réponse invalide.',
        },
        504: {
            title: 'Délai d\'attente dépassé',
            message: 'Le serveur n\'a pas répondu à temps.',
        },
    };

    const error = messages[status] ?? {
        title: 'Erreur',
        message: 'Une erreur inattendue s\'est produite.',
    };

    return (
        <ErrorLayout
            code={String(status)}
            title={error.title}
            message={error.message}
            icon={<AlertTriangle className="size-20 text-primary" />}
        />
    );
}

ErrorDefault.layout = null;
