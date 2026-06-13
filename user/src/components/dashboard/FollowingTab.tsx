import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users } from "lucide-react";

interface Artist {
  _id: string;
  name: string;
  profilePic?: string;
  profilePicVersion?: number;
  bio?: string;
  followerCount: number;
  role?: string;
}

interface FollowingTabProps {
  onOpenChat: (artistId: string, artistName: string, artistAvatar: string) => void;
}

const FollowingTab = ({ onOpenChat }: FollowingTabProps) => {
  const { user } = useAuth();
  const [followedArtists, setFollowedArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  const followingKey =
    user?.following?.map((id) => (typeof id === "object" && id && "_id" in id ? String((id as { _id: string })._id) : String(id))).join(",") ?? "";

  useEffect(() => {
    let cancelled = false;

    const normalizeId = (id: string | { _id?: string }) =>
      typeof id === "object" && id != null && "_id" in id && id._id != null
        ? String(id._id)
        : String(id);

    const ids = user?.following?.map(normalizeId).filter(Boolean) ?? [];

    if (!ids.length) {
      setFollowedArtists([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      try {
        const followed = await Promise.all(
          ids.map(async (artistId) => {
            try {
              return await api<Artist>(`/api/user/artists/${artistId}/public`);
            } catch {
              return null;
            }
          })
        );
        if (!cancelled) {
          setFollowedArtists(followed.filter(Boolean) as Artist[]);
        }
      } catch (error) {
        console.error("Failed to load followed artists", error);
        if (!cancelled) setFollowedArtists([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [followingKey]);

  if (loading) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>Following <span className="font-semibold text-foreground">{followedArtists.length}</span> artists</span>
      </div>

      {followedArtists.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">You're not following any artists yet.</p>
      ) : (
        <div className="space-y-4">
          {followedArtists.map((artist) => (
            <div key={artist._id} className="flex items-center gap-4 rounded-lg border bg-card p-4">
              <Link to={`/artist/${artist._id}`} className="flex items-center gap-4 flex-1">
                <img src={getPublicImageUrl(artist.profilePic, artist.profilePicVersion)} alt={artist.name} className="h-12 w-12 rounded-full object-cover" />
                <div>
                  <h3 className="font-medium text-foreground">{artist.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {artist.followerCount} followers
                    {artist.role && artist.role !== "artist" && artist.role !== "admin" && (
                      <span className="ml-2 text-xs">· Member</span>
                    )}
                  </p>
                </div>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChat(artist._id, artist.name, getPublicImageUrl(artist.profilePic, artist.profilePicVersion))}
                className="gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Message
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FollowingTab;
