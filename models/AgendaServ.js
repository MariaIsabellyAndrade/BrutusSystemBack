import AgendaServModel from "./AgendaServSchema.js";
import ServicoModel from "./ServicoSchema.js";

class AgendaServ {

    constructor(idServ, idAgendamento, valorCobrado) {
        this.idAgendamento = idAgendamento;
        this.idServ = idServ;
        this.valorCobrado = valorCobrado;
    }

    async save() {
        const novoAgendaServ = new AgendaServModel({
            Agendamento: this.idAgendamento,
            Servico: this.idServ,
            valorCobrado: this.valorCobrado
        });

        return await novoAgendaServ.save();
    }


    static async buscarServicosDoAgendamento(agendamentoId) {
        return await AgendaServModel
            .find({ Agendamento: agendamentoId })
            .populate("Servico");
    }

    static async calcularDuracaoAgendamento(agendamentoId) {

        const servicosAgendamento =
            await this.buscarServicosDoAgendamento(agendamentoId);

        return servicosAgendamento.reduce((total, item) => {
            return total + Number(item.Servico?.duracao || 0);
        }, 0);
    }

    static async deletarPorAgendamento(agendamentoId) {
        await AgendaServModel.deleteMany({
            Agendamento: agendamentoId
        });
    }

    static async vincularServicos(agendamentoId, servicos) {

        for (const idServico of servicos) {

            const servicoEncontrado =
                await ServicoModel.findById(idServico);

            if (!servicoEncontrado) {
                throw new Error("Serviço não encontrado");
            }

            const agendaServico =
                new AgendaServ(
                    servicoEncontrado._id,
                    agendamentoId,
                    servicoEncontrado.valor
                );

            await agendaServico.save();
        }
    }
}

export default AgendaServ;