"""Bounded fictional complications for repeatable role-play sessions."""

import hashlib

EVENTS = {
    "bank_card": ("Un justificatif manque.", "La formule demandée n'est pas disponible."),
    "bank_transfer": ("Le bénéficiaire fictif est introuvable.", "Un délai imprévu est annoncé."),
    "doctor": ("Le créneau demandé est indisponible.", "Le rendez-vous fictif doit être déplacé."),
    "symptoms": ("Le personnage ne comprend pas un mot.", "Il demande de préciser la chronologie."),
    "renting": ("Le logement est déjà réservé.", "Une pièce manque dans le dossier fictif."),
    "post": ("Le colis n'a pas d'étiquette.", "Le tarif annoncé est différent du tarif attendu."),
    "customer_service": (
        "La référence fictive est introuvable.",
        "Le remboursement prend du retard.",
    ),
    "restaurant": ("Le plat choisi est épuisé.", "Une erreur apparaît sur l'addition."),
    "cafe": ("La boisson demandée est indisponible.", "La commande a été mal comprise."),
    "shopping": ("La taille demandée est épuisée.", "Le prix affiché diffère du prix en caisse."),
    "transport": ("Le train est annulé.", "Le quai change au dernier moment."),
    "travel": ("La rue est fermée.", "Le passant ne connaît qu'un itinéraire alternatif."),
    "self_intro": (
        "Il y a un malentendu sur un détail.",
        "Une question inattendue sur un loisir arrive.",
    ),
    "friends": ("Un ami doit changer ses plans.", "Un ami a un avis différent."),
    "invite": ("La personne n'est pas disponible à l'heure proposée.", "Le lieu est fermé."),
    "decline": ("L'ami propose une autre date.", "L'ami demande poliment une explication."),
    "course": ("Le cours est complet.", "Deux cours ont le même horaire."),
    "teacher": ("La consigne a été mal comprise.", "La date limite fictive a changé."),
    "report": ("Un délai est menacé.", "Une dépendance du projet est bloquée."),
    "interview": (
        "Le recruteur demande un exemple d'échec.",
        "Il demande de clarifier un résultat.",
    ),
}


def scenario_event_prompt(topic: str, session_id: str, previous_turns: int) -> str:
    events = EVENTS.get(topic)
    if not events or previous_turns < 2:
        return ""
    index = int(hashlib.sha256(session_id.encode()).hexdigest(), 16) % len(events)
    event = events[index]
    if previous_turns == 2:
        return (
            " Événement fictif à introduire maintenant, une seule fois, naturellement "
            "et sans donner la solution : " + event
        )
    return (
        " L'événement fictif prévu au troisième tour était : " + event
        + " Ne le réintroduis pas ; poursuis la conversation selon les réponses réelles."
    )
