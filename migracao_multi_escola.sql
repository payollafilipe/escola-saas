-- ============================================================================
-- MIGRAÇÃO MULTI-ESCOLA CENTRALIZADA (LICENÇAS + ISOLAMENTO POR ESCOLA)
-- ============================================================================

-- 1. TABELA CENTRAL DE ESCOLAS E LICENÇAS
CREATE TABLE IF NOT EXISTS public.escolas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  sigla text NOT NULL DEFAULT 'ESC',
  cnpj_inep text,
  telefone text,
  email_contato text,
  cidade_uf text,
  endereco text,
  diretor_nome text,
  limite_aulas_semana int NOT NULL DEFAULT 32,
  plano text NOT NULL DEFAULT 'mensal',
  licenca_ativa boolean NOT NULL DEFAULT true,
  licenca_validade date,
  obs_admin text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- Cria a escola inicial (JMA) para manter todos os seus registros atuais intactos
INSERT INTO public.escolas (id, nome, sigla, plano, licenca_ativa)
VALUES ('00000000-0000-0000-0000-000000000001', 'Escola Estadual JMA', 'JMA', 'anual', true)
ON CONFLICT (id) DO NOTHING;

-- 2. COLUNAS EXTRAS EM PERFIS
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS escola_id uuid REFERENCES public.escolas(id) ON DELETE CASCADE;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS super_admin boolean NOT NULL DEFAULT false;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS pasta_drive text;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS tutoria_link text;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS agenda_link text;

UPDATE public.perfis
SET escola_id = '00000000-0000-0000-0000-000000000001'
WHERE escola_id IS NULL AND super_admin = false;

-- 3. FUNÇÕES DE SEGURANÇA E VERIFICAÇÃO DE LICENÇA
CREATE OR REPLACE FUNCTION public.meu_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

CREATE OR REPLACE FUNCTION public.eh_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce((SELECT super_admin FROM perfis WHERE email = meu_email() AND ativo = true), false);
$$;

CREATE OR REPLACE FUNCTION public.minha_escola_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT escola_id FROM perfis WHERE email = meu_email() AND ativo = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.meu_papel()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT papel FROM perfis WHERE email = meu_email() AND ativo = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.licenca_escola_ativa()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN eh_super_admin() THEN true
    ELSE coalesce((
      SELECT e.licenca_ativa AND (e.licenca_validade IS NULL OR e.licenca_validade >= CURRENT_DATE)
      FROM escolas e
      JOIN perfis p ON p.escola_id = e.id
      WHERE p.email = meu_email() AND p.ativo = true
    ), false)
  END;
$$;

