import './globals.css';import type {Metadata} from 'next';
export const metadata:Metadata={title:'SENTINEL | Security Intelligence',description:'Security monitoring and incident investigation'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
