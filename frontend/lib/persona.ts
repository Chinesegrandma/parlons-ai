export function assistantOpening(text: string) {
  const content = text.replace(/^(Bonjour|Bonsoir|Salut)[ !,.]*/, "").trim();
  return (
    "Bonjour, moi c’est Camille, ton assistante de français. " +
    content.slice(0, 1).toUpperCase() +
    content.slice(1)
  );
}
