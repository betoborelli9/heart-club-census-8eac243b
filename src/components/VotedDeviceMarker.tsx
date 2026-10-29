/**
 * [CAMINHO]: src/components/VotedDeviceMarker.tsx
 * [MÓDULO]: Marca no aparelho (localStorage) que aqui já houve um torcedor que votou — assim, se ele voltar sem
 * estar logado, a porta de entrada mostra "Bem-vindo de volta!" em vez da busca de clube.
 * Grava quando um torcedor logado tem voto (cobre quem acabou de votar e quem já tinha votado e fez login).
 * Nunca grava durante o teste do Master (simulação) e nunca mexe em voto nenhum.
 */
import { useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { markDeviceVoted } from "@/lib/entry-flow";

export default function VotedDeviceMarker() {
  const { isAuthReady, isLoading, isAuthenticated, hasVoted, simActive } = useUser();

  useEffect(() => {
    if (!isAuthReady || isLoading || simActive) return;
    if (isAuthenticated && hasVoted) markDeviceVoted();
  }, [isAuthReady, isLoading, isAuthenticated, hasVoted, simActive]);

  return null;
}
