import re
from dataclasses import dataclass, field
from pathlib import Path

import yaml

_FRONT_MATTER = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
_SECTION = re.compile(r"^## +(.+)$", re.MULTILINE)
_NON_WORD = re.compile(r"\W+")
# Rough token estimate (~4 characters per token) — avoids a tokenizer dependency.
_CHARS_PER_TOKEN = 4


@dataclass(frozen=True)
class Chunk:
    chunk_id: str
    source: str
    breadcrumb: str
    text: str
    metadata: dict[str, object] = field(default_factory=dict, compare=False)

    @property
    def embed_text(self) -> str:
        return f"{self.breadcrumb}\n{self.text}"


def _split_front_matter(raw: str) -> tuple[dict[str, object], str]:
    match = _FRONT_MATTER.match(raw)
    if not match:
        return {}, raw
    meta = yaml.safe_load(match.group(1)) or {}
    return meta, raw[match.end() :]


def _slug(heading: str) -> str:
    return _NON_WORD.sub("-", heading.lower()).strip("-")


def _sections(body: str) -> list[tuple[str, str]]:
    headings = list(_SECTION.finditer(body))
    return [
        (
            m.group(1).strip(),
            body[m.end() : headings[i + 1].start() if i + 1 < len(headings) else None],
        )
        for i, m in enumerate(headings)
    ]


def _split_long(text: str, max_tokens: int) -> list[str]:
    max_chars = max_tokens * _CHARS_PER_TOKEN
    parts: list[str] = []
    current = ""
    for paragraph in (p.strip() for p in text.split("\n\n") if p.strip()):
        if current and len(current) + len(paragraph) > max_chars:
            parts.append(current)
            current = paragraph
        else:
            current = f"{current}\n\n{paragraph}" if current else paragraph
    if current:
        parts.append(current)
    return parts


def _chunks_for_file(path: Path, root: Path, max_tokens: int) -> list[Chunk]:
    meta, body = _split_front_matter(path.read_text(encoding="utf-8"))
    if meta.get("visibility") != "public":
        return []
    source = path.relative_to(root).as_posix()
    title = str(meta.get("title", path.stem))
    chunks: list[Chunk] = []
    seen: set[str] = set()
    for heading, text in _sections(body):
        parts = _split_long(text.strip(), max_tokens)
        base = _slug(heading)
        while base in seen:
            base = f"{base}-2"
        seen.add(base)
        for i, part in enumerate(parts):
            suffix = f"-{i + 1}" if len(parts) > 1 else ""
            chunks.append(
                Chunk(
                    chunk_id=f"{source}#{base}{suffix}",
                    source=source,
                    breadcrumb=f"{title} › {heading}",
                    text=part,
                    metadata=meta,
                )
            )
    return chunks


def load_corpus(root: Path, max_tokens: int = 400) -> list[Chunk]:
    return [
        chunk
        for path in sorted(root.rglob("*.md"))
        for chunk in _chunks_for_file(path, root, max_tokens)
    ]
