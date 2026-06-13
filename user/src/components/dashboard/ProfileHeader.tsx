import { useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { getPublicImageUrl } from "@/lib/utils";

const ProfileHeader = () => {
  const { user, updateAvatar } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const success = await updateAvatar(file);
    if (success) {
      toast.success("Profile picture updated!");
    } else {
      toast.error("Failed to update profile picture");
    }
  };

  return (
    <div className="mb-8 flex items-center gap-4 animate-fade-up">
      <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
        <img
          key={`${user.profilePic}-${user.profilePicVersion ?? ""}`}
          src={getPublicImageUrl(user.profilePic, user.profilePicVersion)}
          alt={user.name}
          className="h-16 w-16 rounded-full object-cover ring-4 ring-primary/20"
        />
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="h-5 w-5 text-white" />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{user.name}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
};

export default ProfileHeader;
