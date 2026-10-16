import AgendamentoModel from "../models/AgendamentoSchema.js";
import BarbeiroModel from "../models/BarbeiroSchema.js";

/**
 * BRUTUS SYSTEM – RelatorioService
 *
 * REGRAS FINANCEIRAS APLICADAS:
 * ─────────────────────────────
 * • CONFIRMADO  → sinal pago (R$15 via MP). O valorTotal registrado no
 *                 agendamento é o valor total dos serviços.
 *                 Para "receita recebida" usamos o valorTotal do
 *                 agendamento CONFIRMADO (o cliente pagou o sinal e
 *                 compareceu; o valor total é a referência correta).
 *
 * • PENDENTE    → sinal gerado mas não pago. Não é receita ainda.
 *                 Aparece como "valor pendente".
 *
 * • CANCELADO   → nunca entra nos cálculos de faturamento.
 *
 * LIMITAÇÃO CONHECIDA: O restante do pagamento (valor total menos R$15)
 * não é rastreado no banco após o atendimento. O valorTotal do
 * agendamento representa o valor total previsto dos serviços.
 */
class RelatorioService {

    // ================================================================
    // HELPERS PRIVADOS
    // ================================================================

    /**
     * Monta o filtro de data para query MongoDB.
     * @param {string|undefined} dataInicio  YYYY-MM-DD
     * @param {string|undefined} dataFim     YYYY-MM-DD
     */
    _filtroData(dataInicio, dataFim) {
        if (!dataInicio && !dataFim) return {};

        const filtro = {};

        if (dataInicio) {
            const inicio = new Date(dataInicio);
            inicio.setHours(0, 0, 0, 0);
            filtro.$gte = inicio;
        }

        if (dataFim) {
            const fim = new Date(dataFim);
            fim.setHours(23, 59, 59, 999);
            filtro.$lte = fim;
        }

        return filtro;
    }

