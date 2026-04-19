"""`rate_skill` tool — builds the attestation payload, caller submits on-chain.

Mirrors the Solidity `AttestationVerifier.Attestation` struct bit-for-bit so
the encoded bytes can be pasted into a `cast send skillEscrow verifyWork`
call. Python doesn't sign the attestation — that would require a dev scorer
key in this package. Instead we emit the digest + fields; the host signs
with its own wallet (and is expected to be on the scorer whitelist).
"""

from __future__ import annotations

from dataclasses import dataclass


def _keccak256(data: bytes) -> bytes:
    """Ethereum-flavoured keccak256 via the `eth_hash` package (shipped as a
    dep of `eth_utils`). `auto` picks pycryptodome or pysha3 depending on
    what's installed — both have pre-built wheels so install is fast.
    """
    from eth_hash.auto import keccak  # type: ignore[import-not-found]

    return bytes(keccak(data))


def _decode_hex(s: str) -> bytes:
    if s.startswith("0x") or s.startswith("0X"):
        s = s[2:]
    return bytes.fromhex(s)


def _packed_digest(
    request_hash: str, response_hash: str, provider: str, quality_score: int
) -> str:
    """keccak256(abi.encodePacked(bytes32, bytes32, address, uint256))."""
    data = b"".join(
        [
            _decode_hex(request_hash),
            _decode_hex(response_hash),
            _decode_hex(provider),
            quality_score.to_bytes(32, "big"),
        ]
    )
    return "0x" + _keccak256(data).hex()


@dataclass
class RatingIntent:
    rental_id: str
    quality_score: int
    digest: str
    note: str


def rate_skill(
    rental_id: str | int,
    *,
    score: int,
    reasoning: str = "",
    request_hash: str = "0x" + "00" * 32,
    response_hash: str = "0x" + "00" * 32,
    provider: str = "0x00000000000000000000000000000000defea700",
) -> RatingIntent:
    """Build the attestation digest the host will sign and submit.

    Guards:
      - score must be 0..10000 basis points
      - fields are passed as hex strings so the caller can paste directly
        into a `cast` invocation
    """
    if not 0 <= score <= 10_000:
        raise ValueError("score must be 0..10000 basis points")

    digest = _packed_digest(request_hash, response_hash, provider, score)
    return RatingIntent(
        rental_id=str(rental_id),
        quality_score=score,
        digest=digest,
        note=(
            "Host signs `digest` with a whitelisted scorer key, then submits "
            "SkillEscrow.verifyWork(rentalId, score, encodedAttestation). "
            + (f"Reasoning: {reasoning}" if reasoning else "")
        ),
    )
