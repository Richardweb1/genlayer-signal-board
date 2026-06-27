import { FormEvent, useEffect, useRef, useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import type { TransactionHash } from "genlayer-js/types";
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, RefreshCw, SearchCheck, ShieldCheck } from "lucide-react";
import { WalletConnect } from "@/components/wallet-connect";

const CONTRACT_ADDRESS = (import.meta.env.VITE_GENLAYER_CONTRACT_ADDRESS ??
  "0xDB945ca005Abd2a7c098Ccd07cBd3802b79Ef1E5") as `0x${string}`;
const EXPLORER = "https://explorer-bradbury.genlayer.com";

type Verdict = "YES" | "NO" | "UNCLEAR";
type Verification = {
  url: string;
  claim: string;
  verdict_code: number;
  verdict: Verdict;
  reasoning: string;
  requester: string;
  verification_count: number;
};

const EMPTY: Verification = {
  url: "", claim: "", verdict_code: 3, verdict: "UNCLEAR",
  reasoning: "No claim has been finalized yet.", requester: "", verification_count: 0,
};

function normalize(value: unknown): Verification {
  const raw = typeof value === "string" ? JSON.parse(value) : value;
  const v = raw as Partial<Record<keyof Verification, unknown>>;
  const verdict = ["YES", "NO", "UNCLEAR"].includes(String(v.verdict)) ? String(v.verdict) as Verdict : "UNCLEAR";
  return {
    url: String(v.url ?? ""), claim: String(v.claim ?? ""), verdict_code: Number(v.verdict_code ?? 3),
    verdict, reasoning: String(v.reasoning ?? ""), requester: String(v.requester ?? ""),
    verification_count: Number(v.verification_count ?? 0),
  };
}

function getProvider() {
  return (window as Window & { ethereum?: unknown }).ethereum;
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const [url, setUrl] = useState("https://docs.genlayer.com/developers/networks");
  const [claim, setClaim] = useState("Bradbury Testnet uses chain ID 4221.");
  const [latest, setLatest] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState("NOT SUBMITTED");
  const [txResult, setTxResult] = useState("-");
  const pollRef = useRef<number | null>(null);
  const configured = /^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS);

  const readLatest = async () => {
    if (!configured) return;
    try {
      const client = createClient({ chain: testnetBradbury });
      const result = await client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_latest_verification", args: [] });
      setLatest(normalize(result));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read finalized contract state.");
    }
  };

  useEffect(() => { void readLatest(); }, []);
  useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current); }, []);

  const monitor = (hash: TransactionHash) => {
    const client = createClient({ chain: testnetBradbury });
    const poll = async () => {
      try {
        const tx = await client.getTransaction({ hash });
        setTxStatus(String(tx.statusName ?? tx.status ?? "PENDING"));
        setTxResult(String(tx.resultName ?? "IDLE"));
        if (tx.statusName === "ACCEPTED" || tx.statusName === "FINALIZED") await readLatest();
        if (["FINALIZED", "CANCELED", "UNDETERMINED", "VALIDATORS_TIMEOUT", "LEADER_TIMEOUT"].includes(String(tx.statusName))) {
          if (pollRef.current) window.clearInterval(pollRef.current);
          pollRef.current = null;
          setSubmitting(false);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not refresh transaction status.");
      }
    };
    void poll();
    pollRef.current = window.setInterval(() => void poll(), 5000);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isConnected || !address) return setError("Connect your wallet first.");
    if (!configured) return setError("Deploy the new contract, then add its address to VITE_GENLAYER_CONTRACT_ADDRESS.");
    if (!getProvider()) return setError("A browser wallet provider is required.");
    setSubmitting(true); setError(null); setTxHash(null); setTxStatus("SUBMITTING"); setTxResult("-");
    try {
      if (chainId !== 4221) await switchChainAsync({ chainId: 4221 });
      const client = createClient({ chain: testnetBradbury, account: address, provider: getProvider() });
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS, functionName: "verify_claim", args: [url.trim(), claim.trim()], value: 0n,
      }) as TransactionHash;
      setTxHash(hash); setTxStatus("PENDING"); monitor(hash);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction submission failed.");
      setTxStatus("FAILED TO SUBMIT"); setSubmitting(false);
    }
  };

  const tone = latest.verdict === "YES" ? "text-emerald-300" : latest.verdict === "NO" ? "text-rose-300" : "text-amber-200";

  return <main className="min-h-dvh bg-[#070a10] text-white">
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="flex items-center justify-between"><div className="flex items-center gap-2 font-black tracking-tight"><SearchCheck className="text-cyan-300"/> LIVE CLAIM CHECKER</div><WalletConnect /></header>
      <section className="grid gap-8 py-12 lg:grid-cols-[1fr_.9fr]">
        <div>
          <p className="mb-4 font-mono text-xs uppercase tracking-[.25em] text-cyan-300">One URL. One claim. Validator consensus.</p>
          <h1 className="text-5xl font-black leading-none md:text-7xl">Check a claim against the <span className="bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">live web.</span></h1>
          <p className="mt-6 max-w-xl text-white/60">GenLayer validators independently fetch the page and use AI to decide whether its live content supports your claim.</p>
          <form onSubmit={submit} className="mt-9 space-y-4 rounded-3xl border border-white/10 bg-white/[.05] p-5">
            <label className="block text-xs uppercase tracking-widest text-white/45">Evidence URL<input type="url" required maxLength={500} value={url} onChange={e => setUrl(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400" /></label>
            <label className="block text-xs uppercase tracking-widest text-white/45">Claim<textarea required minLength={5} maxLength={500} value={claim} onChange={e => setClaim(e.target.value)} rows={3} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400" /></label>
            <button disabled={submitting || !isConnected || !configured} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 font-bold text-black disabled:opacity-40">{submitting ? <><Loader2 className="h-4 w-4 animate-spin"/>Consensus in progress</> : <><ShieldCheck className="h-4 w-4"/>Verify live claim</>}</button>
            {!configured && <p className="text-xs text-amber-200">New Bradbury contract address is not configured yet.</p>}
            {error && <div className="flex gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-200"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</div>}
          </form>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[.05] p-6">
          <div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-widest text-white/40">Latest finalized verification</p><p className="mt-1 text-xs text-white/40">#{latest.verification_count}</p></div><button onClick={readLatest} disabled={!configured} aria-label="Refresh finalized state" className="rounded-lg border border-white/10 p-2 disabled:opacity-30"><RefreshCw className="h-4 w-4"/></button></div>
          <div className={`my-7 flex items-center gap-3 ${tone}`}><CheckCircle2 className="h-9 w-9"/><span className="text-5xl font-black">{latest.verdict}</span></div>
          <p className="text-sm font-semibold">{latest.claim || "Waiting for the first verification."}</p>
          <p className="mt-3 text-sm leading-relaxed text-white/55">{latest.reasoning}</p>
          {latest.url && <a href={latest.url} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-1 break-all text-xs text-cyan-300">{latest.url}<ExternalLink className="h-3 w-3 shrink-0"/></a>}
          <div className="mt-7 border-t border-white/10 pt-5">
            <div className="grid grid-cols-2 gap-3"><Stat label="Transaction status" value={txStatus}/><Stat label="Consensus result" value={txResult}/></div>
            {txHash && <a href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer" className="mt-4 block break-all font-mono text-xs text-cyan-300">{txHash}</a>}
          </div>
        </div>
      </section>
    </div>
  </main>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] uppercase tracking-widest text-white/35">{label}</p><p className="mt-1 break-words text-sm font-bold">{value}</p></div>;
}
