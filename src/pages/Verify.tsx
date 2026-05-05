/**
 * PROJETO: Heart Club
 * ARQUIVO: src/pages/Verify.tsx
 * DESCRIÇÃO: Página que valida o token de custódia e realiza o login.
 * AUTOR: Especialista Senior (AI) para Beto Borelli
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const Verify = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get("token");

      if (!token) {
        toast.error("Token de acesso ausente.");
        navigate("/login");
        return;
      }

      // Validação do Token na tabela de custódia
      const { data, error } = await supabase
        .from("auth_tokens")
        .select("*")
        .eq("token", token)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error || !data) {
        toast.error("Link inválido ou expirado.");
        navigate("/login");
        return;
      }

      // Marca o token como utilizado
      await supabase
        .from("auth_tokens")
        .update({ used: true })
        .eq("id", data.id);

      toast.success("Acesso autorizado! Bem-vindo ao Heart Club.");
      navigate("/dashboard"); 
    };

    validateToken();
  }, [searchParams, navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Validando seu acesso...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">O Heart Club está verificando suas credenciais.</p>
      </div>
    </div>
  );
};

export default Verify;