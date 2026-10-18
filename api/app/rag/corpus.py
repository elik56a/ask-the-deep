import re
from dataclasses import dataclass
from pathlib import Path

import yaml

_FRONT_MATTER = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
_SECTION = re.compile(r"^## +(.+)$", re.MULTILINE)


@dataclass(frozen=True)
class Chunk:
    chunk_id: str
    source: str
    breadcrumb: str
    text: str


def _split_front_matter(raw: str) -> tuple[dict[str, object], str]:
    match = _FRONT_MATTER.match(raw)
    if not match:
        return {}, raw
    meta = yaml.safe_load(match.group(1)) or {}
    return meta, raw[match.end() :]


def _chunks_for_file(path: Path, root: Path) -> list[Chunk]:
    meta, body = _split_front_matter(path.read_text(encoding="utf-8"))
    if meta.get("visibility") != "public":
        return []
    source = path.relative_to(root).as_posix()
    title = str(meta.get("title", path.stem))
    headings = list(_SECTION.finditer(body))
    sections = [
        (
            m.group(1).strip(),
            body[m.end() : headings[i + 1].start() if i + 1 < len(headings) else None],
        )
        for i, m in enumerate(headings)
    ]
    return [
        Chunk(
            chunk_id=f"{source}#{i}",
            source=source,
            breadcrumb=f"{title} › {heading}",
            text=text.strip(),
        )
        for i, (heading, text) in enumerate(sections)
        if text.strip()
    ]


def load_corpus(root: Path) -> list[Chunk]:
    return [
        chunk
        for path in sorted(root.rglob("*.md"))
        for chunk in _chunks_for_file(path, root)
    ]
