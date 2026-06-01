import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { isMasterEmail } from "@/lib/master";

const Landing = () => {
  const navigate = useNavigate();
  const { user, isAuthReady, isLoading, isAuthenticated, hasVoted } = useUser();

  useEffect(() => {
    if (!isAuthReady || (isAuthenticated && isLoading)) return;

    if (isAuthenticated) {
      // Master Admin nunca é forçado para /voting — vai direto ao dashboard.
      if (isMasterEmail(user?.email)) {
        navigate("/dashboard", { replace: true });
        return;
      }
      if (!hasVoted) navigate("/voting", { replace: true });
      else navigate("/dashboard", { replace: true });
      return;
    }

    navigate("/login", { replace: true });
  }, [user, isAuthReady, isLoading, isAuthenticated, hasVoted, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
};

export default Landing;
