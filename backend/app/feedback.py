"""Ground per-turn corrections in the current utterance, never an earlier turn."""

import re
from difflib import SequenceMatcher

from .providers import TutorReply

FEEDBACK_CONTRACT = (
    " FEEDBACK_CURRENT_TURN: corrige UNIQUEMENT le tout dernier message utilisateur, "
    "jamais un message précédent ni une réplique de l’IA. corrected_text doit être la "
    "version corrigée de TOUT ce message, en conservant les phrases déjà correctes. "
    "Explique CHAQUE erreur que tu modifies, pas seulement la première. Retourne "
    "correction_details:[{original,suggestion,explanation}], une entrée par erreur ; "
    "original cite exactement le fragment du dernier message, suggestion figure exactement "
    "dans corrected_text ; explanation est dans la langue d’interface. N’invente pas "
    "d’erreur ni de correction stylistique nécessaire. correction_source recopie exactement "
    "le dernier message s’il y a une correction, sinon chaîne vide. correction reste "
    "un résumé compatible ; sans erreur, correction_details=[], correction_source='', "
    "correction='', corrected_text='', review_prompt=''. Réponse JSON uniquement."
)


def words(text):
    return re.findall(r"[\w’'-]+", text.casefold())


def validate_feedback(reply: TutorReply, current: str, previous: list[dict]):
    has_feedback = bool(reply.correction or reply.corrected_text or reply.correction_details)
    if not has_feedback:
        return
    if reply.correction_source and reply.correction_source != current:
        raise ValueError("Correction source is not the current utterance")
    # Legacy provider responses did not include source/details. Catch the screenshot regression
    # even for those, without migrating or trusting previously saved feedback.
    for index, item in enumerate(previous):
        if (
            not reply.correction_source
            and item.get("corrected_text") == reply.corrected_text
            and reply.corrected_text
        ):
            source = previous[index - 1] if index else {}
            if source.get("role") == "user" and source.get("content") != current:
                if words(current) != words(reply.corrected_text):
                    raise ValueError("Correction was copied from an earlier turn")
    if reply.correction_details and reply.correction_source != current:
        raise ValueError("Correction details require the exact current source")
    if (
        reply.correction_source != current
        or not reply.correction_details
        or not reply.corrected_text
    ):
        raise ValueError(
            "Every correction requires current source, corrected text and error details"
        )
    for detail in reply.correction_details:
        if detail.original not in current or detail.suggestion not in reply.corrected_text:
            raise ValueError("Correction detail is not grounded in this utterance")
        if not detail.explanation.strip() or detail.original == detail.suggestion:
            raise ValueError("Empty or unchanged correction detail")
    if reply.correction_details:
        a, b = words(current), words(reply.corrected_text)
        covered = set()
        suggestions = set()
        for detail in reply.correction_details:
            covered.update(words(detail.original))
            suggestions.update(words(detail.suggestion))
        for tag, start, end, b_start, b_end in SequenceMatcher(
            None, a, b, autojunk=False
        ).get_opcodes():
            if tag != "equal" and any(word not in covered for word in a[start:end]):
                raise ValueError("A changed fragment has no error explanation")
            if tag != "equal" and any(word not in suggestions for word in b[b_start:b_end]):
                raise ValueError("An inserted fragment has no error explanation")


def numbered_feedback(reply: TutorReply) -> str:
    return (
        "\n".join(
            f"{index}. {item.original} → {item.suggestion} : {item.explanation}"
            for index, item in enumerate(reply.correction_details, 1)
        )
        or reply.correction
    )
