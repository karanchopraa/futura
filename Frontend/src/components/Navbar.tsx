"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import LoginButton from "./LoginButton";
import { useState, useRef, useEffect, useCallback } from "react";
import { searchMarkets, type Market, formatVolume } from "@/lib/api";

interface NavbarProps {
    onDepositClick?: () => void;
}

export default function Navbar({ onDepositClick }: NavbarProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [searchResults, setSearchResults] = useState<Market[]>([]);
    const [searching, setSearching] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            <div className="navbar-logo">
                <Link href="/">
                    <span className="logo-text">Futura</span>
                </Link>
            </div>

            <div className="navbar-categories">
                <Link href="/" className="nav-link active">Elections</Link>
                <Link href="/" className="nav-link">Crypto</Link>
                <Link href="/" className="nav-link">Sports</Link>
                <Link href="/" className="nav-link">Pop Culture</Link>
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
                        borderRadius: '12px', padding: '0.5rem', zIndex: 1000, boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                    }}>
                        {searching ? (
                            <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                Searching...
                            </div>
                        ) : searchResults.length > 0 ? (
                            searchResults.map((res) => (
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
                            ))
                        ) : (
                            <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>No markets found</div>
                        )}
                    </div>
                )}
            </div>

            <div className="navbar-actions">
                <Link href="/portfolio" className="button-secondary" style={{ textDecoration: 'none' }}>Portfolio</Link>
                {onDepositClick && (
                    <button className="button-secondary" onClick={onDepositClick}>Deposit</button>
                )}
                <LoginButton />
            </div>
        </nav>
    );
}