-- 4. ADICIONA escola_id COM DEFAULT AUTOMÁTICO E RLS EM TODAS AS TABELAS
DO $$
DECLARE
  t text;
  tabelas text[] := ARRAY[
    'alunos','areas','atribuicoes','ausencias_prof','avaliacoes','avisos',
    'calendarios_provas','categorias_material','checagens','contatos','dias_sem_aula',
    'disciplina_areas','faltas','funcoes','grupos','grupo_membros','horario_aulas','horarios',
    'lembretes','links_intranet','motivos','notificar_faltas',
    'opcoes_encaminhamento','pedidos','pendencias','professores_contato',
    'push_inscricoes','queixas','saidas_antecipadas','substituicoes',
    'substituicao_grupos','substituicao_opcoes','substitutos_bloqueados'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS escola_id uuid REFERENCES public.escolas(id) ON DELETE CASCADE;', t);
      EXECUTE format('UPDATE public.%I SET escola_id = %L WHERE escola_id IS NULL;', t, '00000000-0000-0000-0000-000000000001');
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN escola_id SET DEFAULT minha_escola_id();', t);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (escola_id);', 'idx_' || t || '_escola', t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('DROP POLICY IF EXISTS "isolamento_escola" ON public.%I;', t);
      EXECUTE format('CREATE POLICY "isolamento_escola" ON public.%I FOR ALL TO authenticated USING (eh_super_admin() OR (escola_id = minha_escola_id() AND licenca_escola_ativa())) WITH CHECK (eh_super_admin() OR (escola_id = minha_escola_id() AND licenca_escola_ativa()));', t);
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "escolas_rls" ON public.escolas;
CREATE POLICY "escolas_rls" ON public.escolas FOR ALL TO authenticated
  USING (eh_super_admin() OR id = minha_escola_id())
  WITH CHECK (eh_super_admin() OR (id = minha_escola_id() AND meu_papel() = 'direcao' AND licenca_escola_ativa()));

DROP POLICY IF EXISTS "perfis_rls" ON public.perfis;
CREATE POLICY "perfis_rls" ON public.perfis FOR ALL TO authenticated
  USING (eh_super_admin() OR email = meu_email() OR (escola_id = minha_escola_id() AND licenca_escola_ativa()))
  WITH CHECK (eh_super_admin() OR (escola_id = minha_escola_id() AND meu_papel() = 'direcao' AND licenca_escola_ativa()));

-- 5. RPC PARA CADASTRAR NOVA ESCOLA CLIENTE + GESTOR + DADOS INICIAIS
CREATE OR REPLACE FUNCTION public.admin_cadastrar_escola(
  p_nome_escola text,
  p_sigla text,
  p_plano text,
  p_validade date,
  p_gestor_nome text,
  p_gestor_email text,
  p_gestor_telefone text DEFAULT NULL,
  p_obs text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_esc_id uuid;
  v_email text := lower(trim(p_gestor_email));
BEGIN
  IF NOT eh_super_admin() THEN RAISE EXCEPTION 'sem permissao'; END IF;

  INSERT INTO escolas (nome, sigla, plano, licenca_ativa, licenca_validade, diretor_nome, email_contato, telefone, obs_admin)
  VALUES (
    trim(p_nome_escola),
    upper(coalesce(nullif(trim(p_sigla), ''), left(trim(p_nome_escola), 3))),
    coalesce(p_plano, 'mensal'),
    true,
    p_validade,
    trim(p_gestor_nome),
    v_email,
    trim(p_gestor_telefone),
    trim(p_obs)
  )
  RETURNING id INTO v_esc_id;

  INSERT INTO areas (escola_id, nome) VALUES
    (v_esc_id, 'Linguagens'),
    (v_esc_id, 'Matemática e Ciências da Natureza'),
    (v_esc_id, 'Ciências Humanas'),
    (v_esc_id, 'Outras')
  ON CONFLICT DO NOTHING;

  -- Copia estrutura de atalhos da escola modelo para a nova escola
  INSERT INTO links_intranet (escola_id, categoria, titulo, url, acao, icone, destaque, ordem)
  SELECT v_esc_id, categoria, titulo, url, acao, icone, destaque, ordem
  FROM links_intranet
  WHERE escola_id = '00000000-0000-0000-0000-000000000001'
    AND (url IS NULL OR url NOT LIKE 'http%');

  INSERT INTO perfis (email, escola_id, nome, telefone, papel, ativo)
  VALUES (v_email, v_esc_id, trim(p_gestor_nome), trim(p_gestor_telefone), 'direcao', true)
  ON CONFLICT (email) DO UPDATE
    SET escola_id = v_esc_id, nome = EXCLUDED.nome, telefone = EXCLUDED.telefone, papel = 'direcao', ativo = true;

  RETURN v_esc_id;
END $$;

-- 6. RPC PARA EXCLUIR CHECAGEM DE TAREFAS
CREATE OR REPLACE FUNCTION public.excluir_checagem(p_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_papel text := meu_papel();
  v_dono text;
BEGIN
  IF v_papel IS NULL OR v_papel NOT IN ('professor', 'direcao') THEN RAISE EXCEPTION 'sem permissao'; END IF;
  SELECT lower(professor_email) INTO v_dono FROM checagens WHERE id = p_id AND escola_id = minha_escola_id();
  IF NOT FOUND THEN RAISE EXCEPTION 'checagem inexistente'; END IF;
  IF v_papel <> 'direcao' AND v_dono <> meu_email() THEN RAISE EXCEPTION 'sem permissao'; END IF;

  DELETE FROM checagem_alunos WHERE checagem_id = p_id;
  DELETE FROM checagens WHERE id = p_id;
END $$;

-- 7. DEFINIR SEU USUÁRIO COMO ADMINISTRADOR MASTER
-- IMPORTANTE: Troque 'seu-email@gmail.com' pelo seu e-mail antes de executar!
INSERT INTO public.perfis (email, nome, papel, ativo, super_admin)
VALUES ('seu-email@gmail.com', 'Administrador Master', 'direcao', true, true)
ON CONFLICT (email) DO UPDATE SET super_admin = true, ativo = true;
