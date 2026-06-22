/**
 * [CAMINHO]: src/pages/Terms.tsx
 * [DESCRIÇÃO]: Termos de Uso — texto padrão (revisar com jurídico).
 */
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Terms = () => (
  <div className="min-h-screen bg-background text-foreground px-4 py-8">
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/" className="inline-flex items-center gap-2 text-primary text-sm">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <header className="space-y-2">
        <h1 className="text-3xl font-display font-bold">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground">
          Última atualização: 22 de junho de 2026 — Versão 1.0
        </p>
      </header>

      <section className="space-y-4 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold">1. Aceitação</h2>
        <p>
          Ao criar uma conta no Heart Club você concorda integralmente com estes Termos e com a
          nossa <Link to="/privacidade" className="text-primary underline">Política de Privacidade</Link>.
          Se não concordar, não use a plataforma.
        </p>

        <h2 className="text-lg font-bold pt-4">2. O que é o Heart Club</h2>
        <p>
          Plataforma de censo torcedor global. O voto no clube do coração ("Voto Sagrado") é
          <strong> único, permanente e intransferível</strong>. Cada pessoa pode votar apenas uma vez,
          o que é garantido por fingerprint de dispositivo e auditoria administrativa.
        </p>

        <h2 className="text-lg font-bold pt-4">3. Cadastro e responsabilidades</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Você deve ter no mínimo 13 anos para se cadastrar.</li>
          <li>As informações fornecidas devem ser verdadeiras.</li>
          <li>Você é responsável pela guarda do seu acesso (e-mail e magic link).</li>
          <li>É proibido criar múltiplas contas, usar bots, VPN para burlar a contagem ou tentar manipular o censo.</li>
        </ul>

        <h2 className="text-lg font-bold pt-4">4. Conteúdo e propriedade intelectual</h2>
        <p>
          Logos, escudos, mascotes e nomes de clubes pertencem aos respectivos titulares e são
          utilizados a título informativo no contexto do censo torcedor (uso editorial).
          O código, design e marca "Heart Club" pertencem a [TITULAR — PREENCHER].
        </p>

        <h2 className="text-lg font-bold pt-4">5. Conduta proibida</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Tentativas de fraude no Voto Sagrado.</li>
          <li>Discurso de ódio, racismo, xenofobia ou ofensas a clubes/torcedores.</li>
          <li>Tentativas de acessar áreas administrativas sem autorização.</li>
          <li>Engenharia reversa, scraping massivo ou ataques à infraestrutura.</li>
        </ul>
        <p>O descumprimento implica suspensão imediata da conta e marcação como fraude.</p>

        <h2 className="text-lg font-bold pt-4">6. Limitação de responsabilidade</h2>
        <p>
          A plataforma é fornecida "como está". Não nos responsabilizamos por indisponibilidades
          temporárias, perda de dados decorrente de uso indevido ou conteúdo de portais de notícias
          de terceiros agregados no feed.
        </p>

        <h2 className="text-lg font-bold pt-4">7. Encerramento</h2>
        <p>
          Você pode encerrar sua conta a qualquer momento em <strong>"Gerenciar meus Dados"</strong>.
          Podemos suspender contas que violem estes termos sem aviso prévio.
        </p>

        <h2 className="text-lg font-bold pt-4">8. Foro</h2>
        <p>
          Fica eleito o foro da comarca de [CIDADE/UF — PREENCHER] para dirimir quaisquer
          controvérsias decorrentes destes termos.
        </p>

        <p className="pt-4 text-xs text-muted-foreground">
          [TEXTO PADRÃO — REVISAR COM ADVOGADO ANTES DE PUBLICAR EM PRODUÇÃO]
        </p>
      </section>
    </div>
  </div>
);

export default Terms;
