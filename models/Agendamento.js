import AgendamentoModel from "./AgendamentoSchema.js";
import AgendaServ from "./AgendaServ.js";
class Agendamento{
        constructor(Usuario, Cliente, Barbeiro, data, hora, status, valorTotal){
            this.Usuario = Usuario; 
            this.Cliente = Cliente; 
            this.Barbeiro = Barbeiro; 
            this.data = data;
            this.hora= hora; 
            this.status = status;
            this.valorTotal = valorTotal;
        }

                async save(){
                    const novoAgendamento = new AgendamentoModel({
                        Usuario: this.Usuario,
                        Cliente: this.Cliente,
                        Barbeiro: this.Barbeiro, 
                        data: this.data, 
                        hora: this.hora, 
                        status: this.status,
                        valorTotal: this.valorTotal
                    });
                    return await novoAgendamento.save();
                }
    

        static async verificarHorario(barbeiroId, data, hora) {
            return await AgendamentoModel.findOne({
                Barbeiro: barbeiroId,
                data: data,
                hora: hora,
                status: {
                    $in: ["CONFIRMADO","CANCELADO","PENDENTE"]
                }
            });
        }

        static async findAgendamentosPorBarbeiroEData(barbeiroId, data) {
            const inicioDia = new Date(`${data}T00:00:00`);
            const fimDia = new Date(`${data}T23:59:59.999`);

            return await AgendamentoModel.find({
                Barbeiro: barbeiroId,
                data: {
                    $gte: inicioDia,
                    $lte: fimDia
                },
                status: {
                    $in: ["CONFIRMADO","PENDENTE"]
                }
            });
        }

                static async findAll() {
                    return await AgendamentoModel.find();
                }
            
                static async findById(id) {
                    return await AgendamentoModel.findById(id);
                }
            

                static async update(id, dadosAtualizados) {
                    return await AgendamentoModel.findByIdAndUpdate(id, dadosAtualizados, { new: true });
                }
            
                static async delete(id) 
                {
                    return await AgendamentoModel.findByIdAndDelete(id);
                }
                static async findPorBarbeiro(barbeiroId) {
                    return await AgendamentoModel.find({
                        Barbeiro: barbeiroId
                    });
                }

                static async findPorBarbeiroEData(barbeiroId, data) {

                    const inicioDia = new Date(data);
                    inicioDia.setHours(0, 0, 0, 0);

                    const fimDia = new Date(data);
                    fimDia.setHours(23, 59, 59, 999);

                    return await AgendamentoModel.find({
                        Barbeiro: barbeiroId,
                        data: {
                            $gte: inicioDia,
                            $lte: fimDia
                        }
                    });
                }


