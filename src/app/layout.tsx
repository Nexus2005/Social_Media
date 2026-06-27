import { Toaster } from "@/components/ui/toaster";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ThemeProvider } from "next-themes";
import localFont from "next/font/local";
import "./globals.css";
import ReactQueryProvider from "./ReactQueryProvider";
import IntroProvider from "@/components/IntroProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

export const metadata: Metadata = {
  title: {
    template: "%s | Cartly",
    default: "Cartly",
  },
  description: "Fusing the best of social discovery and connection",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  other: {
    "impact-site-verification": "065bee49-82d2-48ec-975f-501f037968d7",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-instagram-lightBg dark:bg-instagram-darkBg" suppressHydrationWarning>
      <head>
        {/* @ts-ignore */}
        <meta name="impact-site-verification" value="065bee49-82d2-48ec-975f-501f037968d7" />
        <meta name="impact-site-verification" content="065bee49-82d2-48ec-975f-501f037968d7" />
        {/* @ts-ignore */}
        <meta name="impact-site-verification" value="295a53f1-da3e-45bb-94ee-bfd7cb7f70ea" />
        <meta name="impact-site-verification" content="295a53f1-da3e-45bb-94ee-bfd7cb7f70ea" />
        <Script
          id="impact-tracking"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(i,m,p,a,c,t){c.ire_o=p;c[p]=c[p]||function(){(c[p].a=c[p].a||[]).push(arguments)};t=a.createElement(m);var z=a.getElementsByTagName(m)[0];t.async=1;t.src=i;z.parentNode.insertBefore(t,z)})('https://utt.impactcdn.com/P-A7440804-9415-4ac8-a5ee-7ddfc9d9452a1.js','script','impactStat',document,window);impactStat('transformLinks');impactStat('trackImpression');`,
          }}
        />
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `(function(i,m,p,a,c,t){c.ire_o=p;c[p]=c[p]||function(){(c[p].a=c[p].a||[]).push(arguments)};t=a.createElement(m);var z=a.getElementsByTagName(m)[0];t.async=1;t.src=i;z.parentNode.insertBefore(t,z)})('https://utt.impactcdn.com/P-A7440804-9415-4ac8-a5ee-7ddfc9d9452a1.js','script','impactStat',document,window);impactStat('transformLinks');impactStat('trackImpression');`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-instagram-lightBg text-instagram-lightText dark:bg-instagram-darkBg dark:text-instagram-darkText transition-colors duration-200`}>
        <ReactQueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <IntroProvider>
              {children}
            </IntroProvider>
          </ThemeProvider>
        </ReactQueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
