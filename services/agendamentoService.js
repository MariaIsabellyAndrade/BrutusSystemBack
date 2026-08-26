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


    async buscarHorariosDisponiveis(barbeiroId, data, servicosIds) {

    if (!barbeiroId) {
        throw {
            status: 400,
            message: "Barbeiro não informado"
        };
    }

    if (!data) {
        throw {
            status: 400,
            message: "Data não informada"
        };
    }

    if (
        !servicosIds ||
        !Array.isArray(servicosIds) ||
        servicosIds.length === 0
    ) {
        throw {
            status: 400,
            message: "É necessário informar os serviços"
        };
    }

    // ==========================================
    // VERIFICA O BARBEIRO
    // ==========================================

    const barbeiro = await Barbeiro.findById(barbeiroId);

    if (!barbeiro) {
        throw {
            status: 404,
            message: "Barbeiro não encontrado"
        };
    }

    if (barbeiro.ativo === false) {
        throw {
            status: 400,
            message: "Este barbeiro está inativo"
        };
    }

    // ==========================================
    // DATA
    // ==========================================

    const [ano, mes, dia] = data.split("-");

    const dataBase = new Date(
        Number(ano),
        Number(mes) - 1,
        Number(dia)
    );

    const diaSemana = dataBase.getDay();

    // Domingo
    if (diaSemana === 0) {
        return [];
    }

    // ==========================================
    // HORÁRIO DE FUNCIONAMENTO
    // ==========================================

    let horarioAbertura;
    let horarioFechamento;

    // Segunda a sexta
    if (diaSemana >= 1 && diaSemana <= 5) {
        horarioAbertura = "08:00";
        horarioFechamento = "21:30";
    }

    // Sábado
    if (diaSemana === 6) {
        horarioAbertura = "08:00";
        horarioFechamento = "15:00";
    }

    // ==========================================
    // BUSCA OS SERVIÇOS SELECIONADOS
    // ==========================================

    const servicosEncontrados =
        await Servico.buscarPorIds(servicosIds);

    if (
        !servicosEncontrados ||
        servicosEncontrados.length === 0
    ) {
        throw {
            status: 404,
            message: "Nenhum serviço encontrado"
        };
    }

    if (
        servicosEncontrados.length !== servicosIds.length
    ) {
        throw {
            status: 400,
            message: "Um ou mais serviços não foram encontrados"
        };
    }

    // ==========================================
    // DURAÇÃO TOTAL DOS SERVIÇOS SELECIONADOS
    // ==========================================

    const duracaoTotal =
        servicosEncontrados.reduce(
            (total, servico) => {
                return total + Number(servico.duracao);
            },
            0
        );

    if (duracaoTotal <= 0) {
        throw {
            status: 400,
            message: "A duração dos serviços é inválida"
        };
    }

    // ==========================================
    // BUSCA OS AGENDAMENTOS DO DIA
    // ==========================================

    const agendamentosDia =
        await Agendamento.findAgendamentosPorBarbeiroEData(
            barbeiroId,
            data
        );

    // ==========================================
    // TRANSFORMA CADA AGENDAMENTO EM INTERVALO
    // ==========================================

    const intervalosOcupados = [];

    for (const agendamento of agendamentosDia) {

        // Soma a duração de TODOS os serviços
        // daquele agendamento
        const duracaoExistente =
            await AgendaServ.calcularDuracaoAgendamento(
                agendamento._id
            );

        const inicioExistente =
            new Date(
                `${data}T${agendamento.hora}:00`
            );

        const fimExistente =
            new Date(inicioExistente);

        fimExistente.setMinutes(
            fimExistente.getMinutes() +
            Number(duracaoExistente)
        );

        intervalosOcupados.push({
            inicio: inicioExistente,
            fim: fimExistente
        });
    }

    // ==========================================
    // HORÁRIO DE INÍCIO DO EXPEDIENTE
    // ==========================================

    const [
        horaAbertura,
        minutoAbertura
    ] = horarioAbertura
        .split(":")
        .map(Number);

    const [
        horaFechamento,
        minutoFechamento
    ] = horarioFechamento
        .split(":")
        .map(Number);

    const inicioExpediente =
        new Date(dataBase);

    inicioExpediente.setHours(
        horaAbertura,
        minutoAbertura,
        0,
        0
    );

    // ==========================================
    // HORÁRIO DE FIM DO EXPEDIENTE
    // ==========================================

    const fimExpediente =
        new Date(dataBase);

    fimExpediente.setHours(
        horaFechamento,
        minutoFechamento,
        0,
        0
    );

    // ==========================================
    // HORÁRIO ATUAL
    // ==========================================

    const agora = new Date();

    // ==========================================
    // GERA OS HORÁRIOS
    // ==========================================

    const horariosDisponiveis = [];

    // Horários de 30 em 30 minutos
    const intervaloMinutos = 30;

    let horarioAtual =
        new Date(inicioExpediente);

    while (horarioAtual < fimExpediente) {

        const inicioNovo =
            new Date(horarioAtual);

        const fimNovo =
            new Date(horarioAtual);

        // Soma a duração dos serviços
        fimNovo.setMinutes(
            fimNovo.getMinutes() +
            duracaoTotal
        );

        // ==========================================
        // NÃO PODE TERMINAR DEPOIS DO EXPEDIENTE
        // ==========================================

        if (fimNovo > fimExpediente) {

            horarioAtual.setMinutes(
                horarioAtual.getMinutes() +
                intervaloMinutos
            );

            continue;
        }

        // ==========================================
        // NÃO MOSTRA HORÁRIO QUE JÁ PASSOU
        // ==========================================

        if (
            dataBase.toDateString() ===
            agora.toDateString() &&
            inicioNovo <= agora
        ) {

            horarioAtual.setMinutes(
                horarioAtual.getMinutes() +
                intervaloMinutos
            );

            continue;
        }

        // ==========================================
        // VERIFICA SE BATE COM ALGUM AGENDAMENTO
        // ==========================================

        const possuiConflito =
            intervalosOcupados.some(intervalo => {

                return (
                    inicioNovo < intervalo.fim &&
                    fimNovo > intervalo.inicio
                );

            });

        // ==========================================
        // SE NÃO TIVER CONFLITO, DISPONÍVEL
        // ==========================================

        if (!possuiConflito) {

            const horas =
                String(
                    inicioNovo.getHours()
                ).padStart(2, "0");

            const minutos =
                String(
                    inicioNovo.getMinutes()
                ).padStart(2, "0");

            horariosDisponiveis.push(
                `${horas}:${minutos}`
            );
        }

        // Próximo horário
        horarioAtual.setMinutes(
            horarioAtual.getMinutes() +
            intervaloMinutos
        );
    }

    return horariosDisponiveis;
}

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

