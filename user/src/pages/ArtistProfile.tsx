import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ArtworkCard from "@/components/ArtworkCard";
import ChatDialog from "@/components/ChatDialog";
import { ArrowLeft, UserPlus, UserMinus, Users, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface ArtistPublic {
  _id: string;
  name: string;
  bio?: string;
  profilePic?: string;
  profilePicVersion?: number;
  followerCount: number;
  role?: string;
}

interface Artwork {
  _id: string;
  title: string;
  image: string;
  price: number;
  category: { name: string };
  artist: { _id: string; name: string; profilePic?: string };
}

const ArtistProfile = () => {
  const { id } = useParams();
  const { user, isAuthenticated, followArtist, unfollowArtist } = useAuth();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const [artist, setArtist] = useState<ArtistPublic | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchArtist();
      fetchArtistArtworks();
    }
  }, [id]);

  const fetchArtist = async () => {
    try {
      const data = await api<ArtistPublic>(`/api/user/artists/${id}/public`);
      setArtist(data);
    } catch (error) {
      toast.error("Profile could not be loaded");
      setArtist(null);
    }
  };

  const fetchArtistArtworks = async () => {
    try {
      const data = await api<{ artworks: Artwork[] }>(`/api/artworks?artist=${id}`);
      setArtworks(data.artworks);
    } catch (error) {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  if (!artist) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Artist not found.</p>
      </div>
    );
  }

  const isFollowing = (user?.following ?? []).some((fid) => String(fid) === String(artist._id));

  const handleFollow = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to follow artists");
      navigate("/auth");
      return;
    }

    if (isFollowing) {
      const success = await unfollowArtist(artist._id);
      if (success) {
        toast.info(`Unfollowed ${artist.name}`);
        setArtist((prev) =>
          prev
            ? {
                ...prev,
                followerCount: Math.max(0, (prev.followerCount ?? 0) - 1),
              }
            : prev
        );
      } else {
        toast.error('Failed to unfollow. Please try again.');
      }
    } else {
      const success = await followArtist(artist._id);
      if (success) {
        toast.success(`Following ${artist.name}`);
        setArtist((prev) =>
          prev
            ? {
                ...prev,
                followerCount: (prev.followerCount ?? 0) + 1,
              }
            : prev
        );
      } else {
        toast.error('Failed to follow. Please try again.');
      }
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

      {/* Artist Header */}
      <div className="mb-10 flex flex-col items-center gap-6 sm:flex-row sm:items-start animate-fade-up">
        <img
          src={getPublicImageUrl(artist.profilePic, artist.profilePicVersion)}
          alt={artist.name}
          className="h-24 w-24 rounded-full object-cover ring-4 ring-primary/20"
        />
        <div className="flex-1 text-center sm:text-left">
          <h1 className="font-display text-3xl font-bold text-foreground">{artist.name}</h1>
          <p className="mt-2 max-w-lg text-muted-foreground">{artist.bio || 'No bio available'}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="font-medium text-foreground">{artist.followerCount}</span> followers
            </div>
            <Button variant={isFollowing ? "outline" : "default"} size="sm" onClick={handleFollow} className="gap-2">
              {isFollowing ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {isFollowing ? "Unfollow" : "Follow"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleMessage} className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Message
            </Button>
          </div>
        </div>
      </div>

      {/* Artworks */}
      <h2 className="mb-6 font-display text-2xl font-semibold text-foreground">Artworks</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {artworks.map((a, i) => (
          <ArtworkCard key={a._id} artwork={a} index={i} />
        ))}
      </div>

      {/* Chat Dialog */}
      {chatOpen && (
        <ChatDialog
          open={chatOpen}
          onOpenChange={setChatOpen}
          artistId={artist._id}
          artistName={artist.name}
          artistAvatar={getPublicImageUrl(artist.profilePic, artist.profilePicVersion)}
        />
      )}
    </div>
  );
};

export default ArtistProfile;
