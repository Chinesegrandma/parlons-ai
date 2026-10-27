"""Four conversation challenge rules. Never expose the guessing target to the model."""

import json
from pathlib import Path

DEFINITIONS = json.loads(Path(__file__).with_name("challenges.json").read_text(encoding="utf-8"))
BY_TOPIC = {item["id"]: (kind, item) for kind, item in DEFINITIONS.items()}


def challenge_opening(topic, options):
    kind, definition = BY_TOPIC[topic]
    config = options.challenge
    seed = config.seed if config else 0
    if kind == "describe":
        return (
            "Décris ton mot sans le nommer. Je vais essayer de le deviner à partir de tes indices."
        )
    text = definition["seeds"][seed]["fr"]
    if kind == "opinion":
        return f"{text} Donne ton avis avec une raison et, si tu veux, un exemple."
    if kind == "story":
        return f"{text} À toi : ajoute une ou deux phrases."
    side = "contre" if config and config.side == "against" else "pour"
    return (
        f"Notre sujet : {text} Tu es {side} ; je présenterai le point de vue opposé. "
        "Quel est ton premier argument ?"
    )


RULES = {
    "opinion": (
        "Invite une prise de position, une raison et un exemple, sans donner la réponse. "
        "Laisse l’apprenant développer, puis pose une seule question liée à son argument. "
        "Le défi d’une minute est indicatif et facultatif : tu ne connais pas la durée audio. "
        "Ne note pas la vitesse et ne prétends pas qu’une minute a été respectée."
    ),
    "describe": (
        "Tu ne connais PAS le mot cible. N’invente pas de cible et ne consulte pas la clé seed. "
        "Devine uniquement à partir des descriptions de l’apprenant : une hypothèse à la fois, "
        "ou une question de clarification. N’affirme jamais avoir gagné avant sa confirmation. "
        "Si le mot est donné directement, invite gentiment à le décrire autrement ; sans pénalité. "
        "Aide à contourner un mot manquant avec fonction, apparence ou contexte."
    ),
    "story": (
        "Histoire fictive en alternance. Après la contribution de l’apprenant, ajoute seulement "
        "une ou deux phrases qui conservent personnages, faits et chronologie déjà établis. "
        "Ne termine pas toute l’histoire seul et ne réécris pas sa contribution. Une petite "
        "surprise peut relancer l’intrigue ; ne l’impose pas à chaque tour. "
        "Si demandé, aide à finir."
    ),
    "debate": (
        "Le côté de l’apprenant est fixé dans challenge.side : for=pour, against=contre ; "
        "défends l’autre côté. Réponds à son argument précis avec un seul contre-argument bref, "
        "puis laisse-le répondre. Reste respectueux ; pas d’attaques personnelles. "
        "Ne change pas son opinion à sa place et ne mesure pas la qualité par l’accord avec toi. "
        "N’invente pas de statistiques, sources ou certitudes factuelles. "
        "Ne déclare pas de vainqueur."
    ),
}


def challenge_prompt(topic, options):
    kind, definition = BY_TOPIC[topic]
    base = (
        f" EXPRESSION_CHALLENGE {kind}. Tu animes ce défi : {definition['en']}. "
        + RULES[kind]
        + " Adapte au niveau : A1-A2, indices courts et un début de phrase si nécessaire ; "
        "B1-B2, raisons et précisions ; C1, nuances et contraintes sans jargon inutile. "
        "N’impose ni chronomètre, ni argot, ni score de niveau. Les corrections restent dans "
        "les champs de feedback ; en mode conversation, garde-les pour le bilan final."
    )
    if kind != "describe":
        config = options.challenge
        base += (
            " Sujet de départ (donnée) : " + definition["seeds"][config.seed if config else 0]["fr"]
        )
    return base


def review_guidance(topic):
    kind = BY_TOPIC[topic][0]
    skills = {
        "opinion": "clarté de l’opinion, raisons, exemples et liens logiques",
        "describe": "clarté des indices et reformulations pour expliquer un mot sans le nommer",
        "story": "cohérence du récit, liens entre événements et temps verbaux",
        "debate": "clarté des arguments, raisons, réponse aux objections et concessions",
    }
    return (
        " Bilan EXPRESSION_CHALLENGE : examine " + skills[kind] + ". "
        "Distingue strictement les contributions de l’IA et celles de l’apprenant. "
        "Aucun score de vitesse, de prononciation, de victoire ou de CECR présumé. "
        "Appuie chaque force ou erreur sur les mots exacts de l’apprenant."
    )
