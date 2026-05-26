import Agendamento from "../models/Agendamento.js";
import Cliente from "../models/Cliente.js";
import Barbeiro from "../models/Barbeiro.js";
import Servico from "../models/Servico.js";
import AgendaServ from "../models/AgendaServ.js";
import Pagamento from "../models/Pagamento.js";
import Usuario from "../models/Usuario.js";
import client from "../config/mercadoPago.js";
import { Payment } from "mercadopago";

class AgendamentoService {

async criarAgendamento({
    usuarioId,
    tipoUsuario,
    clienteBody,
    barbeiroBody,
    servicos,
    data,
    hora
}) {

    let clienteId;
    let barbeiroId;


    if (tipoUsuario === "CLIENTE") {

        const clienteEncontrado =
            await Cliente.findOne({ Usuario: usuarioId });

        if (!clienteEncontrado) {
            throw {
                status: 404,
                message: "Cliente não encontrado"
            };
        }

        clienteId = clienteEncontrado._id;
        barbeiroId = barbeiroBody;
    }


    else if (tipoUsuario === "BARBEIRO") {

        const barbeiroEncontrado =
            await Barbeiro.findOne({ Usuario: usuarioId });

        if (!barbeiroEncontrado) {
            throw {
                status: 404,
                message: "Barbeiro não encontrado"
            };
        }

        barbeiroId = barbeiroEncontrado._id;
        clienteId = clienteBody;
    }


    this.validarHorarioFuncionamento(data, hora);


    const servicosEncontrados =
        await Servico.buscarPorIds(servicos);

    const duracaoTotal =
        servicosEncontrados.reduce(
            (total, servico) =>
                total + Number(servico.duracao),
            0
        );

    const inicioNovo =
        new Date(`${data}T${hora}:00`);

    const fimNovo =
        new Date(inicioNovo);

    fimNovo.setMinutes(
        fimNovo.getMinutes() + duracaoTotal
    );


    const agendamentosDia =
        await Agendamento.findPorBarbeiroEData(
            barbeiroId,
            data
        );


for (const agendamento of agendamentosDia) {

    const duracaoExistente =
        await AgendaServ.calcularDuracaoAgendamento(
            agendamento._id
        );

    const inicioExistente =
        new Date(`${data}T${agendamento.hora}:00`);

    const fimExistente =
        new Date(inicioExistente);

    fimExistente.setMinutes(
        fimExistente.getMinutes() + duracaoExistente
    );

    const conflito =
        inicioNovo < fimExistente &&
        fimNovo > inicioExistente;

    if (conflito) {
        throw {
            status: 400,
            message: "Já existe um agendamento nesse intervalo de horário"
        };
    }
}


    const valorTotal =
        await Servico.calcularValorTotal(servicos);

    const usuario =
        await Usuario.findById(usuarioId);

    if (!usuario) {
        throw {
            status: 404,
            message: "Usuário não encontrado"
        };
    }

    const payment = new Payment(client);

    const pagamentoPix =
        await payment.create({
            body: {
                transaction_amount: 15,
                description: "Sinal do agendamento",
                payment_method_id: "pix",
                payer: {
                    email: usuario.email,
                    first_name: usuario.nome
                }
            }
        });

 
    const novoAgendamento =
        new Agendamento(
            usuarioId,
            clienteId,
            barbeiroId,
            data,
            hora,
            "Pendente",
            valorTotal
        );

    const resultado =
        await novoAgendamento.save();


    try {
        await AgendaServ.vincularServicos(
            resultado._id,
            servicos
        );
    } catch (error) {

        await AgendaServ.deletarPorAgendamento(
            resultado._id
        );

        await Agendamento.delete(resultado._id);

        throw error;
    }


    const novoPagamento =
        new Pagamento(
            resultado._id,
            pagamentoPix.status,
            pagamentoPix
                .point_of_interaction
                .transaction_data
                .qr_code,
            15,
            pagamentoPix.id.toString(),
            new Date()
        );

    const pagamentoSalvo =
        await novoPagamento.save();

 
    return {
        agendamento: resultado,
        pagamento: {
            id: pagamentoSalvo._id,
            status: pagamentoSalvo.status,
            paymentId: pagamentoSalvo.paymentId,
            qrCode:
                pagamentoPix
                    .point_of_interaction
                    .transaction_data
                    .qr_code,
            qrCodeBase64:
                pagamentoPix
                    .point_of_interaction
                    .transaction_data
                    .qr_code_base64
        }
    };
}

