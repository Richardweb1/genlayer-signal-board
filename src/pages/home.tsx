import { useState } from "react";
import { useAccount } from "wagmi";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { WalletConnect } from "@/components/wallet-connect";

const CONTRACT_ADDRESS =
  "0xcD0ACecB4BA2Ac21845fa4F4106113B9217a8905" as `0x${string}`;

type Signal = "Bullish" | "Bearish" | "Neutral";
type TxStatus = "idle" | "confirm" | "submitted" | "accepted" | "error";

export default function Home() {
  const { address, isConnected } = useAccount();

  const [signal, setSignal] = useState<Signal>("Bullish");
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getClient = () =>
    createClient({
      chain: testnetBradbury,
      account: address as `0x${string}`,
    });

  const handleReadSignal = async () => {
    setError(null);
    setTxStatus("idle");

    try {
      const client = createClient({ chain: testnetBradbury });

      const result = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_message",
        args: [],
      });

      setSignal(String(result).replaceAll('"', "") as Signal);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not read signal");
      setTxStatus("error");
    }
  };

  const handleSendSignal = async (nextSignal: Signal) => {
    if (!isConnected || !address) {
      setError("Connect your wallet first.");
      setTxStatus("error");
      return;
    }

    setError(null);
    setTxHash(null);
    setTxStatus("confirm");

    try {
      const client = getClient();

      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "set_message",
        args: [nextSignal],
      });

      setTxHash(String(hash));
      setSignal(nextSignal);
      setTxStatus("accepted");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus("error");
    }
  };

  const signalClass =
    signal === "Bullish"
      ? "text-green-400"
      : signal === "Bearish"
      ? "text-red-400"
      : "text-yellow-300";

  const signalIcon =
    signal === "Bullish" ? (
      <TrendingUp className="h-9 w-9" />
    ) : signal === "Bearish" ? (
      <TrendingDown className="h-9 w-9" />
    ) : (
      <Minus className="h-9 w-9" />
    );

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#070612] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#7c3aed33,transparent_35%),radial-gradient(circle_at_bottom_right,#06b6d433,transparent_35%)]" />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-5">
        <div className="flex justify-end mb-10">
          <WalletConnect />
        </div>

        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-xs font-mono uppercase tracking-[0.25em] text-purple-200">
              <Sparkles className="h-4 w-4" />
              Powered by GenLayer Bradbury
            </div>

            <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight">
              GenLayer
              <span className="block bg-gradient-to-r from-purple-300 via-cyan-300 to-green-300 bg-clip-text text-transparent">
                Signal Board
              </span>
            </h1>

            <p className="max-w-xl text-base md:text-lg text-white/65 leading-relaxed">
              A live GenLayer dApp where users submit BTC market signals through
              blockchain transactions and consensus finalization.
            </p>

            <div className="grid grid-cols-3 gap-3 max-w-xl">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-widest text-white/40">
                  Network
                </p>
                <p className="font-bold text-sm mt-1">Bradbury</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-widest text-white/40">
                  Action
                </p>
                <p className="font-bold text-sm mt-1">On-chain</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-widest text-white/40">
                  Status
                </p>
                <p className="font-bold text-sm mt-1">Live</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 md:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-white/40 font-mono">
                  Current Signal
                </p>
                <p className="text-sm text-white/60 mt-1">
                  Stored on GenLayer contract state
                </p>
              </div>
              <ShieldCheck className="h-8 w-8 text-cyan-300" />
            </div>

            <div className="min-h-40 flex items-center justify-center rounded-3xl border border-white/10 bg-black/30 mb-6">
              {txStatus === "confirm" && (
                <div className="text-center space-y-3">
                  <Wallet className="h-10 w-10 text-purple-300 mx-auto animate-pulse" />
                  <p className="font-bold">Confirm in wallet</p>
                </div>
              )}

              {txStatus === "accepted" && (
                <div className="text-center space-y-3">
                  <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto" />
                  <p className="font-bold text-green-300">Transaction submitted</p>
                  <p className="text-xs text-white/50">
                    Finalization can take around 30 minutes.
                  </p>
                </div>
              )}

              {txStatus === "error" && error && (
                <div className="text-center space-y-3 px-3">
                  <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
                  <p className="text-xs text-red-300 break-words">{error}</p>
                </div>
              )}

              {txStatus !== "confirm" &&
                txStatus !== "accepted" &&
                txStatus !== "error" && (
                  <div className={`flex items-center gap-4 ${signalClass}`}>
                    {signalIcon}
                    <span className="text-5xl md:text-6xl font-black">
                      {signal}
                    </span>
                  </div>
                )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleSendSignal("Bullish")}
                disabled={!isConnected || txStatus === "confirm"}
                className="rounded-2xl bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 py-4 font-black uppercase tracking-widest text-xs text-green-200 disabled:opacity-40"
              >
                Bullish
              </button>

              <button
                onClick={() => handleSendSignal("Neutral")}
                disabled={!isConnected || txStatus === "confirm"}
                className="rounded-2xl bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-400/30 py-4 font-black uppercase tracking-widest text-xs text-yellow-100 disabled:opacity-40"
              >
                Neutral
              </button>

              <button
                onClick={() => handleSendSignal("Bearish")}
                disabled={!isConnected || txStatus === "confirm"}
                className="rounded-2xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 py-4 font-black uppercase tracking-widest text-xs text-red-200 disabled:opacity-40"
              >
                Bearish
              </button>
            </div>

            <button
              onClick={handleReadSignal}
              className="mt-3 w-full rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-300/30 py-4 font-black uppercase tracking-widest text-xs text-cyan-100 flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Read Current Signal
            </button>

            {!isConnected && (
              <p className="mt-4 text-center text-xs text-white/45 font-mono">
                Connect wallet to submit a signal transaction.
              </p>
            )}

            {txHash && (
              <p className="mt-4 text-[10px] font-mono text-cyan-200/70 text-center break-all">
                Transaction: {txHash}
              </p>
            )}

            {isConnected && address && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-white/35 font-mono">
                  Connected wallet
                </p>
                <p className="text-xs font-mono text-white/70 break-all mt-1">
                  {address}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}