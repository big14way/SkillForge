from __future__ import annotations

import pytest

from skillforge.rate import rate_skill


def test_rejects_out_of_range_score() -> None:
    with pytest.raises(ValueError, match="basis points"):
        rate_skill("1", score=20_000)
    with pytest.raises(ValueError, match="basis points"):
        rate_skill("1", score=-1)


def test_digest_is_deterministic_for_same_inputs() -> None:
    a = rate_skill("1", score=8500)
    b = rate_skill("1", score=8500)
    assert a.digest == b.digest


def test_digest_changes_when_score_changes() -> None:
    a = rate_skill("1", score=8500)
    b = rate_skill("1", score=8600)
    assert a.digest != b.digest
