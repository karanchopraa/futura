"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export default function Providers({ children }: { children: React.ReactNode }) {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";
    const isValidAppId = appId && appId !== "cm1234567890123456789012" && !appId.includes("insert");

    if (!isValidAppId) {
        return <>{children}</>;
    }

    return (
        <PrivyProvider
            appId={appId}
            config={{
                loginMethods: ["email", "google", "wallet", "apple", "discord"],
                appearance: {
                    theme: "dark",
                    accentColor: "#3b82f6",
                    logo: "https://cryptologos.cc/logos/polymarket-poly-logo.png", // Optional placeholder
                },
                embeddedWallets: {
                    ethereum: {
                        createOnLogin: "all-users",
                    },
                },
            }}
        >
            {children}
        </PrivyProvider>
    );
}
