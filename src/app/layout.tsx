import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Importa la fuente Inter
import "./globals.css";

// Configura la fuente Inter
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter", // Puedes mantener una variable CSS si lo deseas
});

export const metadata: Metadata = {
  title: "ASeptar | Calculadora de Probabilidades y Análisis de Manos de Póker Texas Hold'em",
  description: "ASeptar es la herramienta definitiva para jugadores de Texas Hold'em. Calcula probabilidades de manos, outs, equity y pot odds al instante para tomar decisiones estratégicas y dominar la mesa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es"> 
      <body
        className={`${inter.className} antialiased`} 
      >
        {children}
      </body>
    </html>
  );
}
