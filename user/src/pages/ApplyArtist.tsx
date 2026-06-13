import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, UserCircle, X } from "lucide-react";
import { toast } from "sonner";

const ApplyArtist = () => {
  const { isAuthenticated, applyForArtist } = useAuth();
  const navigate = useNavigate();
  const [bio, setBio] = useState("");
  const [artStyle, setArtStyle] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [passportPhotoFile, setPassportPhotoFile] = useState<File | null>(null);
  const [passportPhotoPreview, setPassportPhotoPreview] = useState<string | null>(null);
  const passportRef = useRef<HTMLInputElement>(null);

  if (!isAuthenticated) {
    navigate("/auth");
    return null;
  }

  const handlePassportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setPassportPhotoFile(file);
    setPassportPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bio.trim() || !artStyle.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!passportPhotoFile) {
      toast.error("Please upload a passport size photo for verification");
      return;
    }

    if (!accountHolderName.trim() || !accountNumber.trim() || !ifsc.trim()) {
      toast.error("Bank details are required (name, account number, IFSC)");
      return;
    }

    const accountNumberClean = accountNumber.replace(/\s+/g, '');
    if (!/^\d{9,18}$/.test(accountNumberClean)) {
      toast.error("Enter a valid account number (9-18 digits)");
      return;
    }

    const ifscNorm = ifsc.trim().replace(/\s/g, "").toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscNorm)) {
      toast.error("Enter a valid 11-character IFSC");
      return;
    }

    if (portfolio.trim() && !/^https?:\/\/.+/.test(portfolio.trim())) {
      toast.error("Portfolio link must be a valid URL (starting with http:// or https://)");
      return;
    }

    setIfsc(ifscNorm);

    // Create FormData for file upload
    const formData = new FormData();
    formData.append("passportPhoto", passportPhotoFile);
    formData.append("bio", bio);
    formData.append("artStyle", artStyle);
    formData.append("portfolio", portfolio);
    formData.append("accountHolderName", accountHolderName.trim());
    formData.append("accountNumber", accountNumber.trim());
    formData.append("ifsc", ifscNorm);

    const success = await applyForArtist(formData);
    
    if (success) {
      toast.success("Application submitted! We'll review it shortly.");
      navigate("/dashboard");
    } else {
      toast.error("Failed to submit application");
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="animate-fade-up">
        <h1 className="font-display text-3xl font-bold text-foreground">Apply to Become an Artist</h1>
        <p className="mt-2 text-muted-foreground">
          Share your experience, identity proof, and portfolio for review
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Passport Size Photo */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Passport Size Photo * <span className="text-xs text-muted-foreground">(Identity verification)</span>
            </label>
            <p className="text-xs text-muted-foreground">
              Upload a clear passport-size photo to verify that you are the same person in your portfolio
            </p>
            <div className="flex items-start gap-4">
              <div
                onClick={() => passportRef.current?.click()}
                className="relative flex h-32 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/30 bg-secondary/30 transition-colors hover:border-primary/50 hover:bg-secondary/50"
              >
                {passportPhotoPreview ? (
                  <>
                    <img src={passportPhotoPreview} alt="Passport photo" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPassportPhotoPreview(null); setPassportPhotoFile(null); }}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <UserCircle className="h-8 w-8" />
                    <span className="text-[10px]">Upload Photo</span>
                  </div>
                )}
              </div>
              <div className="flex-1 rounded-lg bg-secondary/30 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Requirements:</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  <li>Clear, front-facing photo</li>
                  <li>Plain background preferred</li>
                  <li>Face clearly visible</li>
                  <li>Same person as in portfolio</li>
                </ul>
              </div>
            </div>
            <input
              ref={passportRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePassportUpload}
            />
          </div>

          {/* Bank — encrypted on server; only masked values are shown later */}
          <div className="space-y-4 rounded-lg border border-border bg-secondary/20 p-4">
            <p className="text-sm font-medium text-foreground">Payout bank details *</p>
            <p className="text-xs text-muted-foreground">
              Required for artist payouts after delivery. Stored encrypted; we never show full numbers in the app.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Account holder name</label>
              <Input
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                placeholder="As per bank records"
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Account number</label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Bank account number"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">IFSC</label>
              <Input
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001234"
                maxLength={11}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Bio / Experience *</label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about your artistic journey, exhibitions, achievements..."
              className="min-h-[120px] resize-none"
            />
          </div>

          {/* Art Style */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Art Style *</label>
            <Input
              value={artStyle}
              onChange={(e) => setArtStyle(e.target.value)}
              placeholder="e.g. Madhubani, Warli, Abstract Expressionism"
            />
          </div>

          {/* Portfolio Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Portfolio / Social Link</label>
            <p className="text-xs text-muted-foreground">
              Instagram page, YouTube channel, Google Drive link with your work videos/photos
            </p>
            <Input
              value={portfolio}
              onChange={(e) => setPortfolio(e.target.value)}
              placeholder="https://instagram.com/yourpage or Google Drive link"
            />
          </div>

          <Button type="submit" className="w-full" size="lg">
            Submit Application
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ApplyArtist;
