import { ServerCrash } from 'lucide-react';

import { ErrorLayout } from './error-layout';

export default function Error500() {
    return (
        <ErrorLayout
            code="500"
            title="Erreur serveur"
            message="Une erreur interne s'est produite. Veuillez réessayer plus tard."
            icon={<ServerCrash className="size-20 text-primary" />}
        />
    );
}

Error500.layout = null;
