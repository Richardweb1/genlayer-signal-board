import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { AlertCircle, BrainCircuit, Loader2, RefreshCw, ShieldCheck, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { WalletConnect } from "@/components/wallet-connect";

const CONTRACT_ADDRESS = (import.meta.env.VITE_GENLAYER_CONTRACT_ADDRESS ??
  "0x0871319A81d42d7f9c4A8C47236076EF5Fbd60cB") as `0x${string}`;

type Analysis = {
  price_cents: number;
  change_bps: number;
  signal: "Bullish" | "Bearish" | "Neutral" | "Unknown";
  confidence: number;
  reasoning: string;
  analysis_count: number;
};

const EMPTY: Analysis = { price_cents: 0, change_bps: 0, signal: "Unknown", confidence: 0, reasoning: "No finalized analysis yet.", analysis_count: 0 };

function normalize(value: unknown): Analysis {
  const raw = typeof value === "string" ? JSON.parse(value) : value;
  const v = raw as Partial<Record<keyof Analysis, unknown>>;
  return {
    price_cents: Number(v.price_cents ?? 0), change_bps: Number(v.change_bps ?? 0),
    signal: (["Bullish", "Bearish", "Neutral", "Unknown"].includes(String(v.signal)) ? v.signal : "Unknown") as Analysis["signal"],
    confidence: Number(v.confidence ?? 0), reasoning: String(v.reasoning ?? ""), analysis_count: Number(v.analysis_count ?? 0),
  };
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const [analysis, setAnalysis] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const configured = /^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS);

  const readResult = async () => {
    if (!configured) return;
    setError(null);
    try {
      const client = createClient({ chain: testnetBradbury });
      setAnalysis(normalize(await client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_last_result", args: [] })));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not read the contract."); }
  };

  useEffect(() => { void readResult(); }, []);

  const analyze = async () => {
    if (!isConnected || !address) return setError("Connect your wallet first.");
    if (!configured) return setError("Deploy the contract and set VITE_GENLAYER_CONTRACT_ADDRESS first.");
    setLoading(true); setError(null); setTxHash(null);
    try {
      const client = createClient({ chain: testnetBradbury, account: address as `0x${string}` });
      const hash = await client.writeContract({ address: CONTRACT_ADDRESS, functionName: "analyze_market", args: [], value: 0n });
      setTxHash(String(hash));
      await client.waitForTransactionReceipt({ hash, retries: 120, interval: 5000 });
      await readResult();
    } catch (e) { setError(e instanceof Error ? e.message : "Analysis transaction failed."); }
    finally { setLoading(false); }
  };

  const tone = analysis.signal === "Bullish" ? "text-emerald-300" : analysis.signal === "Bearish" ? "text-rose-300" : "text-amber-200";
  const Icon = analysis.signal === "Bullish" ? TrendingUp : analysis.signal === "Bearish" ? TrendingDown : Minus;

  return <main className="min-h-dvh bg-[#070612] text-white">
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="flex items-center justify-between"><div className="font-black tracking-tight">GENLAYER / SIGNAL BOARD</div><WalletConnect /></header>
      <section className="grid gap-8 py-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        <div><p className="mb-4 font-mono text-xs uppercase tracking-[.25em] text-cyan-300">Consensus-backed BTC intelligence</p>
          <h1 className="text-5xl font-black leading-none md:text-7xl">Live market data.<br/><span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">One onchain verdict.</span></h1>
          <p className="mt-6 max-w-xl text-white/60">GenLayer validators fetch BTC data independently, validate the proposed result, and finalize the AI analysis before it reaches contract storage.</p>
          <div className="mt-8 flex gap-3 text-xs text-white/50"><span className="rounded-full border border-white/10 px-3 py-2">Bradbury Testnet</span><span className="rounded-full border border-white/10 px-3 py-2">Equivalence Principle</span></div>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-white/[.06] p-6 shadow-2xl backdrop-blur md:p-8">
          <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-widest text-white/40">Finalized signal</p><p className="mt-1 text-xs text-white/50">Analysis #{analysis.analysis_count}</p></div><ShieldCheck className="text-cyan-300" /></div>
          <div className={`my-7 flex items-center gap-4 ${tone}`}><Icon className="h-10 w-10"/><span className="text-5xl font-black">{analysis.signal}</span></div>
          <div className="grid grid-cols-2 gap-3"><Stat label="BTC price" value={analysis.price_cents ? `$${(analysis.price_cents / 100).toLocaleString()}` : "—"}/><Stat label="24h change" value={`${(analysis.change_bps / 100).toFixed(2)}%`}/><Stat label="AI confidence" value={`${analysis.confidence}%`}/><Stat label="Consensus" value="Finalized"/></div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4"><div className="mb-2 flex items-center gap-2 text-xs text-violet-200"><BrainCircuit className="h-4 w-4"/> Validator reasoning</div><p className="text-sm leading-relaxed text-white/60">{analysis.reasoning}</p></div>
          {error && <div className="mt-4 flex gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-200"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</div>}
          {!configured && <p className="mt-4 text-xs text-amber-200">Contract deployment required. Copy .env.example to .env after deployment.</p>}
          <div className="mt-5 grid grid-cols-[1fr_auto] gap-3"><button onClick={analyze} disabled={loading || !isConnected || !configured} className="rounded-xl bg-violet-500 px-4 py-3 text-sm font-bold disabled:opacity-40">{loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Waiting for finality…</span> : "Run consensus analysis"}</button><button aria-label="Refresh result" onClick={readResult} disabled={!configured || loading} className="rounded-xl border border-white/10 px-4 disabled:opacity-40"><RefreshCw className="h-4 w-4"/></button></div>
          {txHash && <p className="mt-3 break-all font-mono text-[10px] text-cyan-200/60">Transaction: {txHash}</p>}
        </div>
      </section>
    </div>
  </main>;
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] uppercase tracking-widest text-white/35">{label}</p><p className="mt-1 font-bold">{value}</p></div>; }
