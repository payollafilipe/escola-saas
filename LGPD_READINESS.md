# Prontidão LGPD e segurança — Intranet JMA

**Data da revisão:** 9 de novembro de 2026  
**Escopo:** arquivos estáticos do site fornecido e código Apps Script enviado nesta conversa. Nenhum endpoint, planilha, conta Google, contrato ou ambiente de produção foi acessado ou alterado.

## O que o código original permitia

A verificação do Apps Script encontrou riscos críticos de autorização. O servidor aceitava qualquer ID token Google com e-mail verificado, mas não comparava o público (`aud`) com o Client ID do app, não conferia emissor e validade de forma explícita, e deixava a restrição de domínio comentada. Mais importante: qualquer conta que passasse essa checagem podia ler as chaves de dados completas e sobrescrever listas inteiras de ocorrências, pedidos e notificações. A restrição de gravação cobria apenas duas chaves de configuração. Portanto, autenticar alguém não significava que essa pessoa estivesse autorizada a ver ou alterar os registros.

As páginas também enviavam operações de alerta e push sem token, embora as ações correspondentes não existissem no Apps Script enviado. O front-end não verificava de modo confiável se uma gravação tinha sido aceita. A página de intranet carregava OneSignal e associava o e-mail da pessoa à conta de push automaticamente. O worker legado importava código de terceiro.

## Medidas técnicas aplicadas nesta cópia

O novo `Code.gs` valida o token no servidor, incluindo emissor, Client ID, validade, e-mail verificado e domínio. A autorização exige ainda uma allowlist institucional no backend. A função `sessao` fornece o papel decidido no servidor; os papéis e endereços não são confiados como autorização enviada pelo navegador.

As leituras de ocorrências e pedidos são filtradas pelo autor, as notificações pelo destinatário, e os links pelo e-mail autenticado. A gravação de listas de configuração e notificações fica restrita à direção. Professores só podem criar ocorrências em seu próprio nome e só podem cancelar pedidos próprios ainda pendentes; campos administrativos e estados de pedidos existentes não podem ser alterados por uma chamada forjada do navegador. A lista inicial de links pessoais foi removida do HTML público e transferida para o Apps Script. Os links gravados são limitados a URLs HTTPS de Google Drive/Docs.

As três páginas autenticadas agora enviam o ID token em cada requisição, mantido apenas em memória, e verificam a resposta do servidor antes de considerar a operação concluída. O papel de direção vem da sessão do servidor. Permanecem as correções anteriores de armazenamento apenas em memória, limpeza de dados residuais, escape/validação de campos dinâmicos e bloqueio de cache offline para conteúdo sensível.

Desativei nesta cópia a integração OneSignal e as chamadas de push que não tinham implementação autenticada. Também removi o carregamento automático de fontes externas e substituí os workers que importavam o SDK de push. As páginas tentam cancelar inscrições e apagar dados locais OneSignal antigos. Isso **não apaga** registros já guardados na conta remota OneSignal; um administrador deve revisar essa conta e executar a exclusão/revogação por lá.

## Configuração obrigatória antes de implantar

O backend adota *fail closed*: a propriedade de script `AUTHORIZED_STAFF_EMAILS` começa vazia. Até que alguém autorizado cadastre as contas aprovadas, só os dois endereços que já constavam na lista de administradores do Apps Script conseguem acessar. Configure a propriedade em **Configurações do projeto → Propriedades do script**, com os e-mails institucionais aprovados separados por vírgula ou linha. Não use apenas o domínio como lista de autorização: o domínio pode abranger pessoas que não precisam acessar dados desta escola.

O roster de estudantes também é filtrado por turma. Defina `STAFF_ROSTER_SCOPES` como JSON, por exemplo `{"docente@prof.educacao.sp.gov.br":["7º ano|A","8º ano|B"]}`. Os valores devem corresponder exatamente às duas primeiras colunas de cada linha do roster, no formato `série|turma|estudante`. A ausência de uma entrada deixa a lista de estudantes vazia para aquele usuário. O valor `"*"` libera o roster inteiro para aquela conta e só deve ser usado quando a instituição documentar essa necessidade.

Confira a lista `ADMINS`, o Client ID Google e o domínio com a instituição. O código enviado continha dois administradores; essa lista foi mantida como autoridade do servidor, não a lista diferente e parcialmente demonstrativa que existia em algumas páginas HTML. Corrija-a antes de publicar se os administradores reais forem outros.

Cole `Code.gs` no projeto Apps Script correto, configure as propriedades, faça uma implantação de teste e confira o acesso à planilha. O aplicativo depende da planilha `DB` e cria também uma aba `AUDIT` com metadados mínimos de operações. Restrinja o arquivo e suas abas à conta proprietária e a editores estritamente necessários; não use “qualquer pessoa com o link”. A aplicação web deve executar sob a conta institucional responsável, mas toda chamada pública ainda precisa passar pelas verificações do código.

Atualize uma implantação existente para preservar a URL do endpoint, ou substitua `API_URL` nas três páginas pelo endereço da nova implantação. Faça os testes abaixo em dados fictícios antes de migrar registros reais. A coluna `B` da planilha continua guardando cada coleção inteira como JSON; o backend limita o valor a 45 mil caracteres para evitar erro da planilha. Se qualquer coleção existente estiver próxima desse limite, faça uma migração controlada para linhas por registro ou banco de dados antes de liberar uso. Faça backup restrito e testado antes da migração.

