import { useState } from "react";

export default function Termos({ onVoltar }) {
  const [aba, setAba] = useState("termos");

  return (
    <div style={{minHeight:"100vh",background:"#080810",fontFamily:"Inter,sans-serif",padding:"40px 20px"}}>
      <div style={{maxWidth:"720px",margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"32px"}}>
          {onVoltar && (
            <button onClick={onVoltar} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1e1e2e",borderRadius:"8px",padding:"8px 14px",color:"#888",cursor:"pointer",fontSize:"13px",fontFamily:"Inter,sans-serif"}}>
              ← Voltar
            </button>
          )}
          <div>
            <h1 style={{margin:0,fontSize:"22px",fontWeight:"800",color:"#f0f0f0"}}>Mi Trading Plan</h1>
            <p style={{margin:0,color:"#555",fontSize:"12px"}}>Documentos legais</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",background:"rgba(255,255,255,0.03)",borderRadius:"10px",padding:"3px",marginBottom:"28px"}}>
          {[["termos","Termos de Uso"],["privacidade","Política de Privacidade"]].map(([id,label])=>(
            <button key={id} onClick={()=>setAba(id)}
              style={{flex:1,padding:"10px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:"600",fontSize:"13px",transition:"all 0.2s",background:aba===id?"rgba(255,255,255,0.07)":"transparent",color:aba===id?"#f0f0f0":"#555",fontFamily:"Inter,sans-serif"}}>
              {label}
            </button>
          ))}
        </div>

        <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"16px",padding:"36px 40px"}}>

          {aba === "termos" && (
            <div style={{color:"#888",fontSize:"14px",lineHeight:"1.9"}}>
              <h2 style={{margin:"0 0 8px",color:"#f0f0f0",fontSize:"18px",fontWeight:"800"}}>Termos de Uso</h2>
              <p style={{margin:"0 0 28px",color:"#555",fontSize:"12px"}}>Última atualização: março de 2026</p>

              <Section titulo="1. Aceitação dos Termos">
                Ao criar uma conta e utilizar o <strong style={{color:"#f0f0f0"}}>Mi Trading Plan</strong>, você concorda com estes Termos de Uso. Se não concordar, não utilize o serviço.
              </Section>

              <Section titulo="2. Sobre o Serviço">
                O Mi Trading Plan é uma plataforma digital de gestão e análise de operações financeiras, desenvolvida por <strong style={{color:"#f0f0f0"}}>Felipe Garcia Alves</strong>. O serviço oferece ferramentas para registro de trades, análise comportamental, métricas de performance e gestão de disciplina operacional.
              </Section>

              <Section titulo="3. Natureza do Serviço">
                O Mi Trading Plan é uma ferramenta de <strong style={{color:"#f0f0f0"}}>organização e análise pessoal</strong>. Não constitui assessoria de investimentos, recomendação de compra ou venda de ativos, nem qualquer forma de consultoria financeira regulada. Todas as decisões de investimento são de exclusiva responsabilidade do usuário.
              </Section>

              <Section titulo="4. Cadastro e Conta">
                Para utilizar o serviço, você deve fornecer informações verdadeiras e manter sua senha em sigilo. Você é responsável por todas as atividades realizadas em sua conta. Em caso de acesso não autorizado, notifique-nos imediatamente.
              </Section>

              <Section titulo="5. Planos e Pagamento">
                O Mi Trading Plan oferece um plano de assinatura mensal no valor de <strong style={{color:"#f0f0f0"}}>R$ 10,00/mês</strong>. O pagamento é recorrente e pode ser cancelado a qualquer momento. Não há reembolso de períodos já pagos. Novos usuários podem ter acesso a período de teste conforme condições vigentes.
              </Section>

              <Section titulo="6. Propriedade Intelectual">
                Todo o conteúdo do Mi Trading Plan — incluindo código, design, textos e funcionalidades — é propriedade de Felipe Garcia Alves. É proibida a reprodução, cópia ou distribuição sem autorização expressa.
              </Section>

              <Section titulo="7. Limitação de Responsabilidade">
                O Mi Trading Plan não se responsabiliza por perdas financeiras decorrentes do uso ou não uso da plataforma. O serviço é fornecido "como está", sem garantias de resultados financeiros.
              </Section>

              <Section titulo="8. Cancelamento">
                Você pode cancelar sua assinatura a qualquer momento pelo painel de configurações. Após o cancelamento, o acesso permanece ativo até o fim do período pago.
              </Section>

              <Section titulo="9. Alterações">
                Podemos atualizar estes termos a qualquer momento. Mudanças significativas serão comunicadas por email com 15 dias de antecedência.
              </Section>

              <Section titulo="10. Contato">
                Dúvidas sobre estes termos: <span style={{color:"#00d4aa"}}>contato@mitradingplan.com</span>
              </Section>
            </div>
          )}

          {aba === "privacidade" && (
            <div style={{color:"#888",fontSize:"14px",lineHeight:"1.9"}}>
              <h2 style={{margin:"0 0 8px",color:"#f0f0f0",fontSize:"18px",fontWeight:"800"}}>Política de Privacidade</h2>
              <p style={{margin:"0 0 28px",color:"#555",fontSize:"12px"}}>Última atualização: março de 2026</p>

              <Section titulo="1. Dados Coletados">
                Coletamos apenas os dados necessários para o funcionamento do serviço: nome, endereço de email, dados de operações financeiras inseridos pelo usuário (trades, estratégias, anotações) e dados de uso da plataforma.
              </Section>

              <Section titulo="2. Como Usamos os Dados">
                Seus dados são utilizados exclusivamente para: fornecer as funcionalidades da plataforma, enviar comunicações relacionadas ao serviço (confirmação de email, recuperação de senha) e melhorar a experiência do produto. <strong style={{color:"#f0f0f0"}}>Nunca vendemos seus dados a terceiros.</strong>
              </Section>

              <Section titulo="3. Armazenamento e Segurança">
                Os dados são armazenados de forma segura utilizando infraestrutura da <strong style={{color:"#f0f0f0"}}>Supabase</strong> (banco de dados PostgreSQL com criptografia). Cada usuário acessa exclusivamente seus próprios dados — nenhum outro usuário tem acesso às suas informações.
              </Section>

              <Section titulo="4. Compartilhamento de Dados">
                Não compartilhamos seus dados pessoais com terceiros, exceto quando necessário para o funcionamento técnico do serviço (provedores de infraestrutura) ou quando exigido por lei.
              </Section>

              <Section titulo="5. Seus Direitos (LGPD)">
                De acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a: acessar seus dados, corrigir informações incorretas, solicitar a exclusão da sua conta e dados, e revogar seu consentimento a qualquer momento. Para exercer esses direitos, entre em contato conosco.
              </Section>

              <Section titulo="6. Cookies">
                Utilizamos apenas cookies essenciais para manter sua sessão ativa na plataforma. Não utilizamos cookies de rastreamento ou publicidade.
              </Section>

              <Section titulo="7. Retenção de Dados">
                Seus dados são mantidos enquanto sua conta estiver ativa. Após o cancelamento e solicitação de exclusão, os dados são removidos permanentemente em até 30 dias.
              </Section>

              <Section titulo="8. Contato">
                Para questões sobre privacidade e proteção de dados: <span style={{color:"#00d4aa"}}>contato@mitradingplan.com</span>
              </Section>
            </div>
          )}

        </div>

        <p style={{textAlign:"center",color:"#333",fontSize:"12px",marginTop:"24px"}}>
          Mi Trading Plan · Felipe Garcia Alves · mitradingplan.vercel.app
        </p>
      </div>
    </div>
  );
}

function Section({ titulo, children }) {
  return (
    <div style={{marginBottom:"24px"}}>
      <h3 style={{margin:"0 0 8px",color:"#f0f0f0",fontSize:"14px",fontWeight:"700"}}>{titulo}</h3>
      <p style={{margin:0,lineHeight:"1.9"}}>{children}</p>
    </div>
  );
}
