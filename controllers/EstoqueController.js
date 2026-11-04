import EstoqueService from "../services/estoqueService.js";

const executar = (fn) => async (req, res) => {
    try {
        const resultado = await fn(req);
        return res.json(resultado);
    } catch (error) {
        console.error("Erro no módulo de estoque:", error);
        return res.status(error.status || 500).json({ erro: error.message || "Erro interno no módulo de estoque." });
    }
};

class EstoqueController {
    static listarProdutos = executar((req) => EstoqueService.listarProdutos(req.usuario, req.query));
    static obterProduto = executar((req) => EstoqueService.obterProduto(req.params.id, req.usuario));
    static criarProduto = executar(async (req) => {
        const produto = await EstoqueService.criarProduto(req.body);
        return { mensagem: "Produto cadastrado.", produto };
    });
    static atualizarProduto = executar(async (req) => ({ mensagem: "Produto atualizado.", produto: await EstoqueService.atualizarProduto(req.params.id, req.body) }));
    static inativarProduto = executar(async (req) => ({ mensagem: "Produto inativado.", produto: await EstoqueService.inativarProduto(req.params.id) }));
    static listarMovimentacoes = executar((req) => EstoqueService.listarMovimentacoes(req.query));
    static obterMovimentacao = executar((req) => EstoqueService.obterMovimentacao(req.params.id));
    static entrada = executar(async (req) => ({ mensagem: "Entrada registrada.", movimentacao: await EstoqueService.registrarMovimentacao("ENTRADA", req.body, req.usuario) }));
    static saida = executar(async (req) => ({ mensagem: "Saída registrada.", movimentacao: await EstoqueService.registrarMovimentacao("SAIDA", req.body, req.usuario) }));
    static ajuste = executar(async (req) => ({ mensagem: "Ajuste registrado.", movimentacao: await EstoqueService.registrarMovimentacao("AJUSTE", req.body, req.usuario) }));
    static resumo = executar(() => EstoqueService.resumo());
}

export default EstoqueController;
