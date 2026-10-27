import type { Language } from "../lib/types";

const examples = [
  {
    term: "ouf",
    standard: "fou",
    verlan: true,
    zh: "疯狂、惊人；有时加强语气，不能随意夸大原意。",
    en: "Crazy/amazing; can intensify meaning, so do not exaggerate the original.",
  },
  {
    term: "chelou",
    standard: "louche",
    verlan: true,
    zh: "可疑、古怪，可能带负面评价。",
    en: "Shady or unsettling; can sound judgmental.",
  },
  {
    term: "relou",
    standard: "lourd",
    verlan: true,
    zh: "烦人的、难相处的，不用于描述物理重量。",
    en: "Annoying or tiresome, not physically heavy.",
  },
  {
    term: "teuf",
    standard: "fête",
    verlan: true,
    zh: "派对、非正式聚会。",
    en: "An informal party.",
  },
  {
    term: "kiffer",
    standard: "aimer / apprécier",
    verlan: false,
    zh: "喜欢、享受，不是 verlan。",
    en: "To like or enjoy; not verlan.",
  },
  {
    term: "taf",
    standard: "travail",
    verlan: false,
    zh: "工作，不是 verlan。",
    en: "Work/job; not verlan.",
  },
  {
    term: "fringues",
    standard: "vêtements",
    verlan: false,
    zh: "衣服，不是 verlan。",
    en: "Clothes; not verlan.",
  },
];

export function SlangGuide({ language }: { language: Language }) {
  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  return (
    <details className="slang-guide">
      <summary>{t("俚语小词典", "Slang mini guide")}</summary>
      <p>
        {t(
          "已有的常见用法示例，不代表所有年轻人的用语。verlan 是音节逆序并变音，不是句法倒装。",
          "Established examples, not a claim about all young speakers. Verlan reworks reversed syllables, not sentence order.",
        )}
      </p>
      <dl>
        {examples.map((item) => (
          <div key={item.term}>
            <dt>
              <span lang="fr">{item.term}</span> ·{" "}
              {item.verlan ? "verlan" : t("其他俚语", "other slang")}
            </dt>
            <dd>
              <span lang="fr">{item.standard}</span> —{" "}
              {language === "en" ? item.en : item.zh}
            </dd>
          </div>
        ))}
      </dl>
      <p>
        {t(
          "默认用于熟人之间；与老师、医生、客服等交流时，请按场合选择更得体的说法。",
          "Use among familiar peers by default. Choose an appropriate register with teachers, doctors or customer service.",
        )}
      </p>
    </details>
  );
}
