import { type SourceDocument } from '@/shared/types';

// ─── Chunks da POL-001 (Política de Devolução) ────────────────────────────────

export const POL_001_A: SourceDocument = {
  documentId: 'POL-001',
  chunkId: 'POL-001-A',
  title: 'Política de Devolução — Seção 3.1: Prazo geral',
  snippet:
    'O cliente pode solicitar a devolução de mercadorias em até 7 (sete) dias úteis após a data de recebimento confirmada no sistema de tracking. A contagem de dias úteis exclui sábados, domingos e feriados nacionais.',
  score: 0.92,
  version: '1.0',
  vigencia_inicio: '2023-01-01',
  documentType: 'normative',
  isObsolete: false
};

export const POL_001_B: SourceDocument = {
  documentId: 'POL-001',
  chunkId: 'POL-001-B',
  title: 'Política de Devolução — Seção 3.2: Exceções',
  snippet:
    'As seguintes categorias de carga NÃO são elegíveis para devolução pelo processo padrão: Cargas perigosas classificadas nas classes 1 a 6 da ANTT (Agência Nacional de Transportes Terrestres), conforme Resolução ANTT nº 5.947/2021. Inclui: explosivos (classe 1), gases (classe 2), líquidos inflamáveis (classe 3), sólidos inflamáveis (classe 4), oxidantes e peróxidos (classe 5), substâncias tóxicas e infectantes (classe 6). Para essas categorias, o cliente deve entrar em contato com o setor de Gestão de Riscos (ramal 4500) para tratamento individual.',
  score: 0.95,
  version: '1.0',
  vigencia_inicio: '2023-01-01',
  documentType: 'normative',
  isObsolete: false
};

export const POL_001_C: SourceDocument = {
  documentId: 'POL-001',
  chunkId: 'POL-001-C',
  title: 'Política de Devolução — Seção 3.3: Procedimento',
  snippet:
    'O cliente abre chamado no Portal do Cliente (portal.novatech.com.br), selecionando a categoria "Devolução de Mercadoria". O chamado deve incluir: número do CT-e, fotos da mercadoria (mínimo 3: embalagem externa, etiqueta, conteúdo), e motivo da devolução. O time de atendimento tem 4 horas úteis para triagem. Se elegível, a coleta reversa é agendada em até 2 dias úteis após aprovação.',
  score: 0.88,
  version: '1.0',
  vigencia_inicio: '2023-01-01',
  documentType: 'normative',
  isObsolete: false
};

export const POL_001_D: SourceDocument = {
  documentId: 'POL-001',
  chunkId: 'POL-001-D',
  title: 'Política de Devolução — Seção 3.5: Custos',
  snippet:
    'Defeito ou erro da NovaTech (carga errada, avaria em trânsito): devolução sem custo para o cliente. Desistência do cliente (carga correta, sem defeito): o custo do frete reverso é do cliente, calculado com os mesmos multiplicadores do frete original. Prazo expirado (solicitação após 7 dias úteis): não elegível para devolução padrão — encaminhar ao Comercial.',
  score: 0.84,
  version: '1.0',
  vigencia_inicio: '2023-01-01',
  documentType: 'normative',
  isObsolete: false
};

// ─── Chunks da PROC-042 v1 (Frete Especial — versão original, mar/2023) ───────

export const PROC_042_A: SourceDocument = {
  documentId: 'PROC-042',
  chunkId: 'PROC-042-A',
  title: 'Frete Especial v1 — Seção 2: Fórmula',
  snippet:
    'Frete especial para cargas acima de 500kg. Valor do frete = Valor base × Multiplicador regional × Fator de peso. Fator de peso: 1.0 (500-1.000kg), 1.2 (1.001-3.000kg), 1.5 (acima de 3.000kg).',
  score: 0.91,
  version: '1.0',
  vigencia_inicio: '2023-03-01',
  vigencia_fim: '2023-11-30',
  documentType: 'procedure',
  isObsolete: false // controlado pela lógica de deduplicação
};

