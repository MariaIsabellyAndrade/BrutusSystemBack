import AgendamentoModel from "../models/AgendamentoSchema.js";
import AgendaServModel from "../models/AgendaServSchema.js";
import BarbeiroModel from "../models/BarbeiroSchema.js";
import ServicoModel from "../models/ServicoSchema.js";
import PagamentoModel from "../models/PagamentoSchema.js";
import ComissaoModel from "../models/ComissaoSchema.js";

const dataInicioLocal = (data) => data ? new Date(data + "T00:00:00") : null;
const dataFimLocal = (data) => data ? new Date(data + "T23:59:59.999") : null;

class GerencialService {
    async buscar({ barbeiroId, dataInicio, dataFim }) {
        const filtroData = {};
        if (dataInicio) filtroData.$gte = dataInicioLocal(dataInicio);
        if (dataFim) filtroData.$lte = dataFimLocal(dataFim);
        const query = {};
        if (barbeiroId) query.Barbeiro = barbeiroId;
        if (Object.keys(filtroData).length) query.data = filtroData;

        const agendamentos = await AgendamentoModel.find(query)
            .populate("Barbeiro", "nome sobrenome")
            .populate("Cliente", "nome sobrenome")
            .sort({ data: -1, hora: -1 }).lean();
        const agendamentoIds = agendamentos.map((item) => item._id);
        const itensServico = agendamentoIds.length
            ? await AgendaServModel.find({ Agendamento: { $in: agendamentoIds } })
                .populate("Servico", "nome valor duracao +comissaoPercentual").lean()
            : [];

        const confirmados = agendamentos.filter((item) => item.status === "CONFIRMADO");
        const concluidos = agendamentos.filter((item) => item.status === "CONCLUIDO");
        const pendentes = agendamentos.filter((item) => item.status === "PENDENTE");
        const cancelados = agendamentos.filter((item) => item.status === "CANCELADO");
        const totalizar = (lista) => Number(lista.reduce((soma, item) => soma + Number(item.valorTotal || 0), 0).toFixed(2));

        const concluidosIds = new Set(concluidos.map((item) => String(item._id)));
        const servicosMap = new Map();
        for (const item of itensServico) {
            const servico = item.Servico;
            if (!servico) continue;
            const id = String(servico._id);
            if (!concluidosIds.has(String(item.Agendamento))) continue;
            if (!servicosMap.has(id)) servicosMap.set(id, { servicoId: id, nome: servico.nome, quantidade: 0, faturamento: 0 });
            {
                const agregado = servicosMap.get(id);
                agregado.quantidade += 1;
                agregado.faturamento += Number(item.valorCobrado ?? servico.valor ?? 0);
            }
        }
        const servicosMaisRealizados = [...servicosMap.values()]
            .map((item) => ({ ...item, faturamento: Number(item.faturamento.toFixed(2)) }))
            .sort((a, b) => b.quantidade - a.quantidade).slice(0, 8);

        const barbeariaMap = new Map();
        for (const ag of concluidos) {
            const barbeiro = ag.Barbeiro;
            if (!barbeiro) continue;
            const id = String(barbeiro._id);
            if (!barbeariaMap.has(id)) barbeariaMap.set(id, { barbeiroId: id, nome: barbeiro.nome + " " + barbeiro.sobrenome, atendimentos: 0, faturamento: 0 });
            const item = barbeariaMap.get(id);
            item.atendimentos += 1;
            item.faturamento += Number(ag.valorTotal || 0);
        }
        const atendimentosPorBarbeiro = [...barbeariaMap.values()]
            .map((item) => ({ ...item, faturamento: Number(item.faturamento.toFixed(2)) }))
            .sort((a, b) => b.atendimentos - a.atendimentos);

        const agora = new Date();
        const inicioMesAtual = new Date(agora.getFullYear(), agora.getMonth(), 1);
        const inicioComparativo = new Date(agora.getFullYear(), agora.getMonth() - 5, 1);
        const mensalQuery = { ...query, data: { $gte: inicioComparativo, $lte: new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999) } };
        const mensal = await AgendamentoModel.find(mensalQuery).select("data valorTotal status").lean();
        const mesesMap = new Map();
        for (let offset = 5; offset >= 0; offset--) {
            const date = new Date(agora.getFullYear(), agora.getMonth() - offset, 1);
            const chave = String(date.getFullYear()) + "-" + String(date.getMonth() + 1).padStart(2, "0");
            mesesMap.set(chave, { mes: chave, faturamento: 0, agendamentos: 0 });
        }
        for (const item of mensal) {
            if (item.status !== "CONCLUIDO") continue;
            const date = new Date(item.data);
            const chave = String(date.getFullYear()) + "-" + String(date.getMonth() + 1).padStart(2, "0");
            const agregado = mesesMap.get(chave);
            if (agregado) { agregado.faturamento += Number(item.valorTotal || 0); agregado.agendamentos += 1; }
        }