   async cancelarAgendamento(agendamentoId) {
    const agendamento = await Agendamento.findById(agendamentoId);
    if (!agendamento) {
        throw {
            status: 404,
            message: "Agendamento não encontrado"
        };
    }

    const dataAgendamento = new Date(agendamento.data);
    const [hora, minuto] = agendamento.hora.split(":");

    dataAgendamento.setHours(parseInt(hora));
    dataAgendamento.setMinutes(parseInt(minuto));
    dataAgendamento.setSeconds(0);
    const agora = new Date();
    const diferencaMs =
        dataAgendamento.getTime() - agora.getTime();
    const diferencaHoras =
        diferencaMs / (1000 * 60 * 60);
    console.log("HORAS RESTANTES:", diferencaHoras);
    if (diferencaHoras < 24) {
        throw {
            status: 400,
            message:
                "Não é possível cancelar com menos de 24 horas de antecedência"
        };
    }
    const pagamento = await Pagamento.findOne({
        Agendamento: agendamento._id
    });

    if (!pagamento) {
        throw {
            status: 404,
            message: "Pagamento não encontrado"
        };
    }

   
    if (pagamento.status === "approved") {

        const payment = new Payment(client);

        console.log(
            "REALIZANDO REFUND DO PIX:",
            pagamento.paymentId
        );

        await payment.refund(
            pagamento.paymentId
        );

        pagamento.status = "refunded";

        await pagamento.save();
    }

  
    agendamento.status = "CANCELADO";

    await agendamento.save();

    return {
        message: "Agendamento cancelado e PIX devolvido"
    };
}
validarHorarioFuncionamento(data, hora) {

    const [ano, mes, dia] = data.split("-");

    const dataHorario = new Date(
        ano,
        mes - 1,
        dia
    );

    const [horas, minutos] = hora.split(":");

    dataHorario.setHours(parseInt(horas));
    dataHorario.setMinutes(parseInt(minutos));
    dataHorario.setSeconds(0);
    dataHorario.setMilliseconds(0);

    const agora = new Date();
    if (dataHorario < agora) {
        throw {
            status: 400,
            message: "Não é permitido agendar horários ou dias que já passaram"
        };
    }

    const diaSemana = dataHorario.getDay();

    if (diaSemana === 0) {
        throw {
            status: 400,
            message: "Não é permitido agendar aos domingos"
        };
    }


    if (diaSemana === 6) {

        if (
            parseInt(horas) > 15 ||
            (parseInt(horas) === 15 && parseInt(minutos) > 0)
        ) {
            throw {
                status: 400,
                message: "Aos sábados só é permitido agendar até 15:00"
            };
        }
    }

    if (
        parseInt(horas) > 21 ||
        (parseInt(horas) === 21 && parseInt(minutos) > 30)
    ) {
        throw {
            status: 400,
            message: "Não é permitido agendar após 21:30"
        };
    }
}

calcularIntervalo(data, hora, duracaoTotal) {

    const inicio =
        new Date(`${data}T${hora}:00`);

    const fim =
        new Date(inicio);

    fim.setMinutes(
        fim.getMinutes() + Number(duracaoTotal)
    );

    return { inicio, fim };
}

async reagendarAgendamento(
    agendamentoId,
    novaData,
    novaHora
) {

    const agendamento =
        await Agendamento.findById(agendamentoId);

    if (!agendamento) {
        throw {
            status: 404,
            message: "Agendamento não encontrado"
        };
    }

  
    const dataAtualAgendamento =
        new Date(agendamento.data);

    const [horaAtual, minutoAtual] =
        agendamento.hora.split(":");

    dataAtualAgendamento.setHours(
        parseInt(horaAtual)
    );

    dataAtualAgendamento.setMinutes(
        parseInt(minutoAtual)
    );

    dataAtualAgendamento.setSeconds(0);

    const agora = new Date();

    const diferencaHoras =
        (dataAtualAgendamento.getTime() - agora.getTime()) /
        (1000 * 60 * 60);

  
    if (diferencaHoras < 24) {
        throw {
            status: 400,
            message:
                "Não é possível reagendar com menos de 24 horas de antecedência"
        };
    }

 
    this.validarHorarioFuncionamento(
        novaData,
        novaHora
    );

  
    const horarioExistente =
        await Agendamento.verificarHorario(
            agendamento.Barbeiro,
            novaData,
            novaHora
        );

    if (
        horarioExistente &&
        horarioExistente._id.toString() !==
        agendamento._id.toString()
    ) {
        throw {
            status: 400,
            message:
                "Já existe um agendamento para este horário"
        };
    }
    agendamento.data = novaData;
    agendamento.hora = novaHora;
    await agendamento.save();
    return {
        message: "Agendamento reagendado com sucesso",
        agendamento
    };
}


    async processarWebhook(paymentId) {
        if (!paymentId) {
            throw { status: 400, message: "ID do pagamento não fornecido" };
        }

        const payment = new Payment(client);
        
  
        const pagamentoMP = await payment.get({ id: paymentId });
        const pagamento = await Pagamento.findOne({ paymentId: paymentId.toString() });

        if (!pagamento) {
            throw { status: 404, message: "Pagamento não encontrado no sistema" };
        }


        pagamento.status = pagamentoMP.status;
        await pagamento.save();


        if (pagamentoMP.status === "approved") {
            await Agendamento.findByIdAndUpdate(pagamento.Agendamento, {
                status: "CONFIRMADO"
            });
        }

        return true;
    }
}

export default new AgendamentoService();