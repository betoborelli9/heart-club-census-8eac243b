import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

interface Club {
  id: string;
  name: string;
  logo: string;
}

export default function Voting() {
  const navigate = useNavigate();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [searchHeart, setSearchHeart] = useState("");
  const [searchSympathy, setSearchSympathy] = useState("");

  const [heartClub, setHeartClub] = useState<Club | null>(null);
  const [sympathies, setSympathies] = useState<Club[]>([]);

  const [showHeartResults, setShowHeartResults] = useState(false);
  const [showSympathyResults, setShowSympathyResults] = useState(false);

  useEffect(() => {
    async function loadClubs() {
      const response = await fetch("/clubs.json");
      const data = await response.json();
      setClubs(data);
    }

    loadClubs();
  }, []);

  const filteredHeart = clubs.filter((club) =>
    club.name.toLowerCase().includes(searchHeart.toLowerCase())
  );

  const filteredSympathy = clubs.filter(
    (club) =>
      club.name.toLowerCase().includes(searchSympathy.toLowerCase()) &&
      club.id !== heartClub?.id &&
      !sympathies.find((s) => s.id === club.id)
  );

  function addSympathy(club: Club) {
    if (sympathies.length >= 4) return;

    setSympathies([...sympathies, club]);
    setSearchSympathy("");
    setShowSympathyResults(false);
  }

  function confirmVote() {
    if (!heartClub) return;

    console.log({
      heart: heartClub,
      sympathies,
    });

    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 pt-10">

      <h1 className="text-3xl font-bold text-center mb-10">
        Voto Sagrado
      </h1>

      {/* CLUBE DO CORAÇÃO */}

      <div className="mb-10 relative z-10">

        <p className="mb-2 font-semibold">
          ❤️ Clube do Coração
        </p>

        <div className="flex items-center bg-zinc-900 rounded-lg px-3 py-3">
          <Search size={18} />
          <input
            value={searchHeart}
            onChange={(e) => {
              setSearchHeart(e.target.value);
              setShowHeartResults(true);
            }}
            placeholder="Buscar clube..."
            className="bg-transparent outline-none ml-2 w-full"
          />
        </div>

        {showHeartResults && searchHeart && (
          <div className="absolute top-full mt-2 w-full bg-zinc-900 rounded-lg max-h-60 overflow-y-auto border border-zinc-800">
            {filteredHeart.map((club) => (
              <div
                key={club.id}
                onClick={() => {
                  setHeartClub(club);
                  setSearchHeart(club.name);
                  setShowHeartResults(false);
                }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 cursor-pointer"
              >
                <img src={club.logo} className="w-6 h-6" />
                {club.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SIMPATIAS */}

      <div className="mb-10 relative z-0">

        <p className="mb-2 font-semibold">
          ✨ Clubes de Simpatia ({sympathies.length}/4)
        </p>

        <div className="flex items-center bg-zinc-900 rounded-lg px-3 py-3">
          <Search size={18} />
          <input
            value={searchSympathy}
            onChange={(e) => {
              setSearchSympathy(e.target.value);
              setShowSympathyResults(true);
            }}
            placeholder="Próxima simpatia..."
            className="bg-transparent outline-none ml-2 w-full"
          />
        </div>

        {showSympathyResults && searchSympathy && (
          <div className="absolute top-full mt-2 w-full bg-zinc-900 rounded-lg max-h-60 overflow-y-auto border border-zinc-800">
            {filteredSympathy.map((club) => (
              <div
                key={club.id}
                onClick={() => addSympathy(club)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 cursor-pointer"
              >
                <img src={club.logo} className="w-6 h-6" />
                {club.name}
              </div>
            ))}
          </div>
        )}

        {sympathies.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {sympathies.map((club) => (
              <div
                key={club.id}
                className="flex items-center gap-2 bg-zinc-800 px-3 py-2 rounded-lg text-sm"
              >
                <img src={club.logo} className="w-4 h-4" />
                {club.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTÃO */}

      <button
        onClick={confirmVote}
        disabled={!heartClub}
        className="w-full py-4 rounded-xl bg-red-700 hover:bg-red-600 transition disabled:opacity-40"
      >
        Confirmar Voto
      </button>

    </div>
  );
}