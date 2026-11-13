import { FileQuestion } from 'lucide-react';

import { ErrorLayout } from './error-layout';

export default function Error404() {
    return (
        <ErrorLayout
            code="404"
            title="Page introuvable"
            message="La page que vous recherchez n'existe pas ou a été déplacée."
            icon={<FileQuestion className="size-20 text-primary" />}
        />
    );
}

Error404.layout = null;
