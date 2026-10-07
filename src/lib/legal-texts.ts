/**
 * [CAMINHO]: src/lib/legal-texts.ts
 * [MÓDULO]: Textos jurídicos (Termos de Uso e Política de Privacidade) em pt / en / es.
 * Regras do produto refletidas aqui: voto definitivo (o torcedor não altera nem remove); dados pessoais
 * ocultados apenas a pedido do titular; nada de dado pessoal repassado — só números somados.
 */
export type LegalSection = { h: string; p?: string[]; ul?: string[] };
export type LegalDoc = { title: string; updated: string; intro?: string[]; sections: LegalSection[] };
export type LegalLang = "pt" | "en" | "es";

export const LEGAL_UI: Record<LegalLang, { back: string; seePrivacy: string; seeTerms: string }> = {
  pt: { back: "Voltar", seePrivacy: "Ver a Política de Privacidade", seeTerms: "Ver os Termos de Uso" },
  en: { back: "Back", seePrivacy: "See the Privacy Policy", seeTerms: "See the Terms of Use" },
  es: { back: "Volver", seePrivacy: "Ver la Política de Privacidad", seeTerms: "Ver los Términos de Uso" },
};

const DPO = "admin@heartclubapp.com";

export const TERMS: Record<LegalLang, LegalDoc> = {
  pt: {
    title: "Termos de Uso",
    updated: "Última atualização: 7 de outubro de 2026 — Versão 2.0",
    sections: [
      { h: "1. Aceitação", p: ["Ao entrar no Heart Club e marcar a caixa de aceite, você concorda com estes Termos e com a Política de Privacidade. Se não concordar, não use a plataforma."] },
      { h: "2. O que é o Heart Club", p: ["Plataforma de censo de torcedores do mundo todo. O voto no clube do coração é único, definitivo e intransferível: depois de registrado, não pode ser alterado nem removido pelo torcedor. Cada pessoa vota uma única vez, o que é protegido por verificação de dispositivo e auditoria da equipe."] },
      { h: "3. Cadastro e responsabilidades", ul: ["Você deve ter pelo menos 13 anos. Menores de 18 anos devem usar o site com ciência de seus responsáveis.", "As informações fornecidas devem ser verdadeiras.", "Você é responsável pelo acesso à sua conta (login com Google ou e-mail).", "É proibido criar várias contas, usar robôs, VPN para burlar a contagem ou tentar manipular o censo."] },
      { h: "4. Seus dados opcionais", p: ["Perguntas como bairro, profissão, faixa etária e gênero são opcionais e servem para montar estatísticas somadas da torcida. Seus dados pessoais nunca aparecem para outros torcedores nem são entregues a terceiros: apenas números somados, em grupos de pelo menos 3 pessoas, podem ser divulgados."] },
      { h: "5. Conteúdo e propriedade intelectual", p: ["Escudos, nomes e marcas de clubes pertencem aos seus titulares e são usados de forma informativa, no contexto do censo. O código, o design e a marca Heart Club pertencem aos seus titulares."] },
      { h: "6. Conduta proibida", ul: ["Fraude no voto ou criação de contas falsas.", "Discurso de ódio, racismo, xenofobia ou ofensas a torcedores e clubes.", "Tentar acessar áreas administrativas sem autorização.", "Engenharia reversa, coleta massiva de dados ou ataques à infraestrutura."], p: ["O descumprimento pode levar à suspensão da conta e ao descarte dos votos suspeitos."] },
      { h: "7. Voto, conta e seus direitos", p: ["O voto é definitivo e faz parte da integridade estatística do censo; por isso não é removido. Você pode, a qualquer momento, pedir à nossa equipe o acesso, a correção ou a ocultação dos seus dados pessoais (nome, e-mail, localização e respostas opcionais), conforme a Política de Privacidade. Nesse caso, seu voto continua contado apenas como número, sem identificar você."] },
      { h: "8. Disponibilidade", p: ["A plataforma é oferecida \"como está\". Podem ocorrer indisponibilidades temporárias. Não nos responsabilizamos por conteúdos de terceiros exibidos, como notícias e dados de jogos."] },
      { h: "9. Alterações e foro", p: ["Podemos atualizar estes Termos; quando a mudança for relevante, pediremos novo aceite. Aplica-se a lei brasileira, e fica eleito o foro do domicílio do titular, conforme a legislação do consumidor."] },
    ],
  },
  en: {
    title: "Terms of Use",
    updated: "Last updated: October 7, 2026 — Version 2.0",
    sections: [
      { h: "1. Acceptance", p: ["By entering Heart Club and ticking the acceptance box, you agree to these Terms and to the Privacy Policy. If you do not agree, do not use the platform."] },
      { h: "2. What Heart Club is", p: ["A worldwide fan census platform. The vote for your favorite club is unique, final and non-transferable: once recorded, it cannot be changed or removed by the fan. Each person votes only once, which is protected by device verification and team auditing."] },
      { h: "3. Registration and responsibilities", ul: ["You must be at least 13 years old. Users under 18 should use the site with their guardians' knowledge.", "The information you provide must be true.", "You are responsible for access to your account (Google or e-mail login).", "Creating multiple accounts, using bots, using a VPN to bypass the count or trying to manipulate the census is forbidden."] },
      { h: "4. Your optional data", p: ["Questions such as neighborhood, occupation, age range and gender are optional and are used to build aggregated fan statistics. Your personal data is never shown to other fans nor handed to third parties: only aggregated numbers, in groups of at least 3 people, may be published."] },
      { h: "5. Content and intellectual property", p: ["Crests, names and trademarks of clubs belong to their owners and are used for information purposes within the census. The code, design and Heart Club brand belong to their owners."] },
      { h: "6. Prohibited conduct", ul: ["Vote fraud or creating fake accounts.", "Hate speech, racism, xenophobia or insults to fans and clubs.", "Trying to access administrative areas without authorization.", "Reverse engineering, mass data collection or attacks on the infrastructure."], p: ["Violations may lead to account suspension and discarding of suspicious votes."] },
      { h: "7. Vote, account and your rights", p: ["The vote is final and is part of the statistical integrity of the census; therefore it is not removed. At any time you may ask our team to access, correct or hide your personal data (name, e-mail, location and optional answers), as described in the Privacy Policy. In that case your vote remains counted only as a number, without identifying you."] },
      { h: "8. Availability", p: ["The platform is provided \"as is\". Temporary outages may occur. We are not responsible for third-party content shown, such as news and match data."] },
      { h: "9. Changes and jurisdiction", p: ["We may update these Terms; for relevant changes we will ask for acceptance again. Brazilian law applies, and the courts of the holder's domicile are chosen, in accordance with consumer law."] },
    ],
  },
  es: {
    title: "Términos de Uso",
    updated: "Última actualización: 7 de octubre de 2026 — Versión 2.0",
    sections: [
      { h: "1. Aceptación", p: ["Al entrar en Heart Club y marcar la casilla de aceptación, aceptas estos Términos y la Política de Privacidad. Si no estás de acuerdo, no uses la plataforma."] },
      { h: "2. Qué es Heart Club", p: ["Plataforma de censo de hinchas de todo el mundo. El voto por el club de tu corazón es único, definitivo e intransferible: una vez registrado, el hincha no puede cambiarlo ni eliminarlo. Cada persona vota una sola vez, lo que se protege con verificación de dispositivo y auditoría del equipo."] },
      { h: "3. Registro y responsabilidades", ul: ["Debes tener al menos 13 años. Los menores de 18 deben usar el sitio con conocimiento de sus responsables.", "La información proporcionada debe ser verdadera.", "Eres responsable del acceso a tu cuenta (Google o correo).", "Está prohibido crear varias cuentas, usar bots, VPN para eludir el conteo o intentar manipular el censo."] },
      { h: "4. Tus datos opcionales", p: ["Preguntas como barrio, profesión, rango de edad y género son opcionales y sirven para crear estadísticas sumadas de la hinchada. Tus datos personales nunca aparecen a otros hinchas ni se entregan a terceros: solo pueden divulgarse números agregados, en grupos de al menos 3 personas."] },
      { h: "5. Contenido y propiedad intelectual", p: ["Escudos, nombres y marcas de clubes pertenecen a sus titulares y se usan de forma informativa, en el contexto del censo. El código, el diseño y la marca Heart Club pertenecen a sus titulares."] },
      { h: "6. Conducta prohibida", ul: ["Fraude en el voto o creación de cuentas falsas.", "Discurso de odio, racismo, xenofobia u ofensas a hinchas y clubes.", "Intentar acceder a áreas administrativas sin autorización.", "Ingeniería inversa, recolección masiva de datos o ataques a la infraestructura."], p: ["El incumplimiento puede llevar a la suspensión de la cuenta y al descarte de votos sospechosos."] },
      { h: "7. Voto, cuenta y tus derechos", p: ["El voto es definitivo y forma parte de la integridad estadística del censo; por eso no se elimina. En cualquier momento puedes pedir a nuestro equipo el acceso, la corrección o la ocultación de tus datos personales (nombre, correo, ubicación y respuestas opcionales), según la Política de Privacidad. En ese caso, tu voto sigue contando solo como un número, sin identificarte."] },
      { h: "8. Disponibilidad", p: ["La plataforma se ofrece \"tal cual\". Pueden ocurrir interrupciones temporales. No nos responsabilizamos por contenidos de terceros mostrados, como noticias y datos de partidos."] },
      { h: "9. Cambios y jurisdicción", p: ["Podemos actualizar estos Términos; ante cambios relevantes pediremos una nueva aceptación. Se aplica la ley brasileña y se elige el foro del domicilio del titular, conforme a la legislación del consumidor."] },
    ],
  },
};

