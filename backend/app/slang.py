"""Conservative argot/verlan guidance; not a ranking of current youth trends.

Definitions are established linguistic examples, not fresh web research. Public
reference pages were inaccessible (HTTP 403) on 2026-10-26; see docs/FRENCH_SLANG.md.
"""

import re

SLANG_REGISTER = (
    "established colloquial French slang (argot), including attested verlan when it "
    "fits the input, for an informal conversation among familiar peers in France. "
    "Verlan reverses/reworks syllables, not syntax and not letters; never invent a "
    "word by mechanically reversing it. Argot is not synonymous with verlan. "
    "Reference distinctions (examples, NOT a replacement checklist): "
    "ouf <- fou: figuratively crazy/amazing, often in 'un truc de ouf'; "
    "chelou <- louche: shady/suspicious or unsettling, not every kind of unusual; "
    "relou <- lourd: annoying/tiresome, not physically heavy; "
    "teuf <- fête: an informal party; "
    "kiffer: to like/enjoy, familiar slang, NOT verlan; "
    "taf: work/job, slang, NOT verlan; "
    "fringues: clothes, slang, NOT verlan. "
    "Use at most one or two appropriate slang features. Do not intensify mild "
    "feelings, change a fact into a request, or invent friendship, insults, a party, "
    "a job or a relationship absent from the source. Preserve tense and perspective. "
    "Avoid slurs, vulgarity, forced slang and caricatures. Do not claim all young "
    "French people speak alike or that an expression is currently trending. "
    "In the explanation identify the actual slang item, its standard French meaning, "
    "whether it is verlan or another argot term, and the informal peer context; "
    "mention if it can sound negative or inappropriate in formal settings. "
    "An omitted ne, tu, a short coffee order or an ordinary casual expression alone "
    "is NOT evidence of slang. If no faithful slang rewrite fits, return the original "
    "sentence (correcting only clear grammar errors) and explain that there is no "
    "suitable slang substitution here; do not fabricate slang or silently present "
    "plain familiar French as argot."
)


def mock_slang(text: str, language: str) -> dict[str, str]:
    """Explicit fixtures, not a linguistic classifier or quality evaluation."""
    if text.strip() == "J’aime cette musique." or text.strip() == "J'aime cette musique.":
        return {
            "expression": "Je kiffe cette musique.",
            "explanation": (
                "示例：kiffer 表示 aimer（喜欢），属于非正式俚语，不是 verlan。"
                "适合熟人之间；正式交流中保留 aimer。"
                if language == "zh"
                else "Demo: kiffer means aimer (to like/enjoy). It is familiar slang, not "
                "verlan. Use it among familiar peers; prefer aimer in formal settings."
            ),
        }
    return {
        "expression": re.sub(r"\bune café\b", "un café", text, flags=re.IGNORECASE),
        "explanation": (
            "模拟示例：此句未配置合适的俚语改写，不强行造词。真实模式会按原意判断；"
            "普通口语不等于俚语，不能为了加俚语改变意思。"
            if language == "zh"
            else "Mock fixture: no suitable slang rewrite is configured for this sentence. "
            "Live mode assesses the original meaning; casual wording alone is not slang."
        ),
    }
