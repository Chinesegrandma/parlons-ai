export const dynamic = "force-dynamic";

export const metadata = {
  title: "Privacy | Parlons AI Beta",
  description: "How Parlons AI handles beta users' data.",
};

export default function PrivacyPage() {
  const contact = process.env.SUPPORT_EMAIL || "(contact not yet configured)";
  return (
    <main
      style={{
        maxWidth: 760,
        margin: "42px auto",
        padding: "0 22px 60px",
        fontFamily: "Arial, sans-serif",
        color: "#282828",
        lineHeight: 1.8,
      }}
    >
      <a href="/" style={{ color: "#123bea" }}>← Parlons AI</a>
      <h1>Parlons AI Beta · 隐私说明 / Privacy notice</h1>
      <p>更新于 2026-11-09。本页面是 Beta 隐私信息说明，正式推广前需要进行适用法律审查。</p>
      <h2>1. 我们处理什么 / What we process</h2>
      <p>
        注册邮箱和身份标识由 Supabase Auth 处理。法语练习时，服务端保存会话文本、
        原始语音转写、用户编辑过的转写以及 AI 纠错。应用不会有意长期保存上传的原始录音文件。
        学习笔记和复习偏好保存在当前浏览器本地。
      </p>
      <h2>2. 为什么 / Why</h2>
      <p>
        用于提供练习、恢复聊天历史、纠错和管理账号；为了防止滥用，服务还记录有限的调用计数。
        测试期间请不要输入护照、健康记录、银行卡等敏感信息。
      </p>
      <h2>3. 服务提供商 / Processors</h2>
      <p>
        Supabase 提供账户认证；Render 承载应用和会话数据；OpenAI 处理文本生成及反馈；
        ElevenLabs 处理录音转写和语音合成。语音和对话内容会按请求发送到对应服务。
        各服务自己的数据保存期限和地区可能不同，需在正式推广前核实其最新数据处理条款。
      </p>
      <h2>4. 保存与删除 / Retention & deletion</h2>
      <p>
        测试会话保存至用户主动删除账号或管理员按请求删除。
        登录后可以在「我的账号」中选择「删除账号及数据」；此操作删除应用存储的对话、
        转写和对应的 Supabase 身份。浏览器上的本地学习资料同时清除。
        请注意，第三方服务已处理的数据仍受到其各自保存政策约束。
      </p>
      <h2>5. 联系与权利 / Contact & rights</h2>
      <p>
        如需查询、导出、更正或删除数据，或对数据处理提出疑问，请联系：
        <strong> {contact}</strong>。
        正式上线前应补齐数据控制者的法定身份信息、数据保留期限、
        法律依据与跨境传输披露。
      </p>
      <p>
        <small>
          This is a beta disclosure draft, not a substitute for a completed GDPR compliance review.
        </small>
      </p>
    </main>
  );
}
