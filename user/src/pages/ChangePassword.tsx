import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const ChangePassword = () => {
  const { isAuthenticated, sendChangePasswordOTP, changePassword } = useAuth();
  const navigate = useNavigate();

  const [stage, setStage] = useState<"email" | "otp">("email");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) {
    navigate("/auth");
    return null;
  }

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await sendChangePasswordOTP();
    setLoading(false);

    if (success) {
      toast.success("OTP sent to your email!");
      setStage("otp");
    } else {
      toast.error("Failed to send OTP");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || !newPassword || !confirmPassword) {
      toast.error("Please fill all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const success = await changePassword(otp, newPassword);
    setLoading(false);

    if (success) {
      toast.success("Password changed successfully!");
      navigate("/dashboard");
    } else {
      toast.error("Invalid OTP or expired link");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="animate-fade-up">
        <h1 className="font-display text-3xl font-bold text-foreground">
          Change Password
        </h1>
        <p className="mt-2 text-muted-foreground">
          Update your account password securely via email OTP
        </p>

        {stage === "email" ? (
          <form onSubmit={handleSendOTP} className="mt-8 space-y-4">
            <p className="text-sm text-muted-foreground">
              We'll send a verification code to your email.
            </p>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Verification Code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="mt-8 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">OTP</label>
              <Input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirm Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Changing..." : "Change Password"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setStage("email");
                setOtp("");
                setNewPassword("");
                setConfirmPassword("");
              }}
            >
              Resend OTP
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChangePassword;
