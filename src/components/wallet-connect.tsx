import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, LogOut, Copy, Loader2 } from "lucide-react";
import { useState } from "react";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono text-xs"
            data-testid="button-wallet-connected"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            {truncateAddress(address)}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-card border-border font-mono text-xs">
          <div className="px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Connected</p>
            <p className="text-xs break-all">{address}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={handleCopy} data-testid="menu-item-copy-address">
            <Copy className="h-3 w-3" />
            {copied ? "Copied!" : "Copy address"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 cursor-pointer text-red-400 focus:text-red-400"
            onClick={() => disconnect()}
            data-testid="menu-item-disconnect"
          >
            <LogOut className="h-3 w-3" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <button
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border hover:border-primary/40 bg-transparent hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors font-mono text-xs disabled:opacity-50"
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      data-testid="button-connect-wallet"
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
      {isPending ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
