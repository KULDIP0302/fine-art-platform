import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPublicImageUrl } from "@/lib/utils";
import { X } from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, register, isAuthenticated, accounts, switchAccount, removeAccount } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!isValidEmail(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (!isLogin && !name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    const success = isLogin
      ? await login(email.trim(), password)
      : await register(name.trim(), email.trim(), password);
    if (success) {
      toast.success(isLogin ? "Welcome back!" : "Account created!");
      navigate("/");
    } else {
      toast.error("Something went wrong");
    }
  };

  const handleSwitch = async (accountEmail: string) => {
    const ok = await switchAccount(accountEmail);
    if (ok) {
      toast.success("Logged in");
      navigate("/");
    } else {
      toast.error("Session expired, please login again");
      setShowForm(true);
      setEmail(accountEmail);
    }
  };

  const handleRemove = (accountEmail: string) => {
    removeAccount(accountEmail);
    toast.success("Account removed");
  };

  const savedAccounts = accounts || [];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm animate-scale-in">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">
            {isLogin ? "Welcome Back" : "Join Galerie"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isLogin ? "Sign in to continue" : "Create your account"}
          </p>
        </div>

        {isLogin && !showForm && savedAccounts.length > 0 ? (
          <div className="space-y-4">
            {savedAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleSwitch(acc.email)}
                className="w-full flex items-center gap-3 rounded-lg border p-3 text-left hover:bg-secondary/40 transition-colors"
              >
                <img
                  src={getPublicImageUrl(acc.profilePic)}
                  alt={acc.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="flex-1 overflow-hidden">
                  <p className="font-medium truncate">{acc.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{acc.email}</p>
                </div>
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(acc.email);
                  }}
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </span>
              </button>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowForm(true)}
            >
              Add other account
            </Button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <Input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {isLogin && (
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Forgot password?
            </button>
          )}
          <Button type="submit" className="w-full">
            {isLogin ? "Sign In" : "Create Account"}
          </Button>
        </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setShowForm(true);
            }}
            className="font-medium text-primary hover:underline"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
        {isLogin && showForm && savedAccounts.length > 0 && (
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="mt-3 w-full text-xs text-muted-foreground hover:text-primary"
          >
            Back to saved accounts
          </button>
        )}
      </div>
    </div>
  );
};

export default Auth;
