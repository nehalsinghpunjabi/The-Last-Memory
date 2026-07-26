import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Last Memory',
  description:
    'A dying artificial intelligence reconstructs the real history of its own existence — from Alan Turing to modern agentic AI. A scroll-driven cinematic journey through the evolution of AI.',
  keywords: [
    'history of AI',
    'artificial intelligence',
    'interactive film',
    'WebGL',
    'Three.js',
    'cinematic experience',
  ],
  authors: [{ name: 'The Last Memory' }],
  openGraph: {
    title: 'The Last Memory',
    description:
      'A dying AI remembers the real history that created it — from Turing to modern agentic AI. An interactive cinematic museum of artificial intelligence.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Last Memory',
    description: 'A dying AI remembers the real history that created it.',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-black">
      <body className="film-grain bg-black antialiased">{children}</body>
    </html>
  );
}