    /**
     * Gera o agrupamento por data (YYYY-MM-DD) para o gráfico.
     * @param {Array} agendamentos
     * @param {string} status  'CONFIRMADO' | 'PENDENTE' | null (todos)
     */
    _agruparPorData(agendamentos, status = null) {
        const mapa = {};

        const lista = status
            ? agendamentos.filter(a => a.status === status)
            : agendamentos;

        lista.forEach(ag => {
            const chave = new Date(ag.data)
                .toISOString()
                .split("T")[0];

            if (!mapa[chave]) mapa[chave] = 0;
            mapa[chave] += Number(ag.valorTotal || 0);
        });

        return Object.entries(mapa)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([data, valor]) => ({
                data,
                valor: Number(valor.toFixed(2))
            }));
    }

    /**
     * Calcula indicadores a partir de uma lista de agendamentos.
     * @param {Array} agendamentos
     */
    _calcularIndicadores(agendamentos) {
        const confirmados = agendamentos.filter(a => a.status === "CONFIRMADO");
        const pendentes   = agendamentos.filter(a => a.status === "PENDENTE");
        const cancelados  = agendamentos.filter(a => a.status === "CANCELADO");

        // Receita efetivamente recebida: agendamentos CONFIRMADOS
        const receitaRecebida = confirmados.reduce(
            (acc, a) => acc + Number(a.valorTotal || 0),
            0
        );

        // Valor pendente: agendamentos PENDENTES (sinal não pago)
        const valorPendente = pendentes.reduce(
            (acc, a) => acc + Number(a.valorTotal || 0),
            0
        );

        // Valor total previsto (confirmados + pendentes)
        const valorTotalPrevisto = receitaRecebida + valorPendente;

        const total = agendamentos.length;
        const taxaCancelamento = total > 0
            ? Number(((cancelados.length / total) * 100).toFixed(2))
            : 0;

        return {
            quantidades: {
                total,
                confirmados: confirmados.length,
                pendentes: pendentes.length,
                cancelados: cancelados.length
            },
            financeiro: {
                receitaRecebida:    Number(receitaRecebida.toFixed(2)),
                valorPendente:      Number(valorPendente.toFixed(2)),
                valorTotalPrevisto: Number(valorTotalPrevisto.toFixed(2))
            },
            taxaCancelamento
        };
    }

    /**
     * Calcula indicadores por período (hoje, semana, mês).
     * @param {Array} confirmados  Agendamentos com status CONFIRMADO
     */
    _faturamentoPorPeriodo(confirmados) {
        const agora = new Date();

        // ─── HOJE ────────────────────────────────────────────
        const inicioHoje = new Date(agora);
        inicioHoje.setHours(0, 0, 0, 0);

        const fimHoje = new Date(agora);
        fimHoje.setHours(23, 59, 59, 999);

        // ─── SEMANA (segunda-feira) ───────────────────────────
        const inicioSemana = new Date(agora);
        const diaSemana = inicioSemana.getDay();
        const diff = diaSemana === 0 ? 6 : diaSemana - 1;
        inicioSemana.setDate(inicioSemana.getDate() - diff);
        inicioSemana.setHours(0, 0, 0, 0);

        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(fimSemana.getDate() + 6);
        fimSemana.setHours(23, 59, 59, 999);

        // ─── MÊS ─────────────────────────────────────────────
        const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
        inicioMes.setHours(0, 0, 0, 0);

        const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
        fimMes.setHours(23, 59, 59, 999);

        const somarNoIntervalo = (inicio, fim) =>
            confirmados
                .filter(a => {
                    const d = new Date(a.data);
                    return d >= inicio && d <= fim;
                })
                .reduce((acc, a) => acc + Number(a.valorTotal || 0), 0);

        return {
            hoje:   Number(somarNoIntervalo(inicioHoje, fimHoje).toFixed(2)),
            semana: Number(somarNoIntervalo(inicioSemana, fimSemana).toFixed(2)),
            mes:    Number(somarNoIntervalo(inicioMes, fimMes).toFixed(2))
        };
    }


    // ================================================================
    // RELATÓRIO INDIVIDUAL (BARBEIRO ou ADMIN com filtro por barbeiro)
    // ================================================================

    async relatorioIndividual(barbeiroId, dataInicio, dataFim) {

        const filtroData = this._filtroData(dataInicio, dataFim);

        const query = { Barbeiro: barbeiroId };
        if (Object.keys(filtroData).length) {
            query.data = filtroData;
        }

        const agendamentos = await AgendamentoModel.find(query).lean();

        const indicadores = this._calcularIndicadores(agendamentos);

        const confirmados = agendamentos.filter(a => a.status === "CONFIRMADO");
        const periodos    = this._faturamentoPorPeriodo(confirmados);
        const grafico     = this._agruparPorData(agendamentos, "CONFIRMADO");

        return {
            periodo: { dataInicio: dataInicio || null, dataFim: dataFim || null },
            indicadores,
            periodos,
            grafico
        };
    }


    // ================================================================
    // RELATÓRIO GERAL (ADMIN sem filtro de barbeiro)
    // ================================================================

    async relatorioGeral(dataInicio, dataFim) {

        const filtroData = this._filtroData(dataInicio, dataFim);

        const query = {};
        if (Object.keys(filtroData).length) {
            query.data = filtroData;
        }

        const agendamentos = await AgendamentoModel.find(query).lean();
        const barbeiros    = await BarbeiroModel.find({}).lean();

        // ─── INDICADORES GLOBAIS ─────────────────────────────
        const indicadoresGlobais = this._calcularIndicadores(agendamentos);

        const confirmadosGlobal = agendamentos.filter(a => a.status === "CONFIRMADO");
        const periodosGlobais   = this._faturamentoPorPeriodo(confirmadosGlobal);
        const graficoGlobal     = this._agruparPorData(agendamentos, "CONFIRMADO");

        // ─── RANKING POR BARBEIRO ────────────────────────────
        const rankingMap = {};

        agendamentos.forEach(ag => {
            const bId = ag.Barbeiro?.toString();
            if (!bId) return;

            if (!rankingMap[bId]) {
                rankingMap[bId] = {
                    barbeiroId: bId,
                    confirmados: 0,
                    pendentes: 0,
                    cancelados: 0,
                    receitaRecebida: 0,
                    valorPendente: 0
                };
            }

            if (ag.status === "CONFIRMADO") {
                rankingMap[bId].confirmados++;
                rankingMap[bId].receitaRecebida += Number(ag.valorTotal || 0);
            } else if (ag.status === "PENDENTE") {
                rankingMap[bId].pendentes++;
                rankingMap[bId].valorPendente += Number(ag.valorTotal || 0);
            } else if (ag.status === "CANCELADO") {
                rankingMap[bId].cancelados++;
            }
        });

        // Enriquece com nome do barbeiro e ordena por receita recebida
        const ranking = Object.values(rankingMap)
            .map(item => {
                const b = barbeiros.find(
                    barb => barb._id.toString() === item.barbeiroId
                );
                return {
                    barbeiroId: item.barbeiroId,
                    nome: b ? `${b.nome} ${b.sobrenome}` : "Desconhecido",
                    foto: b?.foto || null,
                    confirmados: item.confirmados,
                    pendentes: item.pendentes,
                    cancelados: item.cancelados,
                    receitaRecebida: Number(item.receitaRecebida.toFixed(2)),
                    valorPendente:   Number(item.valorPendente.toFixed(2))
                };
            })
            .sort((a, b) => b.receitaRecebida - a.receitaRecebida);

        // Inclui barbeiros sem agendamentos no período
        barbeiros.forEach(b => {
            const existe = ranking.some(r => r.barbeiroId === b._id.toString());
            if (!existe) {
                ranking.push({
                    barbeiroId: b._id.toString(),
                    nome: `${b.nome} ${b.sobrenome}`,
                    foto: b.foto || null,
                    confirmados: 0,
                    pendentes: 0,
                    cancelados: 0,
                    receitaRecebida: 0,
                    valorPendente: 0
                });
            }
        });

        return {
            periodo: { dataInicio: dataInicio || null, dataFim: dataFim || null },
            indicadoresGlobais,
            periodosGlobais,
            graficoGlobal,
            ranking
        };
    }
}

export default new RelatorioService();
