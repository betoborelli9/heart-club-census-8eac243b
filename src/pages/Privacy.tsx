/**
 * [CAMINHO]: src/pages/Privacy.tsx
 * [DESCRIÇÃO]: Política de Privacidade — LGPD.
 */
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Privacy = () => (
  <div className="min-h-screen bg-background text-foreground px-4 py-8">
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/" className="inline-flex items-center gap-2 text-primary text-sm">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <header className="space-y-2">
        <h1 className="text-3xl font-display font-bold">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground">
          Última atualização: 20 de julho de 2026 — Versão 1.1
        </p>
      </header>

      <section className="space-y-4 text-sm leading-relaxed text-foreground/90">
        <p>
          O Heart Club ("nós", "plataforma") respeita sua privacidade e está em conformidade com a
          Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
          Esta política descreve quais dados coletamos, por que coletamos e como você pode
          exercer seus direitos.
        </p>

        <h2 className="text-lg font-bold pt-4">1. Dados que coletamos</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Identificação:</strong> nome de exibição, e-mail, data de nascimento, gênero.</li>
          <li><strong>Localização:</strong> cidade, estado, país, bairro (opcional via GPS) — para o mapa de calor e censo geográfico.</li>
          <li><strong>Voto:</strong> clube escolhido (voto único e permanente) e até 4 clubes de simpatia.</li>
          <li><strong>Identificação de dispositivo:</strong> fingerprint do navegador e endereço IP — armazenados em tabela segregada
            (<code>votos_tracking</code>), com acesso apenas administrativo, exclusivamente para garantir
            a regra de <em>"1 pessoa = 1 voto"</em> (Voto Sagrado).</li>
          <li><strong>Perfil socioeconômico (opcional):</strong> faixa etária, profissão, classe social — apenas se você informar.</li>
          <li><strong>Notificações push (opcional):</strong> token do dispositivo, gerado apenas se você autorizar notificações — usado exclusivamente para envio de avisos da plataforma. Pode ser revogado a qualquer momento nas configurações de notificação.</li>
        </ul>

        <h2 className="text-lg font-bold pt-4">2. Por que coletamos (base legal)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Execução de contrato:</strong> permitir seu voto e o uso do dashboard.</li>
          <li><strong>Legítimo interesse:</strong> prevenção a fraudes (fingerprint/IP).</li>
          <li><strong>Consentimento:</strong> dados opcionais de perfil e geolocalização precisa.</li>
        </ul>

        <h2 className="text-lg font-bold pt-4">3. Compartilhamento</h2>
        <p>
          Não vendemos seus dados. Dados agregados e anonimizados (sem identificação pessoal)
          podem ser publicados em relatórios, mapas e rankings públicos da plataforma.
          Provedores de infraestrutura utilizados: Supabase (banco de dados), Resend (e-mails),
          FingerprintJS (identificação de dispositivo), Mapbox (busca de endereço/cidade no
          mapa de calor — recebe apenas o texto pesquisado, sem dados de identificação).
        </p>

        <h2 className="text-lg font-bold pt-4">4. Seus direitos (Art. 18 LGPD)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Confirmação e acesso aos seus dados.</li>
          <li>Correção de dados incompletos ou desatualizados.</li>
          <li>Anonimização, bloqueio ou eliminação de dados.</li>
          <li>Portabilidade.</li>
          <li>Revogação do consentimento.</li>
        </ul>
        <p>
          Você pode solicitar a exclusão completa da sua conta e dados pessoais a qualquer momento
          na sua área de perfil, em <strong>"Gerenciar meus Dados"</strong>. A exclusão é processada
          em até 15 dias, conforme prazo legal.
        </p>

        <h2 className="text-lg font-bold pt-4">5. Segurança</h2>
        <p>
          Aplicamos criptografia em trânsito (HTTPS), Row Level Security (RLS) no banco de dados,
          segregação de PII (IP/fingerprint isolados) e auditoria de acessos administrativos.
        </p>

        <h2 className="text-lg font-bold pt-4">6. Retenção</h2>
        <p>
          Mantemos seus dados enquanto sua conta estiver ativa. Após solicitação de exclusão,
          os dados pessoais são apagados; votos podem ser mantidos de forma anonimizada para
          preservar a integridade estatística do censo.
        </p>

        <h2 className="text-lg font-bold pt-4">7. Encarregado (DPO) e contato</h2>
        <p>
          Para dúvidas, exercício de direitos ou denúncias relacionadas à LGPD, contate nosso
          Encarregado de Proteção de Dados:
          <br />
          <a className="text-primary underline" href="mailto:admin@heartclubapp.com">admin@heartclubapp.com</a>
        </p>
      </section>
    </div>
  </div>
);

export default Privacy;
