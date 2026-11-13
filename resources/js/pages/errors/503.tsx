import { Construction } from 'lucide-react';

import { ErrorLayout } from './error-layout';

export default function Error503() {
    return (
        <ErrorLayout
            code="503"
            title="Service indisponible"
            message="Le service est temporairement indisponible pour maintenance. Veuillez réessayer dans quelques instants."
            icon={<Construction className="size-20 text-primary" />}
            showBackButton={false}
        />
    );
}

Error503.layout = null;