export const PROC_042_B: SourceDocument = {
  documentId: 'PROC-042',
  chunkId: 'PROC-042-B',
  title: 'Frete Especial v1 — Seção 2.1: Multiplicadores regionais',
  snippet:
    'Multiplicadores regionais (PROC-042 v1): Sul 1.2, Sudeste 1.0, Centro-Oeste 1.3, Nordeste 1.4, Norte 1.6.',
  score: 0.93,
  version: '1.0',
  vigencia_inicio: '2023-03-01',
  vigencia_fim: '2023-11-30',
  documentType: 'procedure',
  isObsolete: false // controlado pela lógica de deduplicação
};

export const PROC_042_C: SourceDocument = {
  documentId: 'PROC-042',
  chunkId: 'PROC-042-C',
  title: 'Frete Especial v1 — Seção 3: Prazo',
  snippet:
    'O prazo de entrega para frete especial é calculado como o prazo padrão da rota + 2 dias úteis adicionais para manuseio de carga pesada.',
  score: 0.86,
  version: '1.0',
  vigencia_inicio: '2023-03-01',
  vigencia_fim: '2023-11-30',
  documentType: 'procedure',
  isObsolete: false // controlado pela lógica de deduplicação
};

// ─── Chunks da PROC-042-v2 (Frete Especial — versão revisada, nov/2023) ───────

export const PROC_042V2_A: SourceDocument = {
  documentId: 'PROC-042-v2',
  chunkId: 'PROC-042v2-A',
  title: 'Frete Especial v2 — Seção 2: Fórmula atualizada',
  snippet:
    'Frete especial para cargas acima de 500kg (versão revisada, novembro/2023). Valor do frete = Valor base × Multiplicador regional × Fator de peso. Fator de peso: 1.0 (500-1.000kg), 1.15 (1.001-3.000kg), 1.4 (acima de 3.000kg).',
  score: 0.93,
  version: '2.0',
  vigencia_inicio: '2023-12-01',
  documentType: 'procedure',
  isObsolete: false
};

export const PROC_042V2_B: SourceDocument = {
  documentId: 'PROC-042-v2',
  chunkId: 'PROC-042v2-B',
  title: 'Frete Especial v2 — Seção 2.1: Multiplicadores regionais atualizados',
  snippet:
    'Multiplicadores regionais atualizados (novembro/2023): Sul 1.3, Sudeste 1.1, Centro-Oeste 1.4, Nordeste 1.5, Norte 1.8.',
  score: 0.96,
  version: '2.0',
  vigencia_inicio: '2023-12-01',
  documentType: 'procedure',
  isObsolete: false
};

export const PROC_042V2_C: SourceDocument = {
  documentId: 'PROC-042-v2',
  chunkId: 'PROC-042v2-C',
  title: 'Frete Especial v2 — Seção 3: Prazo atualizado',
  snippet:
    'O prazo de entrega para frete especial é calculado como o prazo padrão da rota + 3 dias úteis adicionais para manuseio e roteirização de carga pesada.',
  score: 0.88,
  version: '2.0',
  vigencia_inicio: '2023-12-01',
  documentType: 'procedure',
  isObsolete: false
};

export const PROC_042V2_D: SourceDocument = {
  documentId: 'PROC-042-v2',
  chunkId: 'PROC-042v2-D',
  title: 'Frete Especial v2 — Seção 4: Descontos de volume',
  snippet:
    'A partir de 8 fretes especiais/mês para o mesmo cliente, aplicar desconto de 5% sobre o multiplicador regional. Acima de 15 fretes/mês, desconto de 10%. Descontos maiores requerem aprovação da Diretoria Comercial.',
  score: 0.81,
  version: '2.0',
  vigencia_inicio: '2023-12-01',
  documentType: 'procedure',
  isObsolete: false
};

export const PROC_042V2_E: SourceDocument = {
  documentId: 'PROC-042-v2',
  chunkId: 'PROC-042v2-E',
  title: 'Frete Especial v2 — Seção 5: Disposições transitórias',
  snippet:
    'Chamados abertos antes de 01/12/2023 que ainda estejam em processamento devem usar os multiplicadores da versão anterior (PROC-042 v1). Chamados novos a partir de 01/12/2023 devem usar os multiplicadores desta versão.',
  score: 0.85,
  version: '2.0',
  vigencia_inicio: '2023-12-01',
  documentType: 'procedure',
  isObsolete: false
};

