import Link from "next/link";
import { Twitter, DiscIcon as Discord, Github } from "lucide-react";

export default function Footer() {
    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-brand">
                    <Link href="/">
                        <span className="logo-text">Futura</span>
                    </Link>
                    <p className="footer-tagline">
                        The world's premier information market. Trade on the future of politics, crypto, sports, and pop culture.
                    </p>
                    <div className="footer-socials">
                        <a href="#" className="social-link"><Twitter size={20} /></a>
                        <a href="#" className="social-link"><Discord size={20} /></a>
                        <a href="#" className="social-link"><Github size={20} /></a>
                    </div>
                </div>

                <div className="footer-links-grid">
                    <div className="footer-column">
                        <h3>Markets</h3>
                        <Link href="/?category=politics">Politics</Link>
                        <Link href="/?category=crypto">Crypto</Link>
                        <Link href="/?category=sports">Sports</Link>
                        <Link href="/?category=pop">Pop Culture</Link>
                        <Link href="/?category=tech">Science & Tech</Link>
                    </div>
                    <div className="footer-column">
                        <h3>Resources</h3>
                        <Link href="#">How to Trade</Link>
                        <Link href="#">Help Center</Link>
                        <Link href="#">Bug Bounty</Link>
                        <Link href="#">Developers</Link>
                    </div>
                    <div className="footer-column">
                        <h3>Company</h3>
                        <Link href="#">About</Link>
                        <Link href="#">Careers</Link>
                        <Link href="#">Terms of Service</Link>
                        <Link href="#">Privacy Policy</Link>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p className="disclaimer">
                    Trading on Futura involves significant risk. Information and prediction markets may not be suitable for all investors. Ensure you fully understand the risks involved before trading.
                </p>
                <div className="copyright">
                    © {new Date().getFullYear()} Futura Markets Inc. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
