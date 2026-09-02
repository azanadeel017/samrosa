import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Samrosa — Food rescue for Middlesex County",
  description:
    "Samrosa connects restaurants with surplus food to shelters and soup kitchens, coordinated by volunteer drivers. No money changes hands. Just meals moving where they're needed.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fraunces.variable} suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://api.fontshare.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
        />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
                if (reduced) return;
                requestAnimationFrame(function(){
                  requestAnimationFrame(function(){
                    if (document.timeline && document.timeline.currentTime > 0) {
                      document.documentElement.classList.add('js-motion');
                    }
                  });
                });
              })();
            `,
          }}
        />
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#FFF8EA",
              color: "#3A2417",
              border: "1px solid rgba(58,36,23,0.1)",
              fontFamily: "'General Sans', system-ui, sans-serif",
            },
          }}
        />
      </body>
    </html>
  );
}
