import mongoose from "mongoose";
import ProdutoEstoque from "../models/ProdutoEstoqueSchema.js";
import MovimentacaoEstoque from "../models/MovimentacaoEstoqueSchema.js";

const erro = (status, message) => Object.assign(new Error(message), { status });
const numeroValido = (value) => (typeof value === "number" || (typeof value === "string" && value.trim() !== "")) && Number.isFinite(Number(value)) && Number(value) >= 0;
const idValido = (id) => mongoose.isValidObjectId(id);

class EstoqueService {
    async listarProdutos(usuario, filtros = {}) {
        const admin = usuario.tipo === "ADMIN";
        const query = {};
        if (!admin) query.ativo = true;
        else if (filtros.ativo === "true") query.ativo = true;
        else if (filtros.ativo === "false") query.ativo = false;
        if (filtros.categoria) query.categoria = filtros.categoria;
        if (["USO_INTERNO", "REVENDA"].includes(filtros.tipoProduto)) query.tipoProduto = filtros.tipoProduto;
        if (filtros.busca) query.nome = { $regex: String(filtros.busca).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
        const situacao = filtros.situacao;
        if (situacao === "sem-estoque") query.quantidade = 0;
        if (situacao === "baixo") query.$expr = { $and: [{ $gt: ["$quantidade", 0] }, { $lte: ["$quantidade", "$estoqueMinimo"] }] };
        if (situacao === "normal") query.$expr = { $gt: ["$quantidade", "$estoqueMinimo"] };
        const page = Math.max(1, Number.parseInt(filtros.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(filtros.limit, 10) || 50));
        const consultaProdutos = ProdutoEstoque.find(query).sort({ nome: 1 }).skip((page - 1) * limit).limit(limit);
        if (!admin) consultaProdutos.select("-precoCusto -precoRevenda -fornecedor");
        const [items, total, categorias] = await Promise.all([
            consultaProdutos.lean(),
            ProdutoEstoque.countDocuments(query),
            ProdutoEstoque.distinct("categoria", admin ? {} : { ativo: true }),
        ]);
        return { items, total, page, totalPages: Math.ceil(total / limit), categorias: categorias.sort((a, b) => a.localeCompare(b, "pt-BR")) };
    }

    async obterProduto(id, usuario) {
        if (!idValido(id)) throw erro(400, "Identificador de produto inválido.");
        const query = { _id: id };
        if (usuario.tipo !== "ADMIN") query.ativo = true;
        const consultaProduto = ProdutoEstoque.findOne(query);
        if (usuario.tipo !== "ADMIN") consultaProduto.select("-precoCusto -precoRevenda -fornecedor");
        const produto = await consultaProduto.lean();
        if (!produto) throw erro(404, "Produto não encontrado.");
        return produto;
    }

    validarProduto(dados = {}) {
        dados = dados || {};
        const nome = String(dados.nome || "").trim();
        const categoria = String(dados.categoria || "").trim();
        const fornecedor = String(dados.fornecedor || "").trim();
        const tipoProduto = dados.tipoProduto;
        const precoRevendaInformado = dados.precoRevenda;
        const precoRevenda = precoRevendaInformado === undefined || precoRevendaInformado === null || precoRevendaInformado === "" ? 0 : Number(precoRevendaInformado);
        if (!nome || !categoria || !fornecedor) throw erro(400, "Nome, categoria e fornecedor são obrigatórios.");
        if (!numeroValido(dados.precoCusto) || !numeroValido(dados.estoqueMinimo)) throw erro(400, "Preço de custo e estoque mínimo devem ser números não negativos.");
        if (!numeroValido(precoRevenda)) throw erro(400, "Preço de revenda deve ser um valor não negativo.");
        if (tipoProduto === "REVENDA" && precoRevenda <= 0) throw erro(400, "Informe um preço de revenda maior que zero para produtos destinados à revenda.");
        if (!( ["USO_INTERNO", "REVENDA"].includes(tipoProduto))) throw erro(400, "Tipo de produto inválido.");
        return { nome, nomeNormalizado: nome.toLocaleLowerCase("pt-BR"), descricao: String(dados.descricao || "").trim(), categoria, fornecedor, precoCusto: Number(dados.precoCusto), precoRevenda, estoqueMinimo: Number(dados.estoqueMinimo), tipoProduto };
    }

    async criarProduto(dados) {
        dados = dados || {};
        const produto = this.validarProduto(dados);
        if (dados.quantidade !== undefined && (!numeroValido(dados.quantidade) || Number(dados.quantidade) !== 0)) throw erro(400, "O estoque inicial deve ser registrado como uma movimentação de entrada.");
        try {
            return await ProdutoEstoque.create(produto);
        } catch (error) {
            if (error.code === 11000) throw erro(409, "Já existe um produto com esse nome.");
            if (error.name === "ValidationError") throw erro(400, error.message);
            throw error;
        }
    }

    async atualizarProduto(id, dados) {
        if (!dados || typeof dados !== "object") throw erro(400, "Dados do produto inválidos.");
        if (!idValido(id)) throw erro(400, "Identificador de produto inválido.");
        if (Object.hasOwn(dados, "quantidade") || Object.hasOwn(dados, "estoque")) throw erro(400, "Altere o estoque pela tela de movimentações.");
        const atualizado = this.validarProduto(dados);
        try {
            const produto = await ProdutoEstoque.findByIdAndUpdate(id, { $set: atualizado }, { new: true, runValidators: true });
            if (!produto) throw erro(404, "Produto não encontrado.");
            return produto;
        } catch (error) {
            if (error.code === 11000) throw erro(409, "Já existe um produto com esse nome.");
            if (error.name === "ValidationError") throw erro(400, error.message);
            throw error;
        }
    }

    async inativarProduto(id) {
        if (!idValido(id)) throw erro(400, "Identificador de produto inválido.");
        const produto = await ProdutoEstoque.findByIdAndUpdate(id, { $set: { ativo: false } }, { new: true });
        if (!produto) throw erro(404, "Produto não encontrado.");
        return produto;
    }

    async registrarMovimentacao(tipo, dados, usuario) {
        dados = dados || {};
        if (tipo !== "SAIDA" && usuario.tipo !== "ADMIN") throw erro(403, "Barbeiros podem registrar somente saídas de estoque.");
        if (!idValido(dados.produtoId)) throw erro(400, "Selecione um produto válido.");
        const motivo = String(dados.motivo || "").trim();
        if (!motivo) throw erro(400, "Informe o motivo da movimentação.");
        if (tipo === "AJUSTE" && motivo.length < 5) throw erro(400, "A justificativa do ajuste deve ter ao menos 5 caracteres.");
        if (!numeroValido(dados.quantidade)) throw erro(400, "Informe uma quantidade válida.");
        const valor = Number(dados.quantidade);
        if ((tipo === "ENTRADA" || tipo === "SAIDA") && (!Number.isInteger(valor) || valor <= 0)) throw erro(400, "A quantidade deve ser um número inteiro maior que zero.");
        if (tipo === "AJUSTE" && !Number.isInteger(valor)) throw erro(400, "O estoque resultante deve ser um número inteiro.");

        const session = await mongoose.startSession();
        let movimento;
        try {
            await session.withTransaction(async () => {
                const produto = await ProdutoEstoque.findById(dados.produtoId).session(session);
                if (!produto) throw erro(404, "Produto não encontrado.");
                if (!produto.ativo) throw erro(409, "Não é possível movimentar um produto inativo.");
                const anterior = produto.quantidade;
                let resultante;
                if (tipo === "ENTRADA") resultante = anterior + valor;
                else if (tipo === "SAIDA") {
                    if (valor > anterior) throw erro(409, "A saída é maior que a quantidade disponível.");
                    resultante = anterior - valor;
                } else resultante = valor;
                produto.quantidade = resultante;
                await produto.save({ session });
                [movimento] = await MovimentacaoEstoque.create([{
                    produto: produto._id, tipo,
                    quantidade: tipo === "AJUSTE" ? Math.abs(resultante - anterior) : valor,
                    estoqueAnterior: anterior, estoqueResultante: resultante,
                    motivo, responsavel: usuario.id, tipoResponsavel: usuario.tipo,
                }], { session });
            });
            return movimento;
        } finally {
            await session.endSession();
        }
    }

    async listarMovimentacoes(filtros = {}) {
        const query = {};
        if (filtros.produtoId) {
            if (!idValido(filtros.produtoId)) throw erro(400, "Produto inválido.");
            query.produto = filtros.produtoId;
        }
        if (["ENTRADA", "SAIDA", "AJUSTE"].includes(filtros.tipo)) query.tipo = filtros.tipo;
        const de = filtros.dataInicio ? new Date(`${filtros.dataInicio}T00:00:00`) : null;
        const ate = filtros.dataFim ? new Date(`${filtros.dataFim}T23:59:59.999`) : null;
        if (de && Number.isNaN(de.getTime()) || ate && Number.isNaN(ate.getTime())) throw erro(400, "Período inválido.");
        if (de || ate) query.createdAt = { ...(de ? { $gte: de } : {}), ...(ate ? { $lte: ate } : {}) };
        const page = Math.max(1, Number.parseInt(filtros.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(filtros.limit, 10) || 50));
        const [items, total] = await Promise.all([
            MovimentacaoEstoque.find(query).populate("produto", "nome categoria tipoProduto").populate("responsavel", "email tipo").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            MovimentacaoEstoque.countDocuments(query),
        ]);
        return { items, total, page, totalPages: Math.ceil(total / limit) };
    }

    async obterMovimentacao(id) {
        if (!idValido(id)) throw erro(400, "Identificador de movimentação inválido.");
        const item = await MovimentacaoEstoque.findById(id).populate("produto", "nome categoria tipoProduto").populate("responsavel", "email tipo").lean();
        if (!item) throw erro(404, "Movimentação não encontrada.");
        return item;
    }

    async resumo() {
        const [ativos, baixo, semEstoque, recentes] = await Promise.all([
            ProdutoEstoque.countDocuments({ ativo: true }),
            ProdutoEstoque.countDocuments({ ativo: true, $expr: { $and: [{ $gt: ["$quantidade", 0] }, { $lte: ["$quantidade", "$estoqueMinimo"] }] } }),
            ProdutoEstoque.countDocuments({ ativo: true, quantidade: 0 }),
            MovimentacaoEstoque.find().populate("produto", "nome").populate("responsavel", "email tipo").sort({ createdAt: -1 }).limit(8).lean(),
        ]);
        return { produtosAtivos: ativos, estoqueBaixo: baixo, semEstoque, movimentacoesRecentes: recentes };
    }
}

export default new EstoqueService();