const servicosEncontrados =
    await Servico.buscarPorIds(servicos);

if (!servicosEncontrados || servicosEncontrados.length === 0) {
    throw {
        status: 404,
        message: "Nenhum serviço encontrado"
    };
}

if (servicosEncontrados.length !== servicos.length) {
    throw {
        status: 400,
        message: "Um ou mais serviços não foram encontrados"
    };
}

const duracaoTotal =
    servicosEncontrados.reduce(
        (total, servico) =>
            total + Number(servico.duracao),
        0
    );

this.validarHorarioFuncionamento(
    data,
    hora,
    duracaoTotal
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
    dataAgendamento.setMilliseconds(0);

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

    console.log("========== PAGAMENTO ==========");
    console.log("ID INTERNO:", pagamento._id);
    console.log("STATUS BANCO:", pagamento.status);
    console.log("PAYMENT ID MP:", pagamento.paymentId);
    console.log("===============================");

    if (!pagamento.paymentId) {
        throw {
            status: 400,
            message: "Pagamento não possui ID do Mercado Pago"
        };
    }

    const payment = new Payment(client);

    // Busca o pagamento diretamente no Mercado Pago
    const pagamentoMP = await payment.get({
        id: pagamento.paymentId
    });

    console.log("STATUS MERCADO PAGO:", pagamentoMP.status);

    if (pagamentoMP.status !== "approved") {
        throw {
            status: 400,
            message:
                `O pagamento não está aprovado no Mercado Pago. Status atual: ${pagamentoMP.status}`
        };
    }

console.log(
    "REALIZANDO REFUND DO PIX:",
    pagamento.paymentId
);

const refundResponse = await fetch(
    `https://api.mercadopago.com/v1/payments/${pagamento.paymentId}/refunds`,
    {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
            "X-Idempotency-Key": `refund-${pagamento.paymentId}-${Date.now()}`,
            "X-Render-In-Process-Refunds": "true"
        }
    }
);

const refund = await refundResponse.json();

console.log("RESPOSTA DO REFUND:", refund);

if (!refundResponse.ok) {
    console.error("ERRO NO REFUND:", refund);

    throw {
        status: 400,
        message:
            refund.message ||
            "Não foi possível realizar o reembolso do pagamento"
    };
}

    pagamento.status = "refunded";
    await pagamento.save();

    agendamento.status = "CANCELADO";
    await agendamento.save();

    return {
        message: "Agendamento cancelado e PIX devolvido",
        pagamento: {
            paymentId: pagamento.paymentId,
            status: "refunded"
        }
    };
}

