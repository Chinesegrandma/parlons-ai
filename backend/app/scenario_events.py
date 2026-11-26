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


EXTRA_EVENTS = {
    "bank_card": [
        "Le rendez-vous est écourté.",
        "Le justificatif de domicile est au nom d'un tiers.",
        "Le dépôt initial dépasse le budget prévu.",
        "Un type de compte ne permet pas l'option souhaitée.",
        "La carte ne peut être livrée à l'adresse actuelle.",
        "Le conseiller demande de comparer deux offres."
    ],
    "bank_transfer": [
        "Le montant saisi est incorrect.",
        "La devise souhaitée n'est pas disponible.",
        "Des frais imprévus sont annoncés.",
        "Le plafond fictif est dépassé.",
        "Le virement doit être confirmé par un autre moyen.",
        "Le destinataire signale un montant différent."
    ],
    "doctor": [
        "Le secrétariat propose un autre praticien.",
        "Le rendez-vous est avancé.",
        "Le cabinet change d'adresse.",
        "Le secrétariat demande le motif de la visite.",
        "Le créneau proposé est incompatible avec le travail.",
        "Il faut choisir entre deux horaires."
    ],
    "symptoms": [
        "Le personnage demande où se situe la douleur.",
        "Le personnage demande si le symptôme est intermittent.",
        "Il faut préciser un facteur déclencheur.",
        "Le personnage reformule un détail de travers.",
        "Il demande de décrire l'intensité avec des mots simples.",
        "Il demande une distinction entre deux symptômes."
    ],
    "renting": [
        "Le loyer annoncé exclut les charges.",
        "La visite doit être déplacée.",
        "La date d'entrée proposée ne convient pas.",
        "Le propriétaire demande une garantie supplémentaire fictive.",
        "Une pièce est plus petite que prévu.",
        "Le bail proposé a une durée différente."
    ],
    "post": [
        "Le carton est trop grand.",
        "L'adresse est incomplète.",
        "Le délai annoncé ne convient pas.",
        "Le colis est trop lourd pour le tarif prévu.",
        "Le suivi n'est pas inclus.",
        "Le destinataire est absent à la livraison."
    ],
    "customer_service": [
        "Le conseiller demande de reformuler la demande.",
        "Le produit de remplacement est indisponible.",
        "La livraison fictive est repoussée.",
        "Le numéro de dossier ne correspond pas.",
        "Le conseiller propose un avoir plutôt qu'un remboursement.",
        "Il faut choisir entre deux solutions."
    ],
    "restaurant": [
        "Le restaurant n'a plus de table à l'intérieur.",
        "Un ingrédient ne convient pas au client.",
        "Le plat arrive froid.",
        "L'accompagnement proposé est différent.",
        "Le serveur confond deux commandes.",
        "Le paiement séparé demande une précision."
    ],
    "cafe": [
        "La terrasse est complète.",
        "La machine à carte est en panne.",
        "Le lait souhaité est épuisé.",
        "Une commande à emporter est servie sur place.",
        "Le serveur propose une autre taille.",
        "Le prix de la formule ne correspond pas à l'affichage."
    ],
    "shopping": [
        "Le vêtement présente un défaut.",
        "La réduction ne s'applique pas au produit choisi.",
        "Le ticket fictif manque.",
        "La couleur demandée n'est plus disponible.",
        "Le magasin propose un avoir pour un échange.",
        "La livraison est plus tardive que prévu."
    ],
    "transport": [
        "Le billet proposé est pour un autre jour.",
        "La correspondance est trop courte.",
        "Le tarif réduit ne s'applique pas.",
        "Le train est complet.",
        "Le départ est déplacé dans une autre gare.",
        "Le trajet nécessite un changement supplémentaire."
    ],
    "travel": [
        "Le métro est fermé.",
        "Le chemin proposé est trop long à pied.",
        "Le passant a mal compris la destination.",
        "Un bus est dévié.",
        "Il faut choisir entre deux itinéraires.",
        "L'adresse est ambiguë."
    ],
    "self_intro": [
        "Le personnage confond le métier de l'apprenant.",
        "Il demande de préciser un centre d'intérêt.",
        "Il ne connaît pas la ville mentionnée.",
        "Il demande pourquoi l'apprenant a choisi un domaine.",
        "Il pose une question sur un projet futur.",
        "Il invite l'apprenant à comparer deux expériences."
    ],
    "friends": [
        "Le lieu de rencontre ferme plus tôt.",
        "Un ami a oublié le rendez-vous.",
        "Une autre personne rejoint le groupe.",
        "Le budget prévu ne convient pas à tout le monde.",
        "Un ami comprend mal une plaisanterie.",
        "Un ami demande un conseil sur un choix."
    ],
    "invite": [
        "Le budget de la sortie est trop élevé.",
        "La météo rend le plan impossible.",
        "Une autre personne veut venir.",
        "Le transport retour pose problème.",
        "La réservation est complète.",
        "L'ami propose une activité différente."
    ],
    "decline": [
        "L'ami propose un compromis.",
        "L'ami a déjà réservé une place.",
        "L'ami demande si une autre activité conviendrait.",
        "L'ami comprend mal la raison du refus.",
        "L'ami propose une visite plus courte.",
        "L'ami souhaite reprogrammer un autre jour."
    ],
    "course": [
        "Un prérequis manque.",
        "Le cours a changé de salle.",
        "Le nombre de crédits ne suffit pas.",
        "Le cours choisi est en ligne.",
        "Une place se libère dans un autre groupe.",
        "La date limite d'inscription est proche."
    ],
    "teacher": [
        "Un exemple demandé n'est pas disponible.",
        "Le professeur demande de préciser la difficulté.",
        "Le travail doit être rendu dans un autre format.",
        "Le professeur propose un délai différent.",
        "Le sujet du devoir a été mal compris.",
        "Il faut expliquer une absence."
    ],
    "report": [
        "Une estimation change.",
        "Le responsable demande de distinguer risque et problème.",
        "Un membre de l'équipe est absent.",
        "Une priorité concurrente apparaît.",
        "Le budget fictif est réduit.",
        "Le responsable demande une alternative plus rapide."
    ],
    "interview": [
        "Le recruteur demande un résultat mesurable.",
        "Il demande de justifier un changement de domaine.",
        "Il présente un désaccord professionnel fictif.",
        "Il demande de raconter une difficulté d'équipe.",
        "Il demande une explication pour un terme technique.",
        "Il demande de préciser les attentes du poste."
    ]
}
EVENTS = {topic: events + tuple(EXTRA_EVENTS[topic]) for topic, events in EVENTS.items()}

