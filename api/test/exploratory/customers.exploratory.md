# Cenários Explorativos – US002 (Clientes e Produtos)

## Objetivo
Explorar riscos e comportamentos não cobertos pelos testes automatizados nos cadastros de clientes e produtos (SGVC).

## Cenários sugeridos
- **Campos extremos**: enviar nome/e-mail/preço com tamanho muito grande ou zero/negativo; validar mensagens e limites.
- **Duplicidade**: criar cliente com e-mail já existente e produto com mesmo nome, em requisições simultâneas, para observar conflitos/race.
- **Normalização**: enviar e-mails e nomes com espaços, letras maiúsculas e caracteres invisíveis/emoji; verificar se normaliza ou rejeita.
- **Tipos inválidos**: mandar tipos inesperados (array/objeto em vez de string/number) e JSON malformado; checar códigos 400.
- **IDs inválidos**: acessar GET/PUT/DELETE com IDs inexistentes ou nulos; confirmar 404 e mensagem adequada.
- **Bloqueio de injection/XSS**: payloads com SQLi e tags `<script>` em todos os campos (cliente e produto); garantir 400.
- **Carga rápida**: bursts de criação/edição/exclusão para observar throttling e consistência (especialmente duplicados).
- **Rollback parcial**: simular falha entre criação e leitura (interromper conexão ou matar servidor) e validar consistência pós-restart.
- **Campos opcionais gigantes**: enviar `phone`, `stock` e campos extras com valores enormes para verificar truncamento/erro.
- **Sessão/token**: operações com token ausente, inválido e expirado para confirmar 403/401 nas rotas protegidas.

## Notas
- Priorizar clientes (e-mail único) e produtos (nome/preço obrigatórios + purchase_price exigido no backend) ao montar os casos.
- Registrar respostas (status + corpo) para ajustar mensagens em caso de divergência com os critérios de aceite.
