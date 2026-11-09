import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(
    props: ImgHTMLAttributes<HTMLImageElement>,
) {
    return <img src="/assets/logo.png" className="object-cover" alt="Logo Presentia" {...props} />;
}
