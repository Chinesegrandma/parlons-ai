"""Natural openings for role-play; identity is displayed by the interface."""

NAME = "Camille"


def introduce(text: str, partner: str = "camille") -> str:
    opening = text.strip()
    if partner == "noe":
        return opening.replace("Je m’appelle Camille.", "Je m’appelle Noé.")
    return opening