## O que ainda impede chamar o sistema de “perfeito”

A LGPD não tem uma certificação automática que o código possa garantir. Para escola pública, o controlador precisa identificar a finalidade pública e a atribuição legal de cada operação e selecionar a hipótese legal adequada para cada finalidade. “É uma escola” ou “é educação” não define sozinho a base legal. Dados de saúde ou outras categorias sensíveis exigem análise própria. Para crianças e adolescentes, o melhor interesse deve ser avaliado e prevalecer no caso concreto; consentimento parental não deve ser presumido como a base universal de todo registro escolar. [1] [2] [3]

A instituição precisa confirmar quem é o controlador — escola, secretaria ou outro ente — e quem é o encarregado, publicar o aviso de privacidade com contato e canal funcional, listar dados/finalidades/compartilhamentos e definir prazos ou critérios de retenção. O código não exclui ocorrências por tempo; não implemente expiração até verificar obrigações educacionais, arquivísticas e tabelas de temporalidade. Deve existir processo para acesso, correção e demais direitos, incluindo resposta completa no prazo previsto em lei. [1] [4]

O roster agora fica limitado por turma, mas a autorização efetiva depende de preencher corretamente as propriedades de script. A escola deve decidir e revisar quem precisa ver cada turma e cada ocorrência. Registros escolares podem conter detalhes particularmente delicados mesmo quando o campo não se enquadra formalmente como dado sensível. Limite campos livres, downloads e cópias, e não inclua nomes, relatos, saúde, medidas disciplinares ou identificadores de estudantes em notificações de tela bloqueada.

Google Identity, Apps Script/Sheets e qualquer fornecedor de hospedagem continuam envolvidos no serviço. A escola precisa verificar contratos, papéis de controlador/operador, suboperadores, locais de armazenamento e acesso, retenção, exclusão e eventual transferência internacional. Não é possível afirmar, só pelo nome do fornecedor, se há transferência internacional ou se o instrumento atual atende à Resolução CD/ANPD nº 19/2024. A integração OneSignal está desligada até essa análise; Google Identity permanece necessário para login. [1] [5]

A trilha `AUDIT` registra horário, conta, tipo de ação e chave, sem token ou conteúdo escolar. O responsável precisa restringir seu acesso, confirmar que as gravações funcionam e definir retenção. O código não prova que o log está funcionando na implantação. A planilha continua sendo armazenamento operacional simples; para maior escala, disponibilidade, transações e auditoria, avalie migrar para uma API e base de dados gerenciada com controle de acesso por registro.

Configure no provedor de hospedagem cabeçalhos HTTPS de segurança e privacidade, incluindo política de segurança de conteúdo compatível com o Google Identity, proteção contra enquadramento, `X-Content-Type-Options: nosniff`, política de referenciador restritiva e `Cache-Control: no-store` para telas autenticadas. O projeto usa scripts e estilos embutidos, então uma CSP estrita exigirá primeiro mover esses trechos para arquivos locais ou usar hashes/nonces. A configuração depende do serviço de hospedagem, que não foi informado.

Por fim, a instituição deve ter procedimento de incidente: contenção, preservação de evidências, avaliação do impacto, contato interno e decisão documentada do controlador. Quando o incidente satisfaz os critérios de risco ou dano relevante, a Resolução CD/ANPD nº 15/2024 prevê comunicação à ANPD e aos titulares em até três dias úteis, observadas as condições regulamentares. Registre também incidentes não comunicados e aplique as regras de guarda específicas do ente público. [6]

## Testes de aceitação antes de dados reais

Use contas e registros fictícios para confirmar que: uma conta fora da allowlist recebe `forbidden`; um docente só recebe seu próprio pedido e suas próprias ocorrências; um docente não consegue ler os registros de outra pessoa alterando a chave ou o ID manualmente; não consegue editar status, parecer da direção ou configurações; a direção consegue executar somente as ações aprovadas; a lista de estudantes exibida corresponde ao escopo configurado; token expirado, e-mail não verificado, outro Client ID e domínio incorreto são recusados; links `javascript:` ou domínios falsificados são recusados; falhas de rede não aparecem como sucesso; e nenhum dado sensível é encontrado em `localStorage`, URLs, logs ou notificações.

## Referências oficiais

[1]: https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-normaatualizada-pl.html "Lei nº 13.709 de 2018 LGPD texto atualizado"  
[2]: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_tratamento_de_dados_pessoais_pelo_poder_publico___defeso_eleitoral.pdf/@@display-file/file "Guia orientativo da ANPD sobre tratamento pelo poder público"  
[3]: https://www.in.gov.br/web/dou/-/enunciado-cd/anpd-n-1-de-22-de-maio-de-2023-485306934 "Enunciado CD ANPD nº 1 de 2023"  
[4]: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_da_atuacao_do_encarregado_anpd.pdf/@@display-file/file "Guia orientativo da ANPD sobre atuação do encarregado"  
[5]: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024 "Resolução CD ANPD nº 19 de 2024 sobre transferências internacionais"  
[6]: https://www.in.gov.br/web/dou/-/resolucao-cd/anpd-n-15-de-24-de-abril-de-2024-556243024 "Resolução CD ANPD nº 15 de 2024 sobre incidentes"  
[7]: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15211.htm "Lei nº 15.211 de 2025 Estatuto Digital da Criança e do Adolescente"
