import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'RSLpred-2.0 - Rice Subcellular Localization Prediction',
  description: 'Deep neural network for Oryza sativa (Rice) subcellular localization prediction',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-white text-slate-900 antialiased">
        <Navbar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
        <Footer />
      </body>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-QY4V9X0Y3J"
        strategy="afterInteractive"
      />
      <Script id="rslpred2-google-tag" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-QY4V9X0Y3J');`}
      </Script>
    </html>
  );
}
