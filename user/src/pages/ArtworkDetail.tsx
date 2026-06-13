import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ReportDialog from "@/components/ReportDialog";
import ChatDialog from "@/components/ChatDialog";
import PaymentCheckout from "@/components/PaymentCheckout";
import { ArrowLeft, ShoppingBag, UserPlus, UserMinus, MessageCircle, Bookmark, BookmarkCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Artwork {
  _id: string;
  title: string;
  image: string;
  price: number;
  description?: string;
  category?: { name: string };
  artist?: { _id: string; name: string; profilePic?: string; updatedAt?: string };
  sellingDisabled?: boolean;
}

const ArtworkDetail = () => {
  const { id } = useParams();
  const { user, isAuthenticated, followArtist, unfollowArtist, saveArtwork, unsaveArtwork } = useAuth();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtwork = async () => {
      if (!id) return;
      try {
        const data = await api<Artwork>(`/api/artworks/${id}`);
        setArtwork(data);
      } catch (error) {
        toast.error("Artwork could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    fetchArtwork();
  }, [id]);

  if (loading) {
    return <div className="py-8 text-center">Loading artwork details...</div>;
  }

  if (!artwork) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Artwork not found.</p>
      </div>
    );
  }

  const artistIdStr = artwork.artist ? String(artwork.artist._id) : "";
  const isFollowing = artwork.artist
    ? (user?.following ?? []).some((id) => String(id) === artistIdStr)
    : false;
  const isSaved = (user?.savedArtworks ?? []).includes(artwork._id);

  const handleSave = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to save artworks");
      navigate("/auth");
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

  const handleBuy = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to purchase");
      navigate("/auth");
      return;
    }
    if (artwork.sellingDisabled) {
      toast.error("This artwork is not available for purchase");
      return;
    }
    setPaymentOpen(true);
  };

  const handleFollow = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to follow artists");
      navigate("/auth");
      return;
    }
    if (!artwork.artist) return;

    if (isFollowing) {
      unfollowArtist(artwork.artist._id);
      toast.info(`Unfollowed ${artwork.artist.name}`);
    } else {
      followArtist(artwork.artist._id);
      toast.success(`Following ${artwork.artist.name}`);
    }
  };

  const handleMessage = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to message artists");
      navigate("/auth");
      return;
    }
    setChatOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl animate-fade-in">
          <img
            src={artwork.image}
            alt={artwork.title}
            className="w-full rounded-xl object-cover shadow-lg"
          />
        </div>

        <div className="flex flex-col justify-center animate-fade-up">
          <span className="inline-block w-fit rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {artwork.category?.name ?? 'Uncategorized'}
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold text-foreground sm:text-4xl">
            {artwork.title}
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {artwork.artist && (
              <Link
                to={`/artist/${artistIdStr}`}
                className="flex min-w-0 items-center gap-3 rounded-lg outline-none ring-offset-background transition-colors hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring -m-1 p-1"
                aria-label={`View ${artwork.artist.name}'s profile`}
              >
                <img
                  src={getPublicImageUrl(
                    artwork.artist.profilePic,
                    artwork.artist.updatedAt
                      ? new Date(artwork.artist.updatedAt).getTime()
                      : undefined,
                  )}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-primary/20"
                />
                <span className="truncate font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline">
                  {artwork.artist.name}
                </span>
              </Link>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={handleMessage} className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Message
              </Button>
              <Button variant="outline" size="sm" onClick={handleFollow} className="gap-2">
                {isFollowing ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {isFollowing ? "Unfollow" : "Follow"}
              </Button>
            </div>
          </div>

          <p className="mt-6 text-muted-foreground leading-relaxed">
            {artwork.description || "No description available."}
          </p>

          <div className="mt-6 rounded-lg border bg-secondary/30 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Artwork Price</span>
              <span className="text-foreground">₹{artwork.price.toLocaleString()}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Platform Fee (10%)</span>
              <span className="text-foreground">₹{Math.round(artwork.price * 0.1).toLocaleString()}</span>
            </div>
            <div className="mt-2 border-t pt-2 flex items-center justify-between font-medium">
              <span className="text-foreground">Total</span>
              <span className="font-display text-xl font-bold text-primary">₹{Math.round(artwork.price * 1.1).toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={handleBuy} size="lg" className="flex-1 gap-2" disabled={artwork.sellingDisabled}>
              <ShoppingBag className="h-4 w-4" />
              {artwork.sellingDisabled ? "Not Available" : "Buy Artwork"}
            </Button>
            <Button onClick={handleSave} variant="outline" size="lg" className="gap-2">
              {isSaved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
              {isSaved ? "Saved" : "Save"}
            </Button>
          </div>

          <div className="mt-4">
<ReportDialog artworkId={artwork._id} artworkTitle={artwork.title} />
          </div>
        </div>
      </div>

      {artwork.artist && (
        <ChatDialog
          open={chatOpen}
          onOpenChange={setChatOpen}
          artistId={artwork.artist._id}
          artistName={artwork.artist.name}
          artistAvatar={artwork.artist.profilePic || ''}
        />
      )}

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Artwork</DialogTitle>
          </DialogHeader>
          <PaymentCheckout
            artworkId={artwork._id}
            onSuccess={() => {
              setPaymentOpen(false);
              toast.success("Purchase completed successfully!");
              // Optionally navigate to orders page or refresh
            }}
            onClose={() => setPaymentOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArtworkDetail;
