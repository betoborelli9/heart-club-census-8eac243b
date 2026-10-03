/**
 * [CAMINHO]: src/components/admin/IncompleteProfiles.tsx
 * [MÓDULO]: Quem ainda não completou o cadastro (nascimento/gênero/
 * profissão) depois de votar — base pra campanha de e-mail convidando a
 * completar (ver aba "Robô de E-mail").
 */
import { useEffect, useState } from "react";
import { Loader2, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  user_id: string;
  nome: string;
  email: string;
  clube_nome: string | null;
  falta_nascimento: boolean;
  falta_genero: boolean;
  falta_profissao: boolean;
  votou_em: string | null;
};

export default function IncompleteProfiles() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("admin_get_incomplete_profiles");
      if (!error) setRows((data as Row[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Todo mundo que votou já completou o cadastro. 🎉
      </div>
    );
  }

  const faltamNascimento = rows.filter((r) => r.falta_nascimento).length;
  const faltamGenero = rows.filter((r) => r.falta_genero).length;
  const faltamProfissao = rows.filter((r) => r.falta_profissao).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserX className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-black uppercase italic tracking-wider">
          {rows.length} torcedor{rows.length !== 1 ? "es" : ""} com cadastro incompleto
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
          <p className="text-xl font-black text-primary">{faltamNascimento}</p>
          <p className="text-[10px] uppercase text-muted-foreground font-bold">sem nascimento</p>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
          <p className="text-xl font-black text-primary">{faltamGenero}</p>
          <p className="text-[10px] uppercase text-muted-foreground font-bold">sem gênero</p>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
          <p className="text-xl font-black text-primary">{faltamProfissao}</p>
          <p className="text-[10px] uppercase text-muted-foreground font-bold">sem profissão</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="max-h-[420px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#141414] text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2.5">Torcedor</th>
                <th className="text-left p-2.5">Clube</th>
                <th className="text-left p-2.5">Falta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id} className="border-t border-white/5">
                  <td className="p-2.5">
                    <p className="font-bold">{r.nome}</p>
                    <p className="text-muted-foreground text-[10px]">{r.email}</p>
                  </td>
                  <td className="p-2.5">{r.clube_nome || "—"}</td>
                  <td className="p-2.5">
                    <div className="flex flex-wrap gap-1">
                      {r.falta_nascimento && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[9px] font-bold uppercase">nascimento</span>
                      )}
                      {r.falta_genero && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[9px] font-bold uppercase">gênero</span>
                      )}
                      {r.falta_profissao && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[9px] font-bold uppercase">profissão</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
