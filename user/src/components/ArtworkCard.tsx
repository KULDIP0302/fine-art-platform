import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getPublicImageUrl } from "@/lib/utils";
import { Bookmark, BookmarkCheck, ShoppingCart, MessageCircle, UserPlus, UserMinus, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Artwork {
  _id: string;
  title: string;
  image: string;
  price: number;
  category: { name: string };
  artist?: { _id: string; name: string; profilePic?: string } | null;
  sellingDisabled?: boolean;
}

interface ArtworkCardProps {
  artwork: Artwork;
  index?: number;
  onOpenChat?: (artistId: string, artistName: string, artistAvatar: string) => void;
}

const ArtworkCard = ({ artwork, index = 0, onOpenChat }: ArtworkCardProps) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, saveArtwork, unsaveArtwork, followArtist, unfollowArtist } = useAuth();
  const savedIds = user?.savedArtworks ?? [];
  const followingIds = user?.following ?? [];
  const isSaved = savedIds.includes(artwork._id);
  const isFollowing = artwork.artist ? followingIds.includes(artwork.artist._id) : false;

  const handleSaveToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Please sign in to save artworks");
      return;
    }
    if (isSaved) {
      unsaveArtwork(artwork._id);
      toast.info("Artwork unsaved");
    } else {
      saveArtwork(artwork._id);
      toast.success("Artwork saved!");
    }
  };

  const handleFollowToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Please sign in to follow artists");
      return;
    }
    if (!artwork.artist) {
      toast.error("Artist information not available");
      return;
    }

    if (isFollowing) {
      unfollowArtist(artwork.artist._id);
      toast.info("Unfollowed artist");
    } else {
      followArtist(artwork.artist._id);
      toast.success("Following artist!");
    }
  };

  const handleMessage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Please sign in to message");
      return;
    }
    if (!artwork.artist) {
      toast.error("Artist information not available");
      return;
    }

    if (onOpenChat) {
      onOpenChat(artwork.artist._id, artwork.artist.name, getPublicImageUrl(artwork.artist.profilePic));
    }
  };

  const handleReport = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Please sign in to report");
      return;
    }
    // Implement report
    toast.success("Report submitted");
  };

  const handlePurchase = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Please sign in to purchase");
      return;
    }
    if (artwork.sellingDisabled) {
      toast.error("This artwork is not available for purchase");
      return;
    }
    // Navigate to detail page for purchase
    navigate(`/artwork/${artwork._id}`);
  };

  return (
    <div
      onClick={() => navigate(`/artwork/${artwork._id}`)}
      className="group block cursor-pointer overflow-hidden rounded-lg bg-card shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={artwork.image}
          alt={artwork.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {/* Save button */}
        <button
          onClick={handleSaveToggle}
          className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm shadow-sm transition-all hover:bg-card"
        >
          {isSaved ? (
            <BookmarkCheck className="h-4 w-4 text-primary" />
          ) : (
            <Bookmark className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="inline-block rounded-full bg-primary/90 px-3 py-1 text-xs font-medium text-primary-foreground">
            {artwork.category?.name ?? 'Uncategorized'}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg font-semibold text-foreground truncate">
          {artwork.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {artwork.artist ? (
            <Link to={`/artist/${artwork.artist._id}`} className="hover:text-primary">
              {artwork.artist.name}
            </Link>
          ) : (
            'Unknown Artist'
          )}
        </p>
        <p className="mt-2 font-display text-lg font-bold text-primary">
          ₹{artwork.price.toLocaleString()}
        </p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={handlePurchase} className="flex-1" disabled={artwork.sellingDisabled}>
            <ShoppingCart className="h-4 w-4 mr-1" />
            {artwork.sellingDisabled ? "Unavailable" : "Buy"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleMessage}>
            <MessageCircle className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={isFollowing ? "outline" : "default"} onClick={handleFollowToggle} className="gap-2">
            {isFollowing ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            <span className="hidden sm:inline">{isFollowing ? "Unfollow" : "Follow"}</span>
          </Button>
          <Button size="sm" variant="outline" onClick={handleReport}>
            <Flag className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ArtworkCard;