// ─── Chunks da SLA-2024 (Tabela de SLA) ──────────────────────────────────────

export const SLA_2024_A: SourceDocument = {
  documentId: 'SLA-2024',
  chunkId: 'SLA-2024-A',
  title: 'Tabela SLA — Seção 1: Classificação de clientes',
  snippet:
    'A NovaTech classifica seus clientes em 3 (três) tiers: Gold (contrato anual acima de R$ 500.000 ou mais de 200 operações/mês), Silver (contrato anual entre R$ 100.000 e R$ 500.000 ou entre 50 e 200 operações/mês), e Standard (todos os demais clientes). Não existem outros tiers além dos três listados.',
  score: 0.94,
  version: '2024',
  vigencia_inicio: '2024-01-01',
  documentType: 'sla',
  isObsolete: false
};

export const SLA_2024_B: SourceDocument = {
  documentId: 'SLA-2024',
  chunkId: 'SLA-2024-B',
  title: 'Tabela SLA — Seção 2: SLAs para chamados gerais',
  snippet:
    'SLAs para chamados gerais — Gold: resposta em até 2h úteis, resolução em até 24h úteis. Silver: resposta em até 4h úteis, resolução em até 48h úteis. Standard: resposta em até 8h úteis, resolução em até 72h úteis.',
  score: 0.97,
  version: '2024',
  vigencia_inicio: '2024-01-01',
  documentType: 'sla',
  isObsolete: false
};

export const SLA_2024_C: SourceDocument = {
  documentId: 'SLA-2024',
  chunkId: 'SLA-2024-C',
  title: 'Tabela SLA — Seção 2: SLAs para incidentes críticos',
  snippet:
    'SLAs para incidentes críticos — Gold: resposta em até 30min, resolução em até 4h. Silver: resposta em até 1h, resolução em até 8h. Standard: resposta em até 2h, resolução em até 24h.',
  score: 0.95,
  version: '2024',
  vigencia_inicio: '2024-01-01',
  documentType: 'sla',
  isObsolete: false
};

export const SLA_2024_D: SourceDocument = {
  documentId: 'SLA-2024',
  chunkId: 'SLA-2024-D',
  title: 'Tabela SLA — Seção 3: Definição de incidente crítico',
  snippet:
    'Um incidente é crítico quando: carga com valor acima de R$ 100.000 com status desconhecido há mais de 6h; carga perigosa com irregularidade; mais de 5 chamados do mesmo cliente em 24h sobre o mesmo problema; qualquer risco à segurança de pessoas.',
  score: 0.88,
  version: '2024',
  vigencia_inicio: '2024-01-01',
  documentType: 'sla',
  isObsolete: false
};

export const SLA_2024_E: SourceDocument = {
  documentId: 'SLA-2024',
  chunkId: 'SLA-2024-E',
  title: 'Tabela SLA — Seção 4: Penalidades',
  snippet:
    'Primeira violação de SLA no mês: registro interno. Segunda violação: crédito de 5% sobre o frete do chamado. Terceira ou mais: crédito de 10% + reunião obrigatória com gerente de conta (Gold) ou gerente de operações (Silver/Standard).',
  score: 0.82,
  version: '2024',
  vigencia_inicio: '2024-01-01',
  documentType: 'sla',
  isObsolete: false
};

// ─── Chunks do FAQ-Atendimento ────────────────────────────────────────────────

export const FAQ_03: SourceDocument = {
  documentId: 'FAQ-Atendimento',
  chunkId: 'FAQ-03',
  title: 'FAQ Atendimento — Item 3: Devolução de carga perigosa',
  snippet:
    'Na prática, a gente orienta o cliente a ligar no ramal 4500 (Gestão de Riscos). Oficialmente não pode pelo processo padrão, mas já tiveram casos em que o pessoal de Riscos autorizou exceção. Então não diga que é impossível — diga que precisa de tratamento especial.',
  score: 0.78,
  version: '2023',
  documentType: 'faq',
  isObsolete: false
};

