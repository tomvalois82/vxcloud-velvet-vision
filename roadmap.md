# Etapa 3 — Compras

- [x] Selecionar veículos sem venda e sem compra de outro ciclo, preservando a compra em edição.
- [x] Buscar placas normalizadas e mostrar status e orientação de novo ciclo.
- [x] Exibir mensagem tratada de erro ao salvar a compra.
- [x] Executar testes (23 aprovados), revisão de código e verificar acesso à página no navegador.
- [ ] Validar seleção e aviso dentro da compra autenticada — bloqueado pela sessão externa indisponível; navegador redireciona para login.

# Etapa 4 — Cadastro de veículo

- [x] Verificar duplicidade por placa normalizada apenas em ciclos ativos.
- [x] Consultar o ciclo encerrado mais recente por placa, renavam ou chassi e retornar o total de ciclos.
- [x] Mostrar o próximo ciclo e tratar erros ao salvar o veículo.
- [x] Executar testes (29 aprovados) e conferir o acesso ao cadastro no navegador.
- [ ] Validar o aviso dentro do cadastro autenticado — bloqueado pela sessão externa indisponível; navegador redireciona para login.

# Etapa 5 — Financeiro por ciclo

- [x] Consultar todos os ciclos da empresa e ordenar por placa e prioridade do ciclo.
- [x] Mostrar título, descrição, status e avisos no seletor e na seleção fechada, sem alterar id_venda.
- [x] Testar busca normalizada e ordenação de múltiplos ciclos (32 testes aprovados); conferir acesso no navegador.
- [ ] Validar seleção e avisos no financeiro autenticado — bloqueado pela sessão externa indisponível; pagar e receber redirecionam para login.