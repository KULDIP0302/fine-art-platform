import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const ForgotPassword = () => {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    const success = await forgotPassword(email);
    setLoading(false);

    if (success) {
      toast.success("OTP sent to your email!");
      navigate("/reset-password", { state: { email } });
    } else {
      toast.error("Failed to send OTP");
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
          Forgot Password?
        </h1>
        <p className="mt-2 text-muted-foreground">
          Enter your email to receive a password reset code
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Code"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <button
            onClick={() => navigate("/auth")}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
