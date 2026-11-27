export function assistantOpening(text: string, partner: "camille" | "noe" = "camille") {
  const opening = text.trim();
  return partner === "noe" ? opening.replace("Je m’appelle Camille.", "Je m’appelle Noé.") : opening;
}
