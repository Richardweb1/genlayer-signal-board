# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

"""GenLayer Intelligent Contract for consensus-backed BTC market analysis."""

from genlayer import *
import json


API_URL = (
    "https://api.coingecko.com/api/v3/simple/price"
    "?ids=bitcoin&vs_currencies=usd&include_24hr_change=true"
)
VALID_SIGNALS = ("Bullish", "Bearish", "Neutral")


def expected_signal(change_bps: int) -> str:
    """Map the 24-hour change (basis points) to an auditable signal."""
    if change_bps > 200:
        return "Bullish"
    if change_bps < -200:
        return "Bearish"
    return "Neutral"


def valid_analysis(value: object) -> bool:
    if not isinstance(value, dict):
        return False
    price_cents = value.get("price_cents")
    change_bps = value.get("change_bps")
    confidence = value.get("confidence")
    reasoning = value.get("reasoning")
    signal = value.get("signal")
    return (
        isinstance(price_cents, int)
        and not isinstance(price_cents, bool)
        and price_cents > 0
        and isinstance(change_bps, int)
        and not isinstance(change_bps, bool)
        and -10000 <= change_bps <= 10000
        and isinstance(confidence, int)
        and not isinstance(confidence, bool)
        and 0 <= confidence <= 100
        and isinstance(reasoning, str)
        and 1 <= len(reasoning.strip()) <= 600
        and signal in VALID_SIGNALS
        and signal == expected_signal(change_bps)
    )


class BtcMarketContract(gl.Contract):
    last_price_cents: u256
    last_change_bps: i32
    last_signal: str
    last_confidence: u8
    last_reasoning: str
    analysis_count: u256

    def __init__(self):
        self.last_price_cents = u256(0)
        self.last_change_bps = i32(0)
        self.last_signal = "Unknown"
        self.last_confidence = u8(0)
        self.last_reasoning = "No analysis has been finalized yet."
        self.analysis_count = u256(0)

    def _analyze_with_consensus(self) -> dict:
        def fetch_market() -> dict:
            response = gl.nondet.web.get(API_URL)
            payload = json.loads(response.body.decode("utf-8"))
            bitcoin = payload["bitcoin"]
            return {
                "price_cents": int(float(bitcoin["usd"]) * 100),
                "change_bps": int(float(bitcoin["usd_24h_change"]) * 100),
            }

        def leader_fn() -> str:
            market = fetch_market()
            signal = expected_signal(market["change_bps"])
            prompt = f"""You are an AI market analyst operating inside a GenLayer validator.

Bitcoin price: ${market['price_cents'] / 100:.2f}
24-hour change: {market['change_bps'] / 100:.2f}%
Required signal: {signal}

Explain the signal briefly and assign confidence from 0 to 100. The signal is
auditable: above +2% is Bullish, below -2% is Bearish, otherwise Neutral.
Return ONLY JSON: {{"confidence": <integer>, "reasoning": "<max 600 chars>"}}"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(raw, dict):
                raw = json.loads(str(raw))
            result = {
                "price_cents": market["price_cents"],
                "change_bps": market["change_bps"],
                "signal": signal,
                "confidence": int(raw.get("confidence", 0)),
                "reasoning": str(raw.get("reasoning", "")).strip()[:600],
            }
            return json.dumps(result, sort_keys=True)

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            try:
                proposed = json.loads(leader_result.calldata)
                if not valid_analysis(proposed):
                    return False
                observed = fetch_market()
                price_delta = abs(proposed["price_cents"] - observed["price_cents"])
                price_is_close = price_delta * 100 <= observed["price_cents"] * 2
                change_is_close = abs(proposed["change_bps"] - observed["change_bps"]) <= 50
                return price_is_close and change_is_close
            except Exception:
                return False

        return json.loads(gl.vm.run_nondet_unsafe(leader_fn, validator_fn))

    @gl.public.write
    def analyze_market(self) -> dict:
        analysis = self._analyze_with_consensus()
        self.last_price_cents = u256(analysis["price_cents"])
        self.last_change_bps = i32(analysis["change_bps"])
        self.last_signal = analysis["signal"]
        self.last_confidence = u8(analysis["confidence"])
        self.last_reasoning = analysis["reasoning"]
        self.analysis_count += u256(1)
        return self._result()

    def _result(self) -> dict:
        return {
            "price_cents": self.last_price_cents,
            "change_bps": self.last_change_bps,
            "signal": self.last_signal,
            "confidence": self.last_confidence,
            "reasoning": self.last_reasoning,
            "analysis_count": self.analysis_count,
        }

    @gl.public.view
    def get_last_result(self) -> dict:
        return self._result()
