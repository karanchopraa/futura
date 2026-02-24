"use client";

import Link from "next/link";
import { Search, Sun, Moon } from "lucide-react";
import LoginButton from "./LoginButton";
import { useState, useRef, useEffect, useCallback } from "react";
import { searchMarkets, type Market, formatVolume } from "@/lib/api";

interface NavbarProps {
    onDepositClick?: () => void;
}

export default function Navbar({ onDepositClick }: NavbarProps) {
    const [theme, setTheme] = useState<"dark" | "light">("dark");
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [searchResults, setSearchResults] = useState<Market[]>([]);
    const [searching, setSearching] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Initialize theme from localStorage if available
    useEffect(() => {
        const storedTheme = localStorage.getItem("futura-theme") as "light" | "dark";
        if (storedTheme) {
            setTheme(storedTheme);
            document.documentElement.setAttribute("data-theme", storedTheme);
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        localStorage.setItem("futura-theme", newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchFocused(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounced search
    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const results = await searchMarkets(query);
                setSearchResults(results);
            } catch (error) {
                console.error("Search failed:", error);
            } finally {
                setSearching(false);
            }
        }, 300);
    }, []);

    return (
        <nav className="navbar">
            <div className="navbar-logo" style={{ paddingLeft: '1rem' }}>
                <Link href="/">
                    <span className="logo-text">Futura</span>
                </Link>
            </div>

            <div className="navbar-categories">
                <Link href="/?category=politics" className="nav-link">Politics</Link>
                <Link href="/?category=crypto" className="nav-link">Crypto</Link>
                <Link href="/?category=sports" className="nav-link">Sports</Link>
                <Link href="/?category=pop" className="nav-link">Pop Culture</Link>
            </div>

            <div className="navbar-search-container" ref={searchRef} style={{ position: 'relative' }}>
                <div className="navbar-search">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search markets..."
                        className="search-input"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                    />
                </div>

                {isSearchFocused && searchQuery.length > 0 && (
                    <div className="search-dropdown" style={{
                        position: 'absolute', top: '120%', left: 0, right: 0,
                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                        borderRadius: '12px', padding: '0.5rem', zIndex: 1000, boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                        maxHeight: '400px', overflowY: 'auto'
                    }}>
                        {searching ? (
                            <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                Searching...
                            </div>
                        ) : searchResults.length > 0 ? (
                            Object.entries(
                                searchResults.reduce((acc, res) => {
                                    const cat = res.category || 'Other';
                                    if (!acc[cat]) acc[cat] = [];
                                    acc[cat].push(res);
                                    return acc;
                                }, {} as Record<string, Market[]>)
                            ).map(([category, items]) => (
                                <div key={category} style={{ marginBottom: '0.5rem' }}>
                                    <div style={{ padding: '0.25rem 0.75rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', marginBottom: '0.25rem' }}>
                                        {category}
                                    </div>
                                    {items.map((res) => (
                                        <Link key={res.id} href={`/market/${res.id}`} onClick={() => setIsSearchFocused(false)} style={{ textDecoration: 'none' }}>
                                            <div className="search-result-item" style={{
                                                padding: '0.75rem', borderBottom: '1px solid var(--border)',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderRadius: '8px'
                                            }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <div style={{ fontSize: '0.85rem', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '1rem', color: 'var(--text-primary)' }}>
                                                    {res.question}
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', alignItems: 'center' }}>
                                                    <span style={{ color: 'var(--text-secondary)' }}>${formatVolume(res.volume)}</span>
                                                    <span style={{ color: 'var(--accent-yes)', background: 'var(--accent-yes-bg)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                        {Math.round(res.yesPrice)}¢
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>No markets found</div>
                        )}
                    </div>
                )}
            </div>

            <div className="navbar-actions">
                <button
                    onClick={toggleTheme}
                    className="button-secondary"
                    style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
                    aria-label="Toggle Theme"
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <Link href="/portfolio" className="button-secondary" style={{ textDecoration: 'none' }}>Portfolio</Link>
                {onDepositClick && (
                    <button className="button-secondary" onClick={onDepositClick}>Deposit</button>
                )}
                <LoginButton />
            </div>
        </nav>
    );
}
