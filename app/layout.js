import './globals.css';
import Nav from '@/components/Nav';
export const metadata = { title: 'BRCA Genome & Medical Research DB' };
export default function RootLayout({ children }) {
  return (<html lang="en"><body><Nav /><main>{children}</main></body></html>);
}
