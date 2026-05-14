# =============================================================================
# btc_market_contract.py
# =============================================================================
# GenLayer Intelligent Contract: BTC Market Sentiment Checker
#
# DEPLOYED CONTRACT:
#   Address : 0x650BCb1A0fa0cb57122338BAa07eac0F98EEf460
#   Network : GenLayer Studio (studionet)
#   RPC     : https://studio.genlayer.com/api
#
# This file is the reference source for the contract deployed at the above
# address. The web app calls get_last_result() on this contract via the
# GenLayer JS SDK (genlayer-js) to get a live consensus result.
#
# PURPOSE:
#   This contract demonstrates how GenLayer Intelligent Contracts work.
#   It fetches live BTC price data from the web, asks multiple AI
#   validators to analyze the market sentiment, and uses GenLayer's
#   consensus mechanism to reach a final Bullish / Bearish / Neutral verdict.
#
# KEY GenLayer CONCEPTS SHOWN HERE:
#   1. get_webpage()    — fetch live data from the internet (non-deterministic)
#   2. exec_prompt()    — call an LLM for AI reasoning (non-deterministic)
#   3. @gl.public       — public contract method callable from outside
#   4. Consensus        — GenLayer automatically re-runs non-deterministic
#                         calls across multiple validators and resolves
#                         disagreements before committing state on-chain
#
# HOW TO USE IN GENLAYER STUDIO:
#   1. Open GenLayer Studio (studio.genlayer.com)
#   2. Create a new contract and paste this file
#   3. Deploy the contract to the simulator
#   4. Call analyze_market() from the "Run" panel
#   5. Watch the validators reach consensus in the activity log
#
# NOTE: This is a learning demo. In production, you would add error handling,
#       rate limiting, and more sophisticated AI prompts.
# =============================================================================

# GenLayer's standard library — available automatically in the Studio
import gl

# Python standard library — safe to use in GenLayer contracts
import json


