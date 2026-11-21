# Revisão de segurança — status desta cópia

Esta revisão abrange o código HTML/JavaScript, o service worker e o Apps Script enviado pelo usuário. As mudanças estão aplicadas apenas nesta cópia local para entrega; não foram implantadas no site, no Google Apps Script, na planilha nem no provedor de hospedagem.

## Riscos críticos identificados no material original

- O Apps Script validava insuficientemente a identidade e aceitava leituras/gravações de coleções sem autorização por registro.
- As páginas confiavam no papel de administrador calculado no navegador e filtravam dados localmente.
- A lista de links Drive/Sheets por professor estava no HTML público.
- Algumas chamadas de alerta e push eram enviadas sem token para ações não implementadas no Apps Script.
- O OneSignal era iniciado e associado automaticamente ao e-mail, e um service worker importava SDK externo.
- A persistência/caches locais podiam deixar dados de sessão e escolares em dispositivos compartilhados.

## Alterações aplicadas nesta cópia

- Backend `Code.gs` com validação de ID token Google no servidor, verificação de emissor, `aud`, expiração, e-mail verificado e domínio; allowlist de equipe; papéis fixados no servidor; listas de registros filtradas por proprietário; permissões de gravação por recurso; validação de dados e limites de tamanho.
- Escopo de roster por turma via propriedade `STAFF_ROSTER_SCOPES`; sem mapa configurado, nenhum estudante é retornado a um docente.
- Links individuais removidos do HTML e movidos à configuração inicial privada no Apps Script.
- Frontends atualizados para enviar token em cada chamada e só afirmar sucesso após resposta válida; operações falhas não devem atualizar o estado local como se o servidor tivesse confirmado.
- OneSignal e chamadas legadas de push removidos; workers sem SDK externo e rotina de limpeza local de inscrições/dados legados.
- Fontes carregadas de CDN removidas; fontes de sistema são usadas como alternativa.
- Persistência local de dados pessoais e cache offline de conteúdo escolar desativados; escape/validação de campos dinâmicos mantidos.
- Aba `AUDIT` recebe metadados mínimos de leitura/gravação; nenhum conteúdo de ocorrência ou token é escrito pelo logger.

## Limites e próximos passos

O relatório [LGPD_READINESS.md](./LGPD_READINESS.md) contém a configuração obrigatória, testes de aceite, itens de governança, retenção, fornecedores, hospedagem e respostas a incidentes ainda pendentes. A allowlist de equipe e o mapa do roster estão vazios por padrão; devem ser preenchidos e testados antes de professores usarem o sistema. A conta remota OneSignal, contratos de fornecedores, permissões reais de Drive/Sheets, cabeçalhos HTTP, backups e implantação não foram inspecionados.

A correção do código reduz riscos técnicos, mas não certifica conformidade com a LGPD. A instituição controladora, o encarregado e a assessoria jurídica precisam validar finalidades, bases legais, melhor interesse de crianças e adolescentes, aviso de privacidade, prazo de guarda e fluxo de direitos. Não coloque dados reais em produção até concluir os itens do relatório de prontidão.
