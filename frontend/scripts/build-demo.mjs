import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = await build({
  entryPoints: [path.join(root, "demo/entry.tsx")],
  bundle: true,
  write: false,
  minify: true,
  jsx: "automatic",
  platform: "browser",
  target: "es2020",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_API_URL": '""',
  },
});
const css = (
  await Promise.all(
    ["globals.css", "studio.css"].map((file) =>
      readFile(path.join(root, "app", file), "utf8"),
    ),
  )
).join("\n");
const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
await mkdir(path.join(root, "public"), { recursive: true });
await writeFile(
  path.join(root, "public/parlons-demo.html"),
  `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Parlons AI 离线交互演示，不调用 API"><title>Parlons · 法语练习工作台</title><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`,
);
console.log("Offline interactive demo built: public/parlons-demo.html");