export const FAQ_08: SourceDocument = {
  documentId: 'FAQ-Atendimento',
  chunkId: 'FAQ-08',
  title: 'FAQ Atendimento — Item 8: Frete especial',
  snippet:
    'Acima de 500kg, aplica a tabela de multiplicadores por região. Cuidado: existem duas versões da PROC-042. A mais recente tem multiplicadores mais altos. Na dúvida, use a mais recente (v2), mas se o cliente reclamar do valor, pode ser que o contrato dele ainda esteja na tabela antiga.',
  score: 0.80,
  version: '2023',
  documentType: 'faq',
  isObsolete: false
};

export const FAQ_15: SourceDocument = {
  documentId: 'FAQ-Atendimento',
  chunkId: 'FAQ-15',
  title: 'FAQ Atendimento — Item 15: Tier Platinum',
  snippet:
    'Não existe tier Platinum na NovaTech. Às vezes o cliente confunde com outra transportadora ou com o programa de fidelidade antigo que foi descontinuado em 2022. Oriente que nossos tiers são Gold, Silver e Standard e peça o número do contrato para verificar.',
  score: 0.91,
  version: '2023',
  documentType: 'faq',
  isObsolete: false
};

export const FAQ_32: SourceDocument = {
  documentId: 'FAQ-Atendimento',
  chunkId: 'FAQ-32',
  title: 'FAQ Atendimento — Item 32: Carga perigosa com frete expresso',
  snippet:
    'Sim, mas precisa de autorização do Compliance e a documentação ANTT tem que estar atualizada. Na prática, demora uns 2 dias para conseguir a autorização, então o "expresso" acaba não sendo tão expresso. Avise o cliente sobre isso.',
  score: 0.76,
  version: '2023',
  documentType: 'faq',
  isObsolete: false
};

export const FAQ_38: SourceDocument = {
  documentId: 'FAQ-Atendimento',
  chunkId: 'FAQ-38',
  title: 'FAQ Atendimento — Item 38: Carga danificada em trânsito',
  snippet:
    'Carga danificada em trânsito tem processo diferente de devolução. O cliente precisa registrar a ocorrência em até 48h após o recebimento, com fotos e laudo se possível. A NovaTech investiga e, se comprovada responsabilidade nossa, reembolsa integralmente. Mas isso passa pelo Jurídico — encaminhe para sinistros@novatech.com.br.',
  score: 0.83,
  version: '2023',
  documentType: 'faq',
  isObsolete: false
};

// ─── Coleções utilitárias para testes ────────────────────────────────────────

export const ALL_CHUNKS: SourceDocument[] = [
  POL_001_A, POL_001_B, POL_001_C, POL_001_D,
  PROC_042_A, PROC_042_B, PROC_042_C,
  PROC_042V2_A, PROC_042V2_B, PROC_042V2_C, PROC_042V2_D, PROC_042V2_E,
  SLA_2024_A, SLA_2024_B, SLA_2024_C, SLA_2024_D, SLA_2024_E,
  FAQ_03, FAQ_08, FAQ_15, FAQ_32, FAQ_38
];

/** Chunks que devem ser retornados para pergunta sobre multiplicador Sudeste (pós-01/12/2023) */
export const FRETE_SUDESTE_POST_DEC_2023: SourceDocument[] = [
  { ...PROC_042V2_B, isObsolete: false },  // v2: Sudeste 1.1 — deve aparecer
  { ...PROC_042_B, isObsolete: true }       // v1: Sudeste 1.0 — obsoleto, não deve aparecer em sources
];

/** Chunks para cenário de carga perigosa (conflito CONF-02: normativo vs FAQ) */
export const CARGA_PERIGOSA_DEVOLUCAO: SourceDocument[] = [
  { ...POL_001_B, score: 0.95 },   // normativo: NÃO elegível
  { ...FAQ_03, score: 0.78 }        // faq: sugere flexibilidade informal
];
