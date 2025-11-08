1) Funcionalidade: Login de Empreendedores
Como um microempreendedor,
Eu quero realizar login no sistema,
Para que eu possa acessar e gerenciar minhas informações de vendas e clientes.

Regras de Negócio:
- O login deve validar e-mail e senha cadastrados.
- O sistema deve impedir tentativas com credenciais incorretas.
- Após 3 tentativas erradas, o acesso deve ser temporariamente bloqueado por 15 minutos.
- O sistema deve manter a sessão ativa por tempo limitado (ex: 30 minutos de inatividade).

2) Funcionalidade: Cadastro de Clientes e Produtos
Como um empreendedor,
Eu quero cadastrar meus clientes e produtos,
Para que eu possa registrar vendas e acompanhar meu estoque de forma organizada.

Regras de Negócio:
- Não pode haver clientes com e-mails duplicados.
- Cada produto deve ter nome e preço obrigatórios.
- O empreendedor pode editar ou excluir produtos e clientes.
- O sistema deve validar campos obrigatórios antes de salvar o cadastro.

3) Funcionalidade: Registro de Vendas e Faturamento
Como um empreendedor,
Eu quero registrar minhas vendas,
Para que eu possa visualizar e acompanhar meu faturamento diário e mensal.

Regras de Negócio:
- Cada venda deve conter cliente, produto, valor e data.
- O sistema deve calcular automaticamente o total de faturamento.
- Não é permitido registrar uma venda sem cliente e produto vinculados.
- O sistema deve permitir editar ou cancelar vendas realizadas.

4) Funcionalidade: Visualização do Total de Faturamento
Como um empreendedor,
Eu quero visualizar o total do meu faturamento,
Para que eu possa acompanhar meus ganhos e avaliar o desempenho das minhas vendas.

Regras de Negócio:
- O sistema deve exibir o faturamento total diário, semanal e mensal.
- Deve permitir filtros por período (ex: data inicial e final).
- O cálculo deve considerar apenas vendas confirmadas.
- O empreendedor pode exportar o relatório em formato PDF ou Excel.