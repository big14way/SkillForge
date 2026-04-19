import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { Providers } from './providers';
import { WalletConnect } from '@/components/shared/WalletConnect';

export const metadata: Metadata = {
  title: 'SkillForge — Verifiable Agent Skill Marketplace on 0G',
  description:
    'Discover, rent, and publish encrypted agent skills with TeeML-verified quality on 0G Chain.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg text-zinc-100 antialiased">
        <Providers>
          <Header />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-bg-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_12px_rgba(0,255,178,0.8)]" />
          SkillForge
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
          <Link href="/" className="hover:text-white">
            Marketplace
          </Link>
          <Link href="/publish" className="hover:text-white">
            Publish
          </Link>
          <a
            href="https://github.com/big14way/SkillForge"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white"
          >
            GitHub
          </a>
        </nav>
        <WalletConnect />
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-bg-border py-6 text-xs text-zinc-500">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 md:flex-row">
        <div>
          SkillForge · 0G APAC Hackathon (Track 1) · <span className="mono">chain 16602</span>
        </div>
        <div className="flex gap-4">
          <a
            href="https://chainscan-galileo.0g.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white"
          >
            Explorer
          </a>
          <a
            href="https://github.com/big14way/SkillForge"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white"
          >
            Source
          </a>
        </div>
      </div>
    </footer>
  );
}
