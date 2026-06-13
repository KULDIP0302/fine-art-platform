import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPublicImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface ApiMessage {
  _id: string;
  sender: { _id: string; name: string; profilePic?: string };
  receiver: { _id: string; name: string; profilePic?: string };
  content: string;
  type: "text" | "image" | "video";
  image?: string;
  video?: string;
  read: boolean;
  createdAt: string;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isMine: boolean;
  type: "text" | "image" | "video";
  image?: string;
  video?: string;
}

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistId: string;
  artistName: string;
  artistAvatar: string;
}

const ChatDialog = ({ open, onOpenChange, artistId, artistName, artistAvatar }: ChatDialogProps) => {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !user) return;

    const loadMessages = async () => {
      try {
        const data = await api<ApiMessage[]>(`/api/user/messages/${artistId}`);

        const formatted = data.map((msg) => ({
          id: msg._id,
          senderId: msg.sender._id,
          type: msg.type,
          text:
            msg.type === "text"
              ? msg.content
              : msg.type === "image"
              ? "📷 Image"
              : msg.type === "video"
              ? "🎥 Video"
              : "",
          image: msg.image ? getMediaUrl(msg.image) : undefined,
          video: msg.video ? getMediaUrl(msg.video) : undefined,
          timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isMine: msg.sender._id === user._id,
        }));

        setMessages(formatted);

        const unread = data
          .filter((msg) => msg.receiver._id === user._id && !msg.read)
          .map((msg) => msg._id);

        await Promise.all(
          unread.map((messageId) =>
            api(`/api/user/messages/${messageId}/read`, { method: "PUT" }).catch(() => null)
          )
        );
      } catch (error) {
        toast.error("Failed to load messages");
      }
    };

    loadMessages();
  }, [open, artistId, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getMediaUrl = (filename: string) => {
    if (!filename) return "";
    return getPublicImageUrl(filename);
  };

  useEffect(() => {
    if (!mediaFile) {
      setMediaPreview("");
      return;
    }

    const url = URL.createObjectURL(mediaFile);
    setMediaPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [mediaFile]);

  const handleSend = async () => {
    if (!user) return;
    if (!input.trim() && !mediaFile) return;

    try {
      let sent: ApiMessage;

      if (mediaFile) {
        const formData = new FormData();
        formData.append("receiverId", artistId);
        if (input.trim()) formData.append("content", input.trim());
        formData.append("media", mediaFile);

        sent = await api<ApiMessage>("/api/user/messages", {
          method: "POST",
          body: formData,
        });
      } else {
        sent = await api<ApiMessage>("/api/user/messages", {
          method: "POST",
          body: JSON.stringify({ receiverId: artistId, content: input.trim() }),
        });
      }

      const newMessage: Message = {
        id: sent._id,
        senderId: sent.sender._id,
        type: sent.type,
        text:
          sent.type === "text"
            ? sent.content
            : sent.type === "image"
            ? "📷 Image"
            : sent.type === "video"
            ? "🎥 Video"
            : "",
        image: sent.image ? getMediaUrl(sent.image) : undefined,
        video: sent.video ? getMediaUrl(sent.video) : undefined,
        timestamp: new Date(sent.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isMine: true,
      };

      setMessages((prev) => [...prev, newMessage]);
      setInput("");
      setMediaFile(null);
      setMediaPreview("");
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Sign in Required</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Please sign in to message artists.</p>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] max-h-[600px] flex-col p-0 sm:max-w-md">
        {/* Header */}
        <DialogHeader className="border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src={getPublicImageUrl(artistAvatar)}
              alt={artistName}
              className="h-10 w-10 rounded-full object-cover"
            />
            <div>
              <DialogTitle className="font-display text-base">{artistName}</DialogTitle>
              <p className="text-xs text-muted-foreground">Artist</p>
            </div>
          </div>
        </DialogHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    msg.isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary text-secondary-foreground rounded-bl-md"
                  }`}
                >
                  {msg.type === "image" && msg.image ? (
                    <img
                      src={getPublicImageUrl(msg.image)}
                      alt="sent"
                      className="max-h-64 w-full object-contain rounded-md"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getPublicImageUrl();
                      }}
                    />
                  ) : msg.type === "video" && msg.video ? (
                    <video src={getPublicImageUrl(msg.video)} controls className="max-h-64 w-full rounded-md" />
                  ) : (
                    <p className="text-sm">{msg.text}</p>
                  )}
                  <p className={`mt-1 text-[10px] ${msg.isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-4 space-y-2">
          <div className="flex gap-2 items-center">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button onClick={handleSend} size="icon" disabled={!input.trim() && !mediaFile}>
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setMediaFile(file);
                // keep message typed
              }}
              className="text-xs"
            />

            {mediaPreview && (
              <div className="flex items-center gap-2">
                {mediaFile?.type.startsWith("image") && (
                  <img src={mediaPreview} alt="preview" className="h-12 w-12 rounded-md object-cover" />
                )}
                {mediaFile?.type.startsWith("video") && (
                  <video src={mediaPreview} className="h-16 w-20 rounded-md" controls />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setMediaFile(null);
                    setMediaPreview("");
                  }}
                  aria-label="Remove attachment"
                >
                  ✕
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatDialog;
