import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="mt-auto border-t bg-card/50">
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <p className="font-display text-lg font-semibold text-foreground">FINE_ART</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Discover and collect fine art from verified artists.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Explore</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="hover:text-primary">
                Home
              </Link>
            </li>
            <li>
              <Link to="/categories" className="hover:text-primary">
                Categories
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-primary">
                Contact
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Account</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/auth" className="hover:text-primary">
                Sign in
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="hover:text-primary">
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/apply-artist" className="hover:text-primary">
                Apply as artist
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} FINE_ART. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
