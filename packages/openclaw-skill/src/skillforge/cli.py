"""Click-based CLI entry point.

Every command is a thin wrapper around the library tools so the same code
paths run from `python -m skillforge ...` and from an OpenClaw agent host's
direct function call.
"""

from __future__ import annotations

import json
from dataclasses import asdict
from typing import Any

import click
from rich.console import Console
from rich.table import Table

from .config import Config
from .discover import discover_skills
from .invoke import invoke_skill
from .memory import show_memory
from .rate import rate_skill
from .rent import rent_skill

console = Console()


@click.group()
@click.version_option(package_name="skillforge-claw")
def main() -> None:
    """SkillForge — agent skill marketplace on 0G."""


@main.command("discover")
@click.option("--category", default=None, help="Filter by category")
@click.option("--min-quality", type=int, default=0, help="Minimum quality score (bps)")
@click.option("--limit", type=int, default=10)
@click.option("--json", "as_json", is_flag=True, help="Emit JSON instead of a table")
def cmd_discover(category: str | None, min_quality: int, limit: int, as_json: bool) -> None:
    skills = discover_skills(category=category, min_quality=min_quality, limit=limit)
    if as_json:
        click.echo(json.dumps([s.model_dump() for s in skills], indent=2))
        return
    if not skills:
        console.print("[dim]No skills match those filters.[/dim]")
        return
    table = Table(title="SkillForge", show_lines=False)
    for col in ("id", "name", "category", "quality", "rentals", "price(wei)"):
        table.add_column(col)
    for s in skills:
        table.add_row(
            s.tokenId,
            s.name[:32],
            s.category,
            str(s.qualityScore),
            str(s.totalRentals),
            s.pricePerUse,
        )
    console.print(table)


@main.command("rent")
@click.argument("token_id")
@click.option("--max-price", type=int, default=None, help="Reject if price exceeds this (wei)")
def cmd_rent(token_id: str, max_price: int | None) -> None:
    try:
        intent = rent_skill(token_id, max_price_wei=max_price)
    except ValueError as err:
        raise click.ClickException(str(err))
    click.echo(json.dumps(asdict(intent), indent=2))


@main.command("invoke")
@click.argument("rental_id")
@click.option("--input", "input_text", required=True, help="Input text to feed the skill")
def cmd_invoke(rental_id: str, input_text: str) -> None:
    result = invoke_skill(rental_id, input=input_text)
    click.echo(json.dumps(asdict(result), indent=2))


@main.command("rate")
@click.argument("rental_id")
@click.option("--score", type=int, required=True, help="Quality score in bps (0-10000)")
@click.option("--reasoning", default="")
def cmd_rate(rental_id: str, score: int, reasoning: str) -> None:
    try:
        intent = rate_skill(rental_id, score=score, reasoning=reasoning)
    except ValueError as err:
        raise click.ClickException(str(err))
    click.echo(json.dumps(asdict(intent), indent=2))


@main.group("memory")
def cmd_memory() -> None:
    """Agent memory (read-only until Week 4)."""


@cmd_memory.command("show")
@click.argument("address")
def cmd_memory_show(address: str) -> None:
    view = show_memory(address)
    payload: dict[str, Any] = {
        "agent": view.agent,
        "recent_as_creator": [r.model_dump() for r in view.recent_as_creator],
        "recent_as_renter": [r.model_dump() for r in view.recent_as_renter],
        "mode": view.mode,
        "note": view.note,
    }
    click.echo(json.dumps(payload, indent=2))


@main.command("config")
def cmd_config() -> None:
    """Print the resolved runtime config."""
    cfg = Config.from_env()
    click.echo(json.dumps(asdict(cfg), indent=2))


if __name__ == "__main__":
    main()
