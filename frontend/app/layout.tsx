import "./globals.css";
import "./studio.css";
export const viewport = {
  themeColor: "#faf9f6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export const metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Parlons", statusBarStyle: "default" },
  icons: { apple: "/icons/icon-180.png" },
  title: "Parlons AI | French Speaking Coach",
  description: "Practice French with an adaptive AI tutor",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
