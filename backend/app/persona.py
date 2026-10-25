"""The assistant identity is part of the persisted opening, not a second chat turn."""

import re

NAME = "Camille"
INTRO = "Bonjour, moi c’est Camille, ton assistante de français. "


def introduce(text: str) -> str:
    content = re.sub(r"^(?:Bonjour|Bonsoir|Salut)[ !,.]*", "", text).strip()
    return INTRO + content[:1].upper() + content[1:]
