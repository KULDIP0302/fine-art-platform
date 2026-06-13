import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const reasons = [
  "Copyright issue",
  "Inappropriate content",
  "Fake artwork",
];

interface ReportDialogProps {
  artworkId: string;
  artworkTitle: string;
}

const ReportDialog = ({ artworkId, artworkTitle }: ReportDialogProps) => {
const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Please select a reason");
      return;
    }

    setLoading(true);
    try {
      await api(`/api/artworks/${artworkId}/report`, {
        method: "POST",
        body: JSON.stringify({ reason, details: message }),
      });
      toast.success("Report submitted successfully! Admin will review it.");
      setOpen(false);
      setReason("");
      setMessage("");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-muted-foreground">
          <Flag className="h-4 w-4" />
          Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Report "{artworkTitle}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Select a reason</p>
            <div className="flex flex-col gap-2">
              {reasons.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                    reason === r
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Additional details (optional)</p>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the issue..."
              className="resize-none"
              disabled={loading}
            />
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={loading || !reason}>
            {loading ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;

