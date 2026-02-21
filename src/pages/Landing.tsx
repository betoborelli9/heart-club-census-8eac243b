import { motion } from "framer-motion";
import { Heart, Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useUser();

  const handleCTA = () => {
    if (!isAuthenticated) {
      navigate("/login");
    } else if (user?.hasVoted) {
      navigate("/dashboard");
    } else {
      navigate("/onboarding");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center space-y-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, type: "spring" }}
            className="mx-auto w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center"
          >
            <Heart className="w-12 h-12 text-primary" fill="currentColor" />
          </motion.div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-4"
          >
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
              Heart Club
              <span className="block text-primary">Global</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              O maior censo de torcidas do mundo. Declare seu clube do coração e
              faça parte da história.
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="space-y-4"
          >
            <Button
              size="lg"
              onClick={handleCTA}
              className="w-full max-w-xs text-lg h-14 font-bold rounded-xl"
            >
              <Heart className="w-5 h-5 mr-2" />
              {user?.hasVoted ? "Meu Dashboard" : "Declarar Meu Clube"}
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-3 gap-4 pt-8"
          >
            {[
              { icon: Users, label: "Torcedores", value: "12.4K" },
              { icon: Globe, label: "Países", value: "47" },
              { icon: Heart, label: "Clubes", value: "40+" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center space-y-1">
                <Icon className="w-5 h-5 mx-auto text-muted-foreground" />
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground">
        Heart Club Global © {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default Landing;
