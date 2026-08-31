import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
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
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-ink focus:text-cream focus:px-4 focus:py-2 focus:rounded-md"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
