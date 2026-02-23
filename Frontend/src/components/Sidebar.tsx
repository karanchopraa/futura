"use client";

import { Home, TrendingUp, Globe, Bitcoin, Activity, Zap, MonitorPlay } from "lucide-react";

interface SidebarProps {
    activeCategory: string;
    onSelectCategory: (category: string) => void;
}

export default function Sidebar({ activeCategory, onSelectCategory }: SidebarProps) {
    const categories = [
        { id: "all", label: "Home", icon: Home },
        { id: "politics", label: "Politics", icon: Globe },
        { id: "crypto", label: "Crypto", icon: Bitcoin },
        { id: "sports", label: "Sports", icon: Activity },
        { id: "pop", label: "Pop Culture", icon: MonitorPlay },
        { id: "tech", label: "Science & Tech", icon: Zap },
        { id: "trending", label: "Trending", icon: TrendingUp },
    ];

    return (
        <aside className="sidebar">
            <nav className="sidebar-nav">
                {categories.map((category) => {
                    const Icon = category.icon;
                    const isActive = activeCategory === category.id;
                    return (
                        <button
                            key={category.id}
                            className={`sidebar-link ${isActive ? 'active' : ''}`}
                            onClick={() => onSelectCategory(category.id)}
                        >
                            <Icon size={20} className="sidebar-icon" />
                            <span className="sidebar-label">{category.label}</span>
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}
