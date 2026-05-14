import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthReady, isLoading, isAuthenticated, isProfileComplete, hasVoted } = useUser();

  useEffect(() => {
    if (!isAuthReady || (isAuthenticated && isLoading)) return;

    if (isAuthenticated) {
      if (!isProfileComplete) navigate("/profile-setup", { replace: true });
      else if (!hasVoted) navigate("/voting", { replace: true });
      else navigate("/dashboard", { replace: true });
      return;
    }

    navigate("/login", { replace: true });
  }, [isAuthReady, isLoading, isAuthenticated, isProfileComplete, hasVoted, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
};

export default Landing;