def scenario_event_prompt(
    topic: str, session_id: str, previous_turns: int, level: str = "B1-B2",
    state: str | None = None,
) -> str:
    events = EVENTS.get(topic)
    if not events:
        return ""
    digest = hashlib.sha256(session_id.encode()).digest()
    trigger = 1 + digest[0] % 5
    event = events[digest[1] % len(events)]
    if previous_turns < trigger or state == "resolved":
        return ""
    difficulty = {
        "A1-A2": "une difficulté simple avec vocabulaire accessible",
        "C1": "une contrainte à négocier avec nuances",
    }.get(level, "une difficulté concrète à résoudre")
    if previous_turns == trigger or state == "pending":
        return (
            " ÉVÉNEMENT FICTIF: introduis clairement maintenant, sans donner la solution : "
            + event + " Adapte la formulation : " + difficulty
            + ". Si déjà introduit dans le contexte, ne le répète pas. "
            "Donne une occasion de clarifier, négocier ou proposer une solution. "
            "Si réellement introduit, ajoute event_state=introduced et event_evidence="
            "une citation exacte de la réplique assistant qui introduit cet événement."
        )
    return (
        " Événement prévu précédemment : " + event
        + " Ne le réintroduis pas s’il a déjà été abordé. Vérifie le contexte : "
        "s’il reste à résoudre, réponds à la tentative réelle de l’apprenant. "
        "Si l’apprenant a réellement résolu le problème, poursuis naturellement et ajoute "
        "event_state=resolved et event_evidence=une citation exacte du dernier message user "
        "qui montre la résolution. Sinon, laisse ces champs vides."
    )
