import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Menu, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPublicImageUrl } from "@/lib/utils";
import { useEffect, useState, type FormEvent } from "react";

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (location.pathname === "/search") {
      const params = new URLSearchParams(location.search);
      setSearchText(params.get("q") || "");
    }
  }, [location.pathname, location.search]);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = searchText.trim();
    if (!q) {
      navigate("/");
      setMobileOpen(false);
      return;
    }
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setMobileOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="font-display text-2xl font-bold tracking-tight text-foreground">
          FINE_ART
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          <Link to="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Feed
          </Link>
          <Link to="/categories" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Categories
          </Link>
          <Link to="/contact" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Contact
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Dashboard
              </Link>
              <div className="flex items-center gap-3">
                <Link to="/dashboard" className="flex items-center gap-2">
                  <img
                    key={user?.profilePic}
                    src={getPublicImageUrl(user?.profilePic, user?.profilePicVersion)}
                    alt={user?.name}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/20"
                  />
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { logout(); navigate("/"); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="default" size="sm">
                Sign In
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Search bar — below header row */}
      <div className="border-t border-border/60 bg-muted/30">
        <form onSubmit={submitSearch} className="mx-auto flex max-w-6xl gap-2 px-4 py-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search artworks by title or description…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="h-10 w-full pl-9"
              aria-label="Search artworks"
            />
          </div>
          <Button type="submit" size="default" className="shrink-0">
            Search
          </Button>
        </form>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t bg-card px-4 py-4 md:hidden animate-fade-in">
          <div className="flex flex-col gap-3">
            <Link to="/" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-medium text-foreground">
              Feed
            </Link>
            <Link to="/categories" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-medium text-foreground">
              Categories
            </Link>
            <Link to="/contact" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-medium text-foreground">
              Contact
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-medium text-foreground">
                  Dashboard
                </Link>
                <button
                  onClick={() => { logout(); navigate("/"); setMobileOpen(false); }}
                  className="py-2 text-left text-sm font-medium text-destructive"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setMobileOpen(false)}>
                <Button variant="default" size="sm" className="w-full">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