        const inicioProximos = dataInicioLocal(dataInicio) || new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        const filtroProximos = { ...query, data: { $gte: inicioProximos } };
        if (dataFim) filtroProximos.data.$lte = dataFimLocal(dataFim);
        const proximos = await AgendamentoModel.find({ ...filtroProximos, status: { $in: ["PENDENTE", "CONFIRMADO"] } })
            .populate("Barbeiro", "nome sobrenome").populate("Cliente", "nome sobrenome")
            .sort({ data: 1, hora: 1 }).limit(8).lean();

        const filtroComissao = {};
        if (barbeiroId) filtroComissao.Barbeiro = barbeiroId;
        if (Object.keys(filtroData).length) filtroComissao.geradaEm = filtroData;
        const comissoes = await ComissaoModel.find(filtroComissao)
            .populate("Barbeiro", "nome sobrenome").populate("Servico", "nome")
            .sort({ geradaEm: -1 }).limit(100).lean();
        const comissoesResumo = {
            geradas: Number(comissoes.reduce((soma, item) => soma + Number(item.valor || 0), 0).toFixed(2)),
            pagas: Number(comissoes.filter((item) => item.status === "PAGO").reduce((soma, item) => soma + Number(item.valor || 0), 0).toFixed(2)),
            pendentes: Number(comissoes.filter((item) => item.status === "PENDENTE").reduce((soma, item) => soma + Number(item.valor || 0), 0).toFixed(2))
        };

        const idsPagos = new Set([...confirmados, ...concluidos].map((item) => String(item._id)));
        const pagamentos = await PagamentoModel.find({ status: "approved" }).populate("Agendamento", "Barbeiro data").lean();
        const recebido = pagamentos.filter((p) => p.Agendamento && idsPagos.has(String(p.Agendamento._id)) && (!barbeiroId || String(p.Agendamento.Barbeiro) === String(barbeiroId)))
            .reduce((soma, p) => soma + Number(p.valor || 0), 0);

        const barbeirosFiltro = barbeiroId
            ? await BarbeiroModel.find({ _id: barbeiroId }).select("_id nome sobrenome").lean()
            : [];
        const servicosConfig = await ServicoModel.find({ ativo: true }).select("_id nome +comissaoPercentual ativo").sort({ nome: 1 }).lean();

        const nomeMes = (chave) => {
            const [ano, mes] = chave.split("-").map(Number);
            return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
        };
        const inicios = new Date(agora.getFullYear(), agora.getMonth(), 1);
        const concluidosMes = concluidos.filter((item) => new Date(item.data) >= inicios);

        return {
            periodo: { dataInicio: dataInicio || null, dataFim: dataFim || null },
            escopo: barbeiroId ? "individual" : "geral",
            filtroBarbeiro: barbeiroId ? barbeirosFiltro[0] || null : null,
            indicadores: {
                faturamentoConfirmado: totalizar(confirmados),
                faturamentoRealizado: totalizar(concluidos),
                pagamentosRecebidos: Number(recebido.toFixed(2)),
                faturamentoMes: totalizar(concluidosMes),
                agendamentos: agendamentos.length,
                confirmados: confirmados.length,
                concluidos: concluidos.length,
                pendentes: pendentes.length,
                cancelados: cancelados.length,
                taxaCancelamento: agendamentos.length ? Number((cancelados.length * 100 / agendamentos.length).toFixed(1)) : 0,
                valorPendente: totalizar(pendentes)
            },
            comparativoMensal: [...mesesMap.values()].map((item) => ({ ...item, faturamento: Number(item.faturamento.toFixed(2)), rotulo: nomeMes(item.mes) })),
            servicosMaisRealizados,
            atendimentosPorBarbeiro,
            agendamentos: agendamentos.slice(0, 100).map((item) => ({
                id: String(item._id), data: item.data, hora: item.hora, status: item.status,
                barbeiro: item.Barbeiro ? item.Barbeiro.nome + " " + item.Barbeiro.sobrenome : "",
                cliente: item.Cliente ? item.Cliente.nome + " " + item.Cliente.sobrenome : "",
                valor: Number(item.valorTotal || 0),
                servicos: itensServico.filter((entry) => String(entry.Agendamento) === String(item._id) && entry.Servico).map((entry) => entry.Servico.nome)
            })),
            proximosAgendamentos: proximos.map((item) => ({
                id: String(item._id), data: item.data, hora: item.hora, status: item.status,
                barbeiro: item.Barbeiro ? item.Barbeiro.nome + " " + item.Barbeiro.sobrenome : "",
                cliente: item.Cliente ? item.Cliente.nome + " " + item.Cliente.sobrenome : "",
                valor: Number(item.valorTotal || 0)
            })),
            comissoes: comissoesResumo,
            historicoComissoes: comissoes.map((item) => ({
                id: String(item._id), barbeiro: item.Barbeiro ? item.Barbeiro.nome + " " + item.Barbeiro.sobrenome : "",
                servico: item.Servico?.nome || "Serviço", valorBase: item.valorBase, percentual: item.percentual,
                valor: item.valor, status: item.status, geradaEm: item.geradaEm, pagaEm: item.pagaEm
            })),
            servicosComissao: servicosConfig.map((item) => ({ id: String(item._id), nome: item.nome, percentual: Number(item.comissaoPercentual || 0) }))
        };
    }
}

export default new GerencialService();
