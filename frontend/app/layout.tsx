import "./globals.css";
export const metadata = {
  title: "Parlons AI | French Speaking Coach",
  description: "Practice French with an adaptive AI tutor",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