validarHorarioFuncionamento(data, hora, duracaoTotal = 0) {

    const [ano, mes, dia] = data.split("-");

    const dataHorario = new Date(
        Number(ano),
        Number(mes) - 1,
        Number(dia)
    );

    const [horas, minutos] = hora
        .split(":")
        .map(Number);

    dataHorario.setHours(
        horas,
        minutos,
        0,
        0
    );

    const agora = new Date();

    // ==========================================
    // DATA/HORA JÁ PASSOU
    // ==========================================

    if (dataHorario < agora) {
        throw {
            status: 400,
            message:
                "Não é permitido agendar horários ou dias que já passaram"
        };
    }

    const diaSemana = dataHorario.getDay();

    // ==========================================
    // DOMINGO
    // ==========================================

    if (diaSemana === 0) {
        throw {
            status: 400,
            message:
                "Não é permitido agendar aos domingos"
        };
    }

    // ==========================================
    // CALCULA FIM DO SERVIÇO
    // ==========================================

    const fimAgendamento =
        new Date(dataHorario);

    fimAgendamento.setMinutes(
        fimAgendamento.getMinutes() +
        Number(duracaoTotal)
    );

    // ==========================================
    // SÁBADO
    // ==========================================

    if (diaSemana === 6) {

        const limiteSabado =
            new Date(dataHorario);

        limiteSabado.setHours(
            15,
            0,
            0,
            0
        );

        if (fimAgendamento > limiteSabado) {
            throw {
                status: 400,
                message:
                    "Aos sábados o atendimento deve terminar até 15:00"
            };
        }

        return;
    }

    // ==========================================
    // SEGUNDA A SEXTA
    // ==========================================

    const limiteSemana =
        new Date(dataHorario);

    limiteSemana.setHours(
        21,
        30,
        0,
        0
    );

    if (fimAgendamento > limiteSemana) {
        throw {
            status: 400,
            message:
                "O atendimento deve terminar até 21:30"
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

    try {

        if (!paymentId) {
            throw {
                status: 400,
                message: "ID do pagamento não fornecido"
            };
        }

        console.log("========================================");
        console.log("PROCESSANDO WEBHOOK");
        console.log("PAYMENT ID RECEBIDO:", paymentId);
        console.log("========================================");


        // ==========================================
        // CONSULTA PAGAMENTO NO MERCADO PAGO
        // ==========================================

        const payment = new Payment(client);

        const pagamentoMP = await payment.get({
            id: paymentId.toString()
        });

        console.log("========== MERCADO PAGO ==========");
        console.log("ID:", pagamentoMP.id);
        console.log("STATUS:", pagamentoMP.status);
        console.log("STATUS DETAIL:", pagamentoMP.status_detail);
        console.log("VALOR:", pagamentoMP.transaction_amount);
        console.log("==================================");


        // ==========================================
        // PROCURA PAGAMENTO NO BANCO
        // ==========================================

        const pagamento = await Pagamento.findOne({
            paymentId: paymentId.toString()
        });

        console.log("========== BANCO ==========");
        console.log(
            "PAGAMENTO ENCONTRADO:",
            !!pagamento
        );

        if (pagamento) {
            console.log(
                "ID PAGAMENTO:",
                pagamento._id
            );

            console.log(
                "STATUS ANTES:",
                pagamento.status
            );

            console.log(
                "PAYMENT ID BANCO:",
                pagamento.paymentId
            );

            console.log(
                "AGENDAMENTO:",
                pagamento.Agendamento
            );
        }

        console.log("============================");


        if (!pagamento) {

            throw {
                status: 404,
                message:
                    `Pagamento ${paymentId} não encontrado no sistema`
            };
        }


        // ==========================================
        // ATUALIZA PAGAMENTO
        // ==========================================

        pagamento.status = pagamentoMP.status;

        // Se aprovado, registra a data do pagamento
        if (pagamentoMP.status === "approved") {
            pagamento.dataPagamento = new Date();
        }

        await pagamento.save();


        console.log(
            "STATUS BANCO DEPOIS:",
            pagamento.status
        );


        // ==========================================
        // PAGAMENTO APROVADO
        // ==========================================

        if (pagamentoMP.status === "approved") {

            const agendamento =
                await Agendamento.findById(
                    pagamento.Agendamento
                );

            console.log(
                "AGENDAMENTO ENCONTRADO:",
                !!agendamento
            );


            if (!agendamento) {

                throw {
                    status: 404,
                    message:
                        "Agendamento relacionado ao pagamento não encontrado"
                };
            }


            console.log(
                "STATUS AGENDAMENTO ANTES:",
                agendamento.status
            );


            agendamento.status = "CONFIRMADO";

            await agendamento.save();


            console.log(
                "STATUS AGENDAMENTO DEPOIS:",
                agendamento.status
            );

            console.log(
                "AGENDAMENTO CONFIRMADO:",
                agendamento._id
            );
        }


        console.log(
            "WEBHOOK FINALIZADO COM SUCESSO"
        );

        return true;


    } catch (error) {

        console.error(
            "ERRO AO PROCESSAR WEBHOOK:",
            error
        );

        throw error;
    }
}


async listarAgendamentos() {

    const agendamentos =
        await Agendamento.findAll();

    return agendamentos;
}
}

export default new AgendamentoService();