import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Club, getClubById } from "@/data/clubs";

interface UserData {
  id: string;
  fullName: string;
  email: string;
  birthDate: string;
  country: string;
  city: string;
  hasVoted: boolean;
  heartClubId: string | null;
  sympathyClubIds: string[];
  referralCode: string;
  referralCount: number;
  votedAt: string | null;
}

interface UserContextType {
  user: UserData | null;
  isAuthenticated: boolean;
  heartClub: Club | null;
  login: (email: string, name: string) => void;
  logout: () => void;
  updateProfile: (data: Partial<UserData>) => void;
  castVote: (heartClubId: string, sympathyClubIds: string[]) => void;
}

const UserContext = createContext<UserContextType | null>(null);

const generateReferralCode = () => {
  return "HCG-" + Math.random().toString(36).substring(2, 8).toUpperCase();
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(() => {
    const saved = localStorage.getItem("hcg_user");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("hcg_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("hcg_user");
    }
  }, [user]);

  const heartClub = user?.heartClubId ? getClubById(user.heartClubId) ?? null : null;

  // Apply club theme
  useEffect(() => {
    if (heartClub) {
      document.documentElement.style.setProperty("--primary", heartClub.primaryColor);
      document.documentElement.style.setProperty("--primary-foreground", "0 0% 98%");
      document.documentElement.style.setProperty("--accent", heartClub.secondaryColor);
      document.documentElement.style.setProperty("--ring", heartClub.primaryColor);
    }
  }, [heartClub]);

  const login = (email: string, name: string) => {
    setUser({
      id: crypto.randomUUID(),
      fullName: name,
      email,
      birthDate: "",
      country: "BR",
      city: "",
      hasVoted: false,
      heartClubId: null,
      sympathyClubIds: [],
      referralCode: generateReferralCode(),
      referralCount: Math.floor(Math.random() * 15),
      votedAt: null,
    });
  };

  const logout = () => setUser(null);

  const updateProfile = (data: Partial<UserData>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  };

  const castVote = (heartClubId: string, sympathyClubIds: string[]) => {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            hasVoted: true,
            heartClubId,
            sympathyClubIds,
            votedAt: new Date().toISOString(),
          }
        : null
    );
  };

  return (
    <UserContext.Provider value={{ user, isAuthenticated: !!user, heartClub, login, logout, updateProfile, castVote }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be inside UserProvider");
  return ctx;
}
