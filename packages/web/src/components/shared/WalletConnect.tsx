'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

/**
 * Thin wrapper around RainbowKit's ConnectButton — we render the "custom"
 * version so we can apply our shadcn-like button classes to keep the visual
 * register consistent with the rest of the app.
 */
export function WalletConnect() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;
        return (
          <div className="flex items-center gap-2" aria-hidden={!ready}>
            {!connected ? (
              <button onClick={openConnectModal} className="btn-primary">
                Connect wallet
              </button>
            ) : chain.unsupported ? (
              <button onClick={openChainModal} className="btn-secondary">
                Wrong network
              </button>
            ) : (
              <>
                <button onClick={openChainModal} className="btn-ghost mono">
                  {chain.name}
                </button>
                <button onClick={openAccountModal} className="btn-secondary mono">
                  {account.displayName}
                </button>
              </>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
