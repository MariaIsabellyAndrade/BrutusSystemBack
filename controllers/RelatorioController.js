import RelatorioService from "../services/relatorioService.js";
import Barbeiro from "../models/Barbeiro.js";
import ServicoModel from "../models/ServicoSchema.js";
import ComissaoModel from "../models/ComissaoSchema.js";
import GerencialService from "../services/gerencialService.js";

class RelatorioController {

    static async gerencial(req, res) {
        try {
            const { tipo, id: usuarioId } = req.usuario;
            const { dataInicio, dataFim } = req.query;
            if (tipo !== "ADMIN" && tipo !== "BARBEIRO") return res.status(403).json({ erro: "Acesso negado" });
            if (dataInicio && isNaN(Date.parse(dataInicio)) || dataFim && isNaN(Date.parse(dataFim))) return res.status(400).json({ erro: "Informe datas válidas no formato YYYY-MM-DD" });
            if (dataInicio && dataFim && new Date(dataInicio) > new Date(dataFim)) return res.status(400).json({ erro: "Data inicial posterior à final" });
            let barbeiroId = req.query.barbeiroId || null;
            if (tipo === "BARBEIRO") {
                const barbeiro = await Barbeiro.findOne({ Usuario: usuarioId });
                if (!barbeiro) return res.status(404).json({ erro: "Barbeiro não encontrado" });
                barbeiroId = String(barbeiro._id);
            }
            const dados = await GerencialService.buscar({ barbeiroId, dataInicio, dataFim });
            if (tipo !== "ADMIN") dados.servicosComissao = [];
            return res.json(dados);
        } catch (error) {
            console.error("Erro ao gerar dashboard gerencial:", error);
            return res.status(500).json({ erro: "Erro ao gerar dashboard gerencial" });
        }
    }

    static async atualizarComissaoServico(req, res) {
        try {
            const percentual = Number(req.body?.percentual);
            if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) return res.status(400).json({ erro: "A comissão deve estar entre 0% e 100%" });
            const servico = await ServicoModel.findByIdAndUpdate(req.params.servicoId, { comissaoPercentual: percentual }, { new: true });
            if (!servico) return res.status(404).json({ erro: "Serviço não encontrado" });
            return res.json({ id: String(servico._id), nome: servico.nome, percentual: servico.comissaoPercentual });
        } catch (error) {
            console.error("Erro ao atualizar comissão:", error);
            return res.status(500).json({ erro: "Erro ao atualizar comissão" });
        }
    }

    static async marcarComissaoPaga(req, res) {
        try {
            const comissao = await ComissaoModel.findByIdAndUpdate(req.params.comissaoId, { status: "PAGO", pagaEm: new Date() }, { new: true });
            if (!comissao) return res.status(404).json({ erro: "Comissão não encontrada" });
            return res.json({ id: String(comissao._id), status: comissao.status, pagaEm: comissao.pagaEm });
        } catch (error) {
            console.error("Erro ao registrar pagamento da comissão:", error);
            return res.status(500).json({ erro: "Erro ao registrar pagamento da comissão" });
        }
    }


    /**
     * GET /relatorio/financeiro
     *
     * ADMIN  → pode informar ?barbeiroId= para filtrar um barbeiro.
     *          Se não informar, retorna dados de todos os barbeiros + ranking.
     *
     * BARBEIRO → o barbeiroId NUNCA vem do request. É resolvido pelo
     *            usuário autenticado no token para garantir isolamento.
     */
    static async financeiro(req, res) {
        try {
            const { tipo, id: usuarioId } = req.usuario;
            const { dataInicio, dataFim } = req.query;

            // ==================================================
            // VALIDAÇÃO DE PERÍODO
            // ==================================================

            if (dataInicio && isNaN(Date.parse(dataInicio))) {
                return res.status(400).json({
                    erro: "dataInicio inválida. Use o formato YYYY-MM-DD"
                });
            }

            if (dataFim && isNaN(Date.parse(dataFim))) {
                return res.status(400).json({
                    erro: "dataFim inválida. Use o formato YYYY-MM-DD"
                });
            }

            if (dataInicio && dataFim && new Date(dataInicio) > new Date(dataFim)) {
                return res.status(400).json({
                    erro: "dataInicio não pode ser posterior a dataFim"
                });
            }

            // ==================================================
            // BARBEIRO – acessa apenas seus próprios dados
            // ==================================================

            if (tipo === "BARBEIRO") {
                // Resolve o barbeiroId pelo usuário autenticado no token
                const barbeiro = await Barbeiro.findOne({ Usuario: usuarioId });

                if (!barbeiro) {
                    return res.status(404).json({
                        erro: "Barbeiro não encontrado para o usuário autenticado"
                    });
                }

                const dados = await RelatorioService.relatorioIndividual(
                    barbeiro._id.toString(),
                    dataInicio,
                    dataFim
                );

                return res.status(200).json({
                    tipo: "individual",
                    barbeiro: {
                        id: barbeiro._id,
                        nome: `${barbeiro.nome} ${barbeiro.sobrenome}`
                    },
                    ...dados
                });
            }

            // ==================================================
            // ADMIN – pode filtrar por barbeiro ou ver todos
            // ==================================================

            if (tipo === "ADMIN") {
                const { barbeiroId } = req.query;

                // Filtro por barbeiro específico
                if (barbeiroId) {
                    const barbeiro = await Barbeiro.findById(barbeiroId);

                    if (!barbeiro) {
                        return res.status(404).json({
                            erro: "Barbeiro não encontrado"
                        });
                    }

                    const dados = await RelatorioService.relatorioIndividual(
                        barbeiroId,
                        dataInicio,
                        dataFim
                    );

                    return res.status(200).json({
                        tipo: "individual",
                        barbeiro: {
                            id: barbeiro._id,
                            nome: `${barbeiro.nome} ${barbeiro.sobrenome}`
                        },
                        ...dados
                    });
                }

                // Sem filtro → dados consolidados de todos os barbeiros
                const dados = await RelatorioService.relatorioGeral(
                    dataInicio,
                    dataFim
                );

                return res.status(200).json({
                    tipo: "geral",
                    ...dados
                });
            }

            // Outros tipos de usuário não têm acesso
            return res.status(403).json({
                erro: "Acesso negado. Apenas ADMIN e BARBEIRO podem acessar relatórios financeiros"
            });

        } catch (error) {
            console.error("Erro ao gerar relatório financeiro:", error);
            return res.status(error.status || 500).json({
                erro: error.message || "Erro ao gerar relatório financeiro"
            });
        }
    }
}

export default RelatorioController;
