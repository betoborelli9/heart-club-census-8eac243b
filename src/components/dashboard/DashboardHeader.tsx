import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { Club } from "@/data/clubs";

interface DashboardHeaderProps {
  club: Club;
  userName: string;
}

const DashboardHeader = ({ club, userName }: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const { logout } = useUser();

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-lg">
            {club.emoji}
          </div>
          <div>
            <span className="font-bold text-foreground text-sm">{userName}</span>
            <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">• {club.name}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};

export default DashboardHeader;
