import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Palette } from "lucide-react";

const ArtistApplicationTab = () => {
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    refreshUser();
    const interval = setInterval(refreshUser, 15000);
    return () => clearInterval(interval);
  }, [refreshUser]);

  if (!user) return null;

  const status = user.artistApplication?.status || "none";

  if (status === "none") {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <Palette className="mx-auto h-12 w-12 text-primary/60" />
        <h3 className="mt-4 font-display text-xl font-semibold text-foreground">Become an Artist</h3>
        <p className="mt-2 text-sm text-muted-foreground">Apply to sell your artworks on Galerie</p>
        <Link to="/apply-artist">
          <Button className="mt-6">Start Application</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-8 text-center">
      <h3 className="font-display text-xl font-semibold text-foreground">Application Status</h3>
      <Badge
        className="mt-4"
        variant={
          status === "approved"
            ? "default"
            : status === "rejected"
            ? "destructive"
            : "secondary"
        }
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>

      <div className="mt-4 text-left text-sm">
        <p>
          <span className="font-semibold">Bio:</span> {user.artistApplication?.bio || 'Not provided'}
        </p>
        <p>
          <span className="font-semibold">Style:</span> {user.artistApplication?.artStyle || 'Not provided'}
        </p>
        <p>
          <span className="font-semibold">Portfolio:</span> {user.artistApplication?.portfolioUrls?.join(', ') || 'Not provided'}
        </p>
      </div>

      {status === "rejected" && (
        <div className="mt-6">
          <p className="mb-4 text-sm text-muted-foreground">
            Your application was rejected. You can apply again with updated information.
          </p>
          <Link to="/apply-artist">
            <Button className="w-full">Reapply</Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default ArtistApplicationTab;
