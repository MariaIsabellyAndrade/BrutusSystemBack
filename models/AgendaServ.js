import AgendaServModel from "./AgendaServSchema.js";
import ServicoModel from "./ServicoSchema.js";

class AgendaServ{


    constructor(idServ, idAgendamento, valorCobrado){
        this.idAgendamento = idAgendamento; 
        this.idServ = idServ; 
        this.valorCobrado = valorCobrado; 
    }

    async save(){
        const novoAgendaServ = new AgendaServModel({
            Agendamento: this.idAgendamento,
            Servico: this.idServ,
            valorCobrado: this.valorCobrado
        });
        return await novoAgendaServ.save();
    }

    static async deletarPorAgendamento(
    agendamentoId
){

    await AgendaServModel.deleteMany({
        Agendamento: agendamentoId
    });
}




static async vincularServicos(
    agendamentoId,
    servicos
) {

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

}export default AgendaServ; 