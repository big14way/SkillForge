"""`invoke_skill` tool — preview-mode stub that real Compute will replace."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass

from .config import Config
from .indexer import IndexerClient


@dataclass
class InvocationResult:
    rental_id: str
    output: str
    mode: str  # "live" | "preview"
    chat_id: str
    notes: str


# Hand-crafted realistic samples by category — see section 4 of the Week 3 plan.
_PREVIEW_BY_CATEGORY: dict[str, str] = {
    "trading": (
        "[preview] Verdict: mildly bullish over the next 3 sessions. Spot volume "
        "up 12% week-on-week without a matching drawdown; funding neutral at "
        "0.01% 8h. Main risk: Thursday CPI — a hot print erases the setup."
    ),
    "data": (
        "[preview] Pipeline plan: schema inference → dedup by surrogate key → "
        "outlier trim at 3σ → entity resolution via public registry → emit "
        "parquet partitioned by day. Expected throughput ~45k rows/s on a "
        "single worker."
    ),
    "content": (
        "[preview] Draft: three paragraphs. P1 states the thesis. P2 gives two "
        "pieces of specific evidence with sources. P3 frames the counter-"
        "argument and concedes what's unknown. Tone: confident, not breathless."
    ),
    "research": (
        "[preview] Research brief: (1) problem framing, (2) three strongest "
        "references, (3) gap in the literature, (4) proposed experiment + "
        "success metric, (5) risks + mitigations."
    ),
    "automation": (
        "[preview] Automation plan: trigger on event X, debounce 30s, branch on "
        "payload.class, fan out to 3 workers, reconcile in the sink. Retry with "
        "exponential backoff; DLQ after 5 attempts."
    ),
}


def invoke_skill(
    rental_id: str | int,
    *,
    input: str,
    config: Config | None = None,
    client: IndexerClient | None = None,
) -> InvocationResult:
    """Week 3: returns a preview-mode sample. Week 4: routes to live TeeML.

    The function *still* fetches the rental from the indexer so callers get a
    realistic error when the rental doesn't exist (e.g. bad rentalId). That
    behaviour carries through to Week 4 unchanged.
    """
    cfg = config or Config.from_env()
    owner = client or IndexerClient(cfg)
    try:
        rental = owner.get_rental(rental_id)
    finally:
        if client is None:
            owner.close()

    # Look up the skill to pick a category-appropriate sample.
    own2 = client or IndexerClient(cfg)
    try:
        skill, _ = own2.get_skill(rental.skillTokenId)
    finally:
        if client is None:
            own2.close()

    sample = _PREVIEW_BY_CATEGORY.get(skill.category, _PREVIEW_BY_CATEGORY["content"])
    chat_id = "preview-" + hashlib.sha256(
        f"{rental.rentalId}|{input}".encode()
    ).hexdigest()[:16]

    return InvocationResult(
        rental_id=str(rental.rentalId),
        output=f"{sample}\n\nInput echoed: {input[:160]}",
        mode="preview",
        chat_id=chat_id,
        notes=(
            "Preview mode — live TeeML inference lands in Week 4 once Galileo "
            "providers come online. This output is a hand-crafted realistic "
            f"sample for category '{skill.category}', not a real inference."
        ),
    )
