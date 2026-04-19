from __future__ import annotations

from pytest_httpx import HTTPXMock

from skillforge.config import Config
from skillforge.discover import discover_skills
from skillforge.indexer import IndexerClient

SAMPLE = {
    "items": [
        {
            "tokenId": "1",
            "creator": "0xaaa",
            "name": "alpha-hunter",
            "description": "",
            "category": "trading",
            "pricePerUse": "1000",
            "qualityScore": 9000,
            "totalRentals": 3,
            "storageURI": "0g://x",
            "dataHash": "0x00",
            "isActive": True,
            "createdAt": 0,
            "updatedAt": 0,
        },
        {
            "tokenId": "2",
            "creator": "0xbbb",
            "name": "low-q",
            "description": "",
            "category": "trading",
            "pricePerUse": "1000",
            "qualityScore": 5000,
            "totalRentals": 1,
            "storageURI": "",
            "dataHash": "0x00",
            "isActive": True,
            "createdAt": 0,
            "updatedAt": 0,
        },
    ],
    "page": {"limit": 20, "offset": 0, "count": 2},
}


def test_discover_returns_all_skills_by_default(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="http://localhost:4000/api/skills?sort=quality&limit=10&offset=0",
        json=SAMPLE,
    )
    cfg = Config.from_env()
    with IndexerClient(cfg) as client:
        skills = discover_skills(client=client)
    assert len(skills) == 2
    assert skills[0].name == "alpha-hunter"


def test_discover_filters_by_min_quality(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url="http://localhost:4000/api/skills?sort=quality&limit=10&offset=0",
        json=SAMPLE,
    )
    cfg = Config.from_env()
    with IndexerClient(cfg) as client:
        skills = discover_skills(min_quality=8000, client=client)
    assert len(skills) == 1
    assert skills[0].qualityScore == 9000