class BtcMarketContract:
    """
    A GenLayer Intelligent Contract that analyzes Bitcoin market sentiment.

    State variables (stored on-chain between calls):
      - last_price:     The most recently fetched BTC price in USD
      - last_sentiment: The most recent consensus sentiment result
      - analysis_count: How many times analyze_market() has been called
    """

    def __init__(self):
        # -----------------------------------------------------------------------
        # Contract state — these values persist on the blockchain between calls.
        # Think of them like database columns for this contract.
        # -----------------------------------------------------------------------
        self.last_price: float = 0.0
        self.last_sentiment: str = "Unknown"
        self.analysis_count: int = 0

    # ---------------------------------------------------------------------------
    # PRIVATE HELPER: Fetch BTC Price from the Internet
    # ---------------------------------------------------------------------------
    # get_webpage() is a GenLayer primitive that fetches a URL.
    # Because it's non-deterministic (the price changes every second),
    # GenLayer asks MULTIPLE validators to run this and then compares results.
    # If results differ by more than an acceptable threshold, consensus fails
    # and the transaction is retried. This ensures fair, tamper-resistant data.
    # ---------------------------------------------------------------------------
    def _fetch_btc_price(self) -> dict:
        """
        Fetches the current BTC price and 24h change from CoinGecko's public API.

        Returns a dict with:
            price     (float): Current price in USD
            change_24h (float): 24-hour percentage change
        """
        # Fetch price data from CoinGecko's free API (no API key needed)
        raw_response = gl.get_webpage(
            "https://api.coingecko.com/api/v3/simple/price"
            "?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
            mode="text",  # Return raw text instead of parsed HTML
        )

        # Parse the JSON response from CoinGecko
        data = json.loads(raw_response)

        price = float(data["bitcoin"]["usd"])
        change_24h = float(data["bitcoin"]["usd_24h_change"])

        return {"price": price, "change_24h": change_24h}

    # ---------------------------------------------------------------------------
    # PRIVATE HELPER: Ask an AI Validator for Market Sentiment
    # ---------------------------------------------------------------------------
    # exec_prompt() sends a message to an LLM (like GPT-4 or Claude) and returns
    # the text response. This is also non-deterministic — different validators
    # may get slightly different LLM responses. GenLayer handles the disagreement
    # by running a second round of consensus just on the LLM outputs.
    # ---------------------------------------------------------------------------
    def _ask_validator(self, price: float, change_24h: float) -> str:
        """
        Asks an AI validator to analyze BTC market sentiment.

        Each GenLayer validator independently calls this with the same inputs.
        The LLM might give slightly different reasoning, but should converge
        on the same Bullish / Bearish / Neutral conclusion.

        Returns: "Bullish", "Bearish", or "Neutral"
        """
        # Build a clear, structured prompt for the LLM.
        # Good prompts are key to reliable GenLayer AI contracts!
        prompt = f"""
You are a cryptocurrency market analyst AI validator in a GenLayer consensus network.

Your job is to analyze Bitcoin market data and return a single-word sentiment verdict.

Current BTC Market Data:
- Price: ${price:,.2f} USD
- 24-hour price change: {change_24h:+.2f}%

Analysis Rules:
- If the 24h change is greater than +2%: market is "Bullish"
- If the 24h change is less than -2%: market is "Bearish"
- If the 24h change is between -2% and +2%: market is "Neutral"

IMPORTANT: You MUST respond with EXACTLY one word — either "Bullish", "Bearish", or "Neutral".
Do not add any explanation or punctuation. Just the single word.

Your verdict:"""

        # Call the LLM via GenLayer's exec_prompt()
        # GenLayer handles routing this to an AI model automatically
        response = gl.exec_prompt(prompt)

        # Clean and validate the response
        verdict = response.strip().capitalize()

        # Safety check — if the LLM returns something unexpected, default to Neutral
        if verdict not in ("Bullish", "Bearish", "Neutral"):
            verdict = "Neutral"

        return verdict

    # ---------------------------------------------------------------------------
    # PUBLIC CONTRACT METHOD: Analyze BTC Market
    # ---------------------------------------------------------------------------
    # The @gl.public decorator makes this method callable from outside the contract
    # (from other contracts, the GenLayer Studio, or client applications).
    #
    # @gl.non_deterministic tells GenLayer that this method fetches external data
    # and calls AI — so it needs to be run by multiple validators and reach
    # consensus before the result is accepted on-chain.
    # ---------------------------------------------------------------------------
    @gl.public
    @gl.non_deterministic
    def analyze_market(self) -> dict:
        """
        Main entry point: Fetch BTC price, run AI analysis, reach consensus.

        This method is called by users / dApps. GenLayer will:
          1. Run this on ALL active validator nodes simultaneously
          2. Each validator fetches price data and asks its LLM
          3. Compare all validator results
          4. If majority agrees → commit the result to chain
          5. If validators disagree too much → retry with more validators

        Returns a dict with the full analysis result.
        """

        # -------------------------------------------------
        # STEP 1: Fetch live BTC price from the web
        # (Non-deterministic: price changes constantly)
        # -------------------------------------------------
        price_data = self._fetch_btc_price()
        price = price_data["price"]
        change_24h = price_data["change_24h"]

        # -------------------------------------------------
        # STEP 2: Run 3 independent AI validator analyses
        # (Non-deterministic: LLM responses may vary slightly)
        #
        # In production GenLayer, the network itself handles running
        # multiple validators. Here we simulate it explicitly to make
        # the learning example clear.
        # -------------------------------------------------
        validator_opinions = []

        for i in range(3):
            # Each call simulates one validator's AI analysis
            sentiment = self._ask_validator(price, change_24h)
            validator_opinions.append({
                "validator_id": f"validator-node-{i + 1:02d}",
                "sentiment": sentiment,
            })

        # -------------------------------------------------
        # STEP 3: Tally votes and pick the majority verdict
        # (Deterministic: simple counting — all validators agree on this step)
        # -------------------------------------------------
        vote_counts = {"Bullish": 0, "Bearish": 0, "Neutral": 0}

        for opinion in validator_opinions:
            vote_counts[opinion["sentiment"]] += 1

        # The consensus result is whichever sentiment got the most votes
        consensus_result = max(vote_counts, key=vote_counts.get)

        # Build a human-readable summary of the voting process
        total_validators = len(validator_opinions)
        consensus_summary = (
            f"GenLayer consensus reached after {total_validators} validator rounds. "
            f"Votes — Bullish: {vote_counts['Bullish']}, "
            f"Bearish: {vote_counts['Bearish']}, "
            f"Neutral: {vote_counts['Neutral']}. "
            f"Final verdict: {consensus_result} "
            f"({vote_counts[consensus_result]}/{total_validators} validators agreed)."
        )

        # -------------------------------------------------
        # STEP 4: Update on-chain state
        # (Only happens AFTER consensus is reached)
        # -------------------------------------------------
        self.last_price = price
        self.last_sentiment = consensus_result
        self.analysis_count += 1

        # -------------------------------------------------
        # STEP 5: Return the full result
        # (This is stored in the transaction receipt on-chain)
        # -------------------------------------------------
        return {
            "btc_price": price,
            "price_change_24h": change_24h,
            "validators": validator_opinions,
            "consensus_result": consensus_result,
            "consensus_summary": consensus_summary,
            "analysis_count": self.analysis_count,
        }

    # ---------------------------------------------------------------------------
    # PUBLIC CONTRACT METHOD: Read Last Result (no AI, no external calls)
    # ---------------------------------------------------------------------------
    # @gl.view marks this as a read-only method — it reads state but doesn't
    # fetch external data or call AI. No consensus needed, instant response.
    # ---------------------------------------------------------------------------
    @gl.public
    @gl.view
    def get_last_result(self) -> dict:
        """
        Returns the most recently stored analysis result from on-chain state.
        This is a FREE read — no gas cost, no consensus round needed.
        """
        return {
            "last_price": self.last_price,
            "last_sentiment": self.last_sentiment,
            "analysis_count": self.analysis_count,
        }


# =============================================================================
# How GenLayer Consensus Works (Summary for Learners)
# =============================================================================
#
#  User calls analyze_market()
#          │
#          ▼
#  GenLayer network selects N validator nodes
#          │
#          ├──► Validator 1 runs analyze_market() → "Bullish"
#          ├──► Validator 2 runs analyze_market() → "Bullish"
#          └──► Validator 3 runs analyze_market() → "Neutral"
#                    │
#                    ▼
#          Majority vote: 2 Bullish vs 1 Neutral
#                    │
#                    ▼
#          Consensus: "Bullish" ✓ — result committed to blockchain
#
# If validators disagree too much (e.g. 1-1-1 split), GenLayer adds more
# validators until a clear majority emerges. This is called "equivalence
# principle" — the protocol guarantees eventual consistency even with
# non-deterministic AI calls.
#
# =============================================================================
