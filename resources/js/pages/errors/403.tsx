import { ShieldAlert } from 'lucide-react';

import { ErrorLayout } from './error-layout';

export default function Error403() {
    return (
        <ErrorLayout
            code="403"
            title="Accès interdit"
            message="Vous n'avez pas l'autorisation d'accéder à cette ressource."
            icon={<ShieldAlert className="size-20 text-primary" />}
        />
    );
}

Error403.layout = null;
