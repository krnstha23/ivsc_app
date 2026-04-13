i
const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

const playfair = Playfair_Display({
    variable: "--font-playfair",
    subsets: ["latin"],
    style: ["normal", "italic"],
});

export const metadata: Metadata = {
    metadataBase: new URL("https://scoremirror.com.np"),
    title: {
        default: "ScoreMirror – Computer-Based IELTS Mock Tests",
        template: "ScoreMirror",
    },
    description:
        "Full computer-based IELTS mock tests with human review and performance reports.",
    openGraph: {
        type: "website",
        siteName: "ScoreMirror",
        locale: "en_US",
    },
    twitter: {
        card: "summary_large_image",
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await auth();

    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased`}
            >
                <Providers session={session}>
                    {children}
                    <Toaster richColors position="top-center" />
                </Providers>
            </body>
        </html>
    );
}