export const PRIVACY: Record<LegalLang, LegalDoc> = {
  pt: {
    title: "Política de Privacidade",
    updated: "Última atualização: 7 de outubro de 2026 — Versão 2.0",
    intro: ["O Heart Club respeita a sua privacidade e segue a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Aqui explicamos quais dados coletamos, por quê, e como você exerce seus direitos."],
    sections: [
      { h: "1. Dados que coletamos", ul: ["Conta: nome de exibição e e-mail (via login com Google ou e-mail).", "Voto: o clube escolhido e até 4 clubes de simpatia.", "Localização: país, estado, cidade e, se você quiser, bairro — para o mapa de calor e o censo geográfico.", "Perfil (opcional): data de nascimento, gênero, profissão e telefone — só se você informar.", "Segurança do voto: identificação do dispositivo e endereço IP, guardados separadamente, com acesso apenas da administração, somente para garantir \"1 pessoa = 1 voto\".", "Notificações (opcional): só se você autorizar, e pode desligar quando quiser.", "Uso do site: páginas visitadas, de forma estatística, para melhorar a plataforma."] },
      { h: "2. Por que usamos (bases legais)", ul: ["Execução do serviço: registrar seu voto e mostrar o seu painel.", "Legítimo interesse: prevenir fraudes e garantir a integridade do censo.", "Consentimento: respostas opcionais de perfil, localização mais precisa e notificações."] },
      { h: "3. Com quem compartilhamos", p: ["Não vendemos nem repassamos seus dados pessoais. O que pode ser divulgado são apenas números somados (por exemplo, \"X% dos torcedores do clube têm entre 21 e 35 anos\"), sempre em grupos de pelo menos 3 pessoas, de modo que ninguém seja identificado. Seu nome, e-mail, telefone e endereço nunca aparecem para outros torcedores.", "Para o site funcionar usamos prestadores de infraestrutura: Supabase (banco de dados), Vercel (hospedagem), Google (login), Resend (e-mails), FingerprintJS (verificação de dispositivo) e Mapbox (busca de cidade/bairro, que recebe só o texto pesquisado). Alguns estão fora do Brasil, com salvaguardas contratuais."] },
      { h: "4. Voto definitivo", p: ["O voto é único e definitivo. Ele não pode ser alterado nem removido pelo torcedor, pois isso comprometeria a integridade estatística do censo. Essa regra não impede que você exerça seus direitos sobre os dados pessoais, descritos abaixo."] },
      { h: "5. Seus direitos (Art. 18 da LGPD)", ul: ["Confirmar que tratamos seus dados e ter acesso a eles.", "Corrigir dados incompletos ou desatualizados.", "Pedir a anonimização ou a ocultação dos seus dados pessoais.", "Portabilidade dos dados.", "Revogar consentimentos dados, como notificações e respostas opcionais."], p: ["Para exercer qualquer direito, use \"Gerenciar meus Dados\" no seu perfil ou escreva para " + DPO + ". Respondemos em até 15 dias. Ao ocultar seus dados pessoais, seu voto continua contado apenas como número, sem identificar você."] },
      { h: "6. Segurança", p: ["Usamos conexão criptografada (HTTPS), regras de acesso por linha no banco de dados, separação dos dados sensíveis de segurança (IP e dispositivo) e registro de acessos administrativos. Nenhum sistema é infalível, mas trabalhamos para proteger seus dados."] },
      { h: "7. Por quanto tempo guardamos", p: ["Guardamos seus dados enquanto a conta existir ou for necessário para o censo. Dados de segurança (IP e dispositivo) são mantidos apenas pelo tempo necessário para prevenir fraudes. Após um pedido de ocultação, nome, data de nascimento, telefone, endereço, IP e dispositivo são apagados ou desvinculados de você. Permanecem apenas informações estatísticas gerais (clube, cidade, faixa etária, gênero, profissão), sem ligação com a sua pessoa, e o acesso da conta, para impedir que a mesma pessoa vote de novo."] },
      { h: "8. Menores de idade", p: ["O site é para maiores de 13 anos. Pessoas entre 13 e 17 anos devem usá-lo com ciência de seus responsáveis. Se identificarmos dados de menor de 13 anos, eles serão ocultados."] },
      { h: "9. Contato (Encarregado de Dados)", p: ["Dúvidas, pedidos ou denúncias sobre privacidade: " + DPO + "."] },
    ],
  },
  en: {
    title: "Privacy Policy",
    updated: "Last updated: October 7, 2026 — Version 2.0",
    intro: ["Heart Club respects your privacy and follows Brazil's General Data Protection Law (LGPD — Law 13,709/2018). Here we explain what data we collect, why, and how you can exercise your rights."],
    sections: [
      { h: "1. Data we collect", ul: ["Account: display name and e-mail (via Google or e-mail login).", "Vote: the club you chose and up to 4 sympathy clubs.", "Location: country, state, city and, if you wish, neighborhood — for the heat map and geographic census.", "Profile (optional): date of birth, gender, occupation and phone — only if you provide them.", "Vote security: device identification and IP address, stored separately, with administration-only access, solely to guarantee \"1 person = 1 vote\".", "Notifications (optional): only if you allow them, and you can turn them off anytime.", "Site usage: pages visited, in a statistical way, to improve the platform."] },
      { h: "2. Why we use it (legal bases)", ul: ["Providing the service: recording your vote and showing your dashboard.", "Legitimate interest: preventing fraud and protecting the integrity of the census.", "Consent: optional profile answers, more precise location and notifications."] },
      { h: "3. Who we share it with", p: ["We do not sell or hand over your personal data. What may be published are only aggregated numbers (for example, \"X% of the club's fans are aged 21 to 35\"), always in groups of at least 3 people so that nobody is identified. Your name, e-mail, phone and address never appear to other fans.", "To run the site we use infrastructure providers: Supabase (database), Vercel (hosting), Google (login), Resend (e-mails), FingerprintJS (device verification) and Mapbox (city/neighborhood search, which only receives the searched text). Some are outside Brazil, with contractual safeguards."] },
      { h: "4. Final vote", p: ["The vote is unique and final. It cannot be changed or removed by the fan, as that would compromise the statistical integrity of the census. This rule does not prevent you from exercising your rights over personal data, described below."] },
      { h: "5. Your rights (LGPD Art. 18)", ul: ["Confirm that we process your data and access it.", "Correct incomplete or outdated data.", "Ask for anonymization or hiding of your personal data.", "Data portability.", "Withdraw consents given, such as notifications and optional answers."], p: ["To exercise any right, use \"Manage my Data\" in your profile or write to " + DPO + ". We reply within 15 days. When your personal data is hidden, your vote remains counted only as a number, without identifying you."] },
      { h: "6. Security", p: ["We use encrypted connections (HTTPS), row-level access rules in the database, separation of sensitive security data (IP and device) and logging of administrative access. No system is infallible, but we work to protect your data."] },
      { h: "7. How long we keep it", p: ["We keep your data while the account exists or as needed for the census. Security data (IP and device) is kept only as long as needed to prevent fraud. After a hiding request, name, date of birth, phone, address, IP and device are erased or unlinked from you. Only general statistical information (club, city, age range, gender, occupation) remains, with no link to you, along with account access, to prevent the same person from voting again."] },
      { h: "8. Minors", p: ["The site is for people over 13. Users aged 13 to 17 should use it with their guardians' knowledge. If we identify data of a child under 13, it will be hidden."] },
      { h: "9. Contact (Data Protection Officer)", p: ["Questions, requests or complaints about privacy: " + DPO + "."] },
    ],
  },
  es: {
    title: "Política de Privacidad",
    updated: "Última actualización: 7 de octubre de 2026 — Versión 2.0",
    intro: ["Heart Club respeta tu privacidad y sigue la Ley General de Protección de Datos de Brasil (LGPD — Ley 13.709/2018). Aquí explicamos qué datos recopilamos, por qué y cómo ejercer tus derechos."],
    sections: [
      { h: "1. Datos que recopilamos", ul: ["Cuenta: nombre para mostrar y correo (por Google o correo).", "Voto: el club elegido y hasta 4 clubes de simpatía.", "Ubicación: país, estado, ciudad y, si quieres, barrio — para el mapa de calor y el censo geográfico.", "Perfil (opcional): fecha de nacimiento, género, profesión y teléfono — solo si los informas.", "Seguridad del voto: identificación del dispositivo y dirección IP, guardados por separado, con acceso solo de la administración, únicamente para garantizar \"1 persona = 1 voto\".", "Notificaciones (opcional): solo si las autorizas, y puedes desactivarlas cuando quieras.", "Uso del sitio: páginas visitadas, de forma estadística, para mejorar la plataforma."] },
      { h: "2. Por qué los usamos (bases legales)", ul: ["Prestación del servicio: registrar tu voto y mostrar tu panel.", "Interés legítimo: prevenir fraudes y proteger la integridad del censo.", "Consentimiento: respuestas opcionales de perfil, ubicación más precisa y notificaciones."] },
      { h: "3. Con quién los compartimos", p: ["No vendemos ni entregamos tus datos personales. Lo que puede divulgarse son solo números agregados (por ejemplo, \"X% de los hinchas del club tienen entre 21 y 35 años\"), siempre en grupos de al menos 3 personas, para que nadie sea identificado. Tu nombre, correo, teléfono y dirección nunca aparecen a otros hinchas.", "Para que el sitio funcione usamos proveedores de infraestructura: Supabase (base de datos), Vercel (alojamiento), Google (acceso), Resend (correos), FingerprintJS (verificación de dispositivo) y Mapbox (búsqueda de ciudad/barrio, que solo recibe el texto buscado). Algunos están fuera de Brasil, con garantías contractuales."] },
      { h: "4. Voto definitivo", p: ["El voto es único y definitivo. El hincha no puede cambiarlo ni eliminarlo, pues comprometería la integridad estadística del censo. Esta regla no impide que ejerzas tus derechos sobre los datos personales, descritos abajo."] },
      { h: "5. Tus derechos (Art. 18 de la LGPD)", ul: ["Confirmar que tratamos tus datos y acceder a ellos.", "Corregir datos incompletos o desactualizados.", "Pedir la anonimización o la ocultación de tus datos personales.", "Portabilidad de los datos.", "Revocar consentimientos dados, como notificaciones y respuestas opcionales."], p: ["Para ejercer cualquier derecho, usa \"Gestionar mis Datos\" en tu perfil o escribe a " + DPO + ". Respondemos en hasta 15 días. Al ocultar tus datos personales, tu voto sigue contando solo como un número, sin identificarte."] },
      { h: "6. Seguridad", p: ["Usamos conexión cifrada (HTTPS), reglas de acceso por fila en la base de datos, separación de los datos sensibles de seguridad (IP y dispositivo) y registro de accesos administrativos. Ningún sistema es infalible, pero trabajamos para proteger tus datos."] },
      { h: "7. Por cuánto tiempo los guardamos", p: ["Guardamos tus datos mientras exista la cuenta o sea necesario para el censo. Los datos de seguridad (IP y dispositivo) se mantienen solo el tiempo necesario para prevenir fraudes. Tras una solicitud de ocultación, nombre, fecha de nacimiento, teléfono, dirección, IP y dispositivo se borran o se desvinculan de ti. Solo permanece información estadística general (club, ciudad, rango de edad, género, profesión), sin vínculo contigo, y el acceso de la cuenta, para impedir que la misma persona vote de nuevo."] },
      { h: "8. Menores de edad", p: ["El sitio es para mayores de 13 años. Los jóvenes de 13 a 17 años deben usarlo con conocimiento de sus responsables. Si identificamos datos de un menor de 13 años, serán ocultados."] },
      { h: "9. Contacto (Encargado de Datos)", p: ["Dudas, solicitudes o denuncias sobre privacidad: " + DPO + "."] },
    ],
  },
};
