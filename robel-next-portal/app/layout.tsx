import type { Metadata } from "next";
import { Inter, Tajawal } from "next/font/google"; // Optimization: Next/Font
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const tajawal = Tajawal({ weight: ['400', '500', '700'], subsets: ["arabic"], variable: '--font-tajawal' });

export const metadata: Metadata = {
    title: "Robel Real Estate Portal",
    description: "Luxury Property Listings in Egypt",
    metadataBase: new URL('https://robel-eg.com'),
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${inter.variable} ${tajawal.variable}`}>
            <body className="antialiased">{children}</body>
        </html>
    );
}