                static async buscarIndicadoresPorBarbeiro(barbeiroId) {
                    const agendamentos = await AgendamentoModel.find({
                        Barbeiro: barbeiroId
                    });

                    const total = agendamentos.length;

                    const cancelados = agendamentos.filter(
                        agendamento => agendamento.status === "CANCELADO"
                    ).length;

                    const pendentes = agendamentos.filter(
                        agendamento => agendamento.status === "Pendente"
                    ).length;

                    const agendados = agendamentos.filter(
                        agendamento => agendamento.status === "Agendado"
                    ).length;

                    const concluidos = agendamentos.filter(
                        agendamento => agendamento.status === "Concluido"
                    ).length;

                    const taxaCancelamento = total > 0
                        ? (cancelados / total) * 100
                        : 0;

           
          

             

                    const agendamentosComValor = agendamentos.filter(
                        agendamento =>
                            agendamento.valorTotal !== undefined &&
                            agendamento.valorTotal !== null
                    );

                    const valorTotal = agendamentosComValor.reduce(
                        (total, agendamento) =>
                            total + Number(agendamento.valorTotal || 0),
                        0
                    );


                    return {
                        total,
                        concluidos,
                        cancelados,
                        pendentes,
                        agendados,
                        taxaCancelamento: Number(taxaCancelamento.toFixed(2))
                    };
                }


static async buscarFaturamentoPorBarbeiro(barbeiroId, dataInicio, dataFim) {
    const filtro = {
        Barbeiro: barbeiroId
    };

    // Filtro opcional por período
    if (dataInicio || dataFim) {
        filtro.data = {};

        if (dataInicio) {
            const inicio = new Date(dataInicio);
            inicio.setHours(0, 0, 0, 0);
            filtro.data.$gte = inicio;
        }

        if (dataFim) {
            const fim = new Date(dataFim);
            fim.setHours(23, 59, 59, 999);
            filtro.data.$lte = fim;
        }
    }

    const agendamentos = await AgendamentoModel.find(filtro);

    // Cancelados não entram no faturamento
    const agendamentosValidos = agendamentos.filter(
        agendamento => agendamento.status !== "CANCELADO"
    );

    // =========================
    // FATURAMENTO TOTAL
    // =========================

    const faturamentoTotal = agendamentosValidos.reduce(
        (total, agendamento) =>
            total + Number(agendamento.valorTotal || 0),
        0
    );

    // =========================
    // HOJE
    // =========================

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const fimHoje = new Date(hoje);
    fimHoje.setHours(23, 59, 59, 999);

    const faturamentoHoje = agendamentosValidos
        .filter(agendamento => {
            const data = new Date(agendamento.data);

            return data >= hoje && data <= fimHoje;
        })
        .reduce(
            (total, agendamento) =>
                total + Number(agendamento.valorTotal || 0),
            0
        );

    // =========================
    // SEMANA
    // =========================

    const inicioSemana = new Date();
    const diaSemana = inicioSemana.getDay();

    const diferenca = diaSemana === 0
        ? 6
        : diaSemana - 1;

    inicioSemana.setDate(
        inicioSemana.getDate() - diferenca
    );

    inicioSemana.setHours(0, 0, 0, 0);

    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(fimSemana.getDate() + 6);
    fimSemana.setHours(23, 59, 59, 999);

    const faturamentoSemana = agendamentosValidos
        .filter(agendamento => {
            const data = new Date(agendamento.data);

            return data >= inicioSemana && data <= fimSemana;
        })
        .reduce(
            (total, agendamento) =>
                total + Number(agendamento.valorTotal || 0),
            0
        );

    // =========================
    // MÊS
    // =========================

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const fimMes = new Date(
        inicioMes.getFullYear(),
        inicioMes.getMonth() + 1,
        0
    );

    fimMes.setHours(23, 59, 59, 999);

    const faturamentoMes = agendamentosValidos
        .filter(agendamento => {
            const data = new Date(agendamento.data);

            return data >= inicioMes && data <= fimMes;
        })
        .reduce(
            (total, agendamento) =>
                total + Number(agendamento.valorTotal || 0),
            0
        );

    // =========================
    // GRÁFICO
    // =========================

    const graficoMap = {};

    agendamentosValidos.forEach(agendamento => {
        const data = new Date(agendamento.data);

        const dataFormatada =
            data.toISOString().split("T")[0];

        if (!graficoMap[dataFormatada]) {
            graficoMap[dataFormatada] = 0;
        }

        graficoMap[dataFormatada] += Number(
            agendamento.valorTotal || 0
        );
    });

    const grafico = Object.entries(graficoMap)
        .sort(([dataA], [dataB]) =>
            dataA.localeCompare(dataB)
        )
        .map(([data, valor]) => ({
            data,
            valor: Number(valor.toFixed(2))
        }));

    return {
        barbeiroId,

        faturamento: {
            hoje: Number(faturamentoHoje.toFixed(2)),
            semana: Number(faturamentoSemana.toFixed(2)),
            mes: Number(faturamentoMes.toFixed(2)),
            total: Number(faturamentoTotal.toFixed(2))
        },

        grafico
    };
}


static async findPorCliente(clienteId) {
    const agendamentos = await AgendamentoModel.find({
        Cliente: clienteId
    })
    .populate("Cliente", "nome sobrenome telefone email foto")
    .populate("Barbeiro", "nome sobrenome foto telefone")
    .lean();

    for (const agendamento of agendamentos) {
        agendamento.Servicos =
            await AgendaServ.buscarServicosDoAgendamento(agendamento._id);
    }

    return agendamentos;
}

}export default Agendamento; 