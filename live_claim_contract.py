# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

"""A small GenLayer contract that verifies one claim against one live web page."""

from genlayer import *
import json


YES = 1
NO = 2
UNCLEAR = 3
MAX_PAGE_BYTES = 12000


def clean(value: object, limit: int) -> str:
    return " ".join(str(value).strip().split())[:limit]


def verdict_name(value: int) -> str:
    if value == YES:
        return "YES"
    if value == NO:
        return "NO"
    return "UNCLEAR"


def parse_judgment(value: object) -> dict:
    if not isinstance(value, dict):
        value = json.loads(str(value))

    verdict = clean(value.get("verdict", "UNCLEAR"), 10).upper()
    if verdict not in ("YES", "NO", "UNCLEAR"):
        verdict = "UNCLEAR"

    return {
        "verdict": verdict,
        "reasoning": clean(value.get("reasoning", "The evidence is inconclusive."), 400),
    }


class LiveClaimContract(gl.Contract):
    last_url: str
    last_claim: str
    last_verdict: u8
    last_reasoning: str
    last_requester: str
    verification_count: u256

    def __init__(self):
        self.last_url = ""
        self.last_claim = ""
        self.last_verdict = u8(UNCLEAR)
        self.last_reasoning = "No claim has been finalized yet."
        self.last_requester = ""
        self.verification_count = u256(0)

    def _verify_with_consensus(self, url: str, claim: str) -> dict:
        def fetch_page() -> str:
            response = gl.nondet.web.get(url)
            return response.body[:MAX_PAGE_BYTES].decode("utf-8")

        def judge(page: str) -> dict:
            prompt = f"""You are a GenLayer validator checking one factual claim.
Use ONLY the live web page content below. Do not use training knowledge.

CLAIM: {claim}
LIVE PAGE CONTENT:
{page}

Return ONLY JSON with this exact shape:
{{"verdict":"YES|NO|UNCLEAR","reasoning":"one short explanation, max 400 chars"}}

YES means the page clearly supports the claim.
NO means the page clearly contradicts the claim.
UNCLEAR means the page does not contain enough evidence."""
            return parse_judgment(gl.nondet.exec_prompt(prompt, response_format="json"))

        def leader_fn() -> str:
            return json.dumps(judge(fetch_page()), sort_keys=True)

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            try:
                proposed = parse_judgment(json.loads(leader_result.calldata))
                observed = judge(fetch_page())
                return proposed["verdict"] == observed["verdict"]
            except Exception:
                return False

        return parse_judgment(
            json.loads(gl.vm.run_nondet_unsafe(leader_fn, validator_fn))
        )

    @gl.public.write
    def verify_claim(self, url: str, claim: str) -> dict:
        safe_url = clean(url, 500)
        safe_claim = clean(claim, 500)

        if not (safe_url.startswith("https://") or safe_url.startswith("http://")):
            raise Exception("URL must start with http:// or https://")
        if len(safe_claim) < 5:
            raise Exception("Claim must contain at least 5 characters")

        result = self._verify_with_consensus(safe_url, safe_claim)
        verdict = result["verdict"]
        verdict_code = YES if verdict == "YES" else NO if verdict == "NO" else UNCLEAR

        self.last_url = safe_url
        self.last_claim = safe_claim
        self.last_verdict = u8(verdict_code)
        self.last_reasoning = result["reasoning"]
        self.last_requester = str(gl.message.sender_address)
        self.verification_count += u256(1)
        return self._latest()

    def _latest(self) -> dict:
        return {
            "url": self.last_url,
            "claim": self.last_claim,
            "verdict_code": self.last_verdict,
            "verdict": verdict_name(int(self.last_verdict)),
            "reasoning": self.last_reasoning,
            "requester": self.last_requester,
            "verification_count": self.verification_count,
        }

    @gl.public.view
    def get_latest_verification(self) -> dict:
        return self._latest()

    @gl.public.view
    def get_verification_count(self) -> int:
        return int(self.verification_count)
