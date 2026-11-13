import { ShieldX } from 'lucide-react';

import { ErrorLayout } from './error-layout';

export default function Error419() {
    return (
        <ErrorLayout
            code="419"
            title="Session expirée"
            message="Votre session a expiré. Veuillez rafraîchir la page et réessayer."
            icon={<ShieldX className="size-20 text-primary" />}
        />
    );
}

Error419.layout = null;
