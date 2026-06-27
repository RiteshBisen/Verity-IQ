import type { Metadata } from "next";
import { Outfit, DM_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Verity IQ",
  description:
    "Upload any PDF, TXT, or DOCX document and get AI-generated multiple choice questions instantly, powered by Google Gemini.",
  keywords: ["quiz", "MCQ", "AI", "Gemini", "study", "education", "flashcards"],
  openGraph: {
    title: "Verity IQ",
    description: "Turn any document into an instant quiz with Google Gemini.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('theme');
                if (saved === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${outfit.variable} ${dmMono.variable} font-sans antialiased bg-background text-foreground transition-colors duration-200`}
      >
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            classNames: {
              toast:
                "!bg-card !border-[3px] !border-border !text-foreground !font-sans !rounded-none !shadow-[5px_5px_0px_0px_var(--shadow-color)]",
              title: "!font-bold !font-display !text-sm !uppercase",
              description: "!text-foreground/80 !text-xs",
              error: "!border-neo-red !bg-neo-red/10",
            },
          }}
        />
      </body>
    </html>
  );
}
