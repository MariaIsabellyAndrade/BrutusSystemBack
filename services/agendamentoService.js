import Agendamento from "../models/Agendamento.js";
import Cliente from "../models/Cliente.js";
import Barbeiro from "../models/Barbeiro.js";
import Servico from "../models/Servico.js";
import AgendaServ from "../models/AgendaServ.js";
import Pagamento from "../models/Pagamento.js";
import Usuario from "../models/Usuario.js";
import client from "../config/mercadoPago.js";
import pkg from "mercadopago";
const { Payment } = pkg;

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
            "PENDENTE",
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
async cancelarAgendamento(id) {
    try {
        console.log("========================================");
        console.log("CANCELAMENTO DE AGENDAMENTO");
        console.log("AGENDAMENTO ID:", id);
        console.log("========================================");

        // 1. Busca o agendamento
        const agendamento = await Agendamento.findById(id);

        if (!agendamento) {
            throw {
                status: 404,
                message: "Agendamento não encontrado"
            };
        }

        console.log("AGENDAMENTO ENCONTRADO:", true);
        console.log("STATUS ATUAL:", agendamento.status);
        console.log("VALOR TOTAL:", agendamento.valorTotal);

        // 2. Verifica se já está cancelado
        if (agendamento.status === "CANCELADO") {
            throw {
                status: 400,
                message: "Este agendamento já está cancelado"
            };
        }

        // 3. Busca o pagamento relacionado ao agendamento
        const pagamento = await Pagamento.findOne({
            Agendamento: agendamento._id
        });

        console.log("========== PAGAMENTO ==========");
        console.log("PAGAMENTO ENCONTRADO:", !!pagamento);

        if (pagamento) {
            console.log("ID PAGAMENTO BANCO:", pagamento._id);
            console.log("PAYMENT ID MERCADO PAGO:", pagamento.paymentId);
            console.log("STATUS PAGAMENTO:", pagamento.status);
            console.log("VALOR PAGAMENTO:", pagamento.valor);
        }

        console.log("===============================");

        if (!pagamento) {
            throw {
                status: 404,
                message:
                    "Pagamento relacionado ao agendamento não encontrado"
            };
        }

        // 4. O pagamento precisa estar aprovado
        if (pagamento.status !== "approved") {
            throw {
                status: 400,
                message:
                    `Não é possível reembolsar um pagamento com status "${pagamento.status}"`
            };
        }

        // 5. Verifica o paymentId
        if (!pagamento.paymentId) {
            throw {
                status: 400,
                message:
                    "Pagamento não possui paymentId do Mercado Pago"
            };
        }

        // 6. Verifica o valor
        if (!pagamento.valor || pagamento.valor <= 0) {
            throw {
                status: 400,
                message:
                    "Pagamento não possui um valor válido para reembolso"
            };
        }

        console.log("========================================");
        console.log("INICIANDO REEMBOLSO");
        console.log("PAYMENT ID:", pagamento.paymentId);
        console.log("VALOR A DEVOLVER:", pagamento.valor);
        console.log("========================================");

const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${pagamento.paymentId}/refunds`,
    {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
            "X-Idempotency-Key": `refund-${pagamento.paymentId}`
        },
        body: JSON.stringify({
            amount: pagamento.valor
        })
    }
);

const resultadoRefund = await response.json();

console.log("========== RETORNO REEMBOLSO ==========");
console.log("STATUS HTTP:", response.status);
console.log(resultadoRefund);
console.log("=======================================");

if (!response.ok) {
    throw {
        status: response.status,
        message:
            resultadoRefund?.message ||
            "Erro ao realizar reembolso no Mercado Pago",
        detalhes: resultadoRefund
    };
}

        console.log("========== RETORNO REEMBOLSO ==========");
        console.log(resultadoRefund);
        console.log("=======================================");

        // 8. Atualiza o pagamento somente depois
        // que o Mercado Pago confirmou o reembolso
        pagamento.status = "refunded";

        await pagamento.save();

        console.log("PAGAMENTO ATUALIZADO:", pagamento.status);

        // 9. Atualiza o agendamento
        agendamento.status = "CANCELADO";

        await agendamento.save();

        console.log("AGENDAMENTO ATUALIZADO:", agendamento.status);

        console.log("========================================");
        console.log("CANCELAMENTO + REEMBOLSO CONCLUÍDOS");
        console.log("========================================");

        return {
            mensagem:
                "Agendamento cancelado e pagamento reembolsado com sucesso",

            agendamento: {
                id: agendamento._id,
                status: agendamento.status
            },

            pagamento: {
                id: pagamento._id,
                paymentId: pagamento.paymentId,
                status: pagamento.status,
                valor: pagamento.valor
            },

            reembolso: resultadoRefund
        };

    } catch (error) {
        console.error("========================================");
        console.error("ERRO AO CANCELAR AGENDAMENTO");
        console.error(error);
        console.error("========================================");

        throw error;
    }
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


    if (dataHorario < agora) {
        throw {
            status: 400,
            message:
                "Não é permitido agendar horários ou dias que já passaram"
        };
    }

    const diaSemana = dataHorario.getDay();



    if (diaSemana === 0) {
        throw {
            status: 400,
            message:
                "Não é permitido agendar aos domingos"
        };
    }



    const fimAgendamento =
        new Date(dataHorario);

    fimAgendamento.setMinutes(
        fimAgendamento.getMinutes() +
        Number(duracaoTotal)
    );



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

        // ==========================================
        // VALIDA PAYMENT ID
        // ==========================================

        if (!paymentId) {
            throw {
                status: 400,
                message: "ID do pagamento não fornecido"
            };
        }

        const paymentIdString = paymentId.toString();

        console.log("========================================");
        console.log("PROCESSANDO WEBHOOK");
        console.log("PAYMENT ID RECEBIDO:", paymentIdString);
        console.log("========================================");


        // ==========================================
        // CONSULTA PAGAMENTO NO MERCADO PAGO
        // ==========================================

        const payment = new Payment(client);

        const pagamentoMPResponse = await payment.get({
            id: paymentIdString
        });

        // Dependendo da versão do SDK,
        // o retorno pode estar dentro de .body
        const pagamentoMP =
            pagamentoMPResponse?.body ?? pagamentoMPResponse;


        // ==========================================
        // MOSTRA DADOS DO MERCADO PAGO
        // ==========================================

        console.log("========== MERCADO PAGO ==========");

        console.log(
            "ID RECEBIDO NO WEBHOOK:",
            paymentIdString
        );

        console.log(
            "ID RETORNADO PELO MP:",
            pagamentoMP?.id
        );

        console.log(
            "STATUS:",
            pagamentoMP?.status
        );

        console.log(
            "STATUS DETAIL:",
            pagamentoMP?.status_detail
        );

        console.log(
            "VALOR:",
            pagamentoMP?.transaction_amount
        );

        console.log("==================================");


        // ==========================================
        // CONFIRMA SE OS IDs SÃO IGUAIS
        // ==========================================

        if (
            !pagamentoMP?.id ||
            pagamentoMP.id.toString() !== paymentIdString
        ) {

            console.error("⚠️ ==================================");
            console.error("⚠️ IDs DIFERENTES!");
            console.error(
                "⚠️ ID RECEBIDO PELO WEBHOOK:",
                paymentIdString
            );
            console.error(
                "⚠️ ID RETORNADO PELO MERCADO PAGO:",
                pagamentoMP?.id
            );
            console.error("⚠️ ==================================");

            throw {
                status: 400,
                message:
                    "O ID recebido pelo webhook é diferente do ID retornado pelo Mercado Pago"
            };
        }


        console.log(
            "✅ ID DO WEBHOOK E ID DO MERCADO PAGO SÃO IGUAIS"
        );


        // ==========================================
        // BUSCA PAGAMENTO NO BANCO
        // ==========================================

        const pagamento = await Pagamento.findOne({
            paymentId: paymentIdString
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


        // ==========================================
        // PAGAMENTO NÃO ENCONTRADO
        // ==========================================

        if (!pagamento) {

            throw {
                status: 404,
                message:
                    `Pagamento ${paymentIdString} não encontrado no sistema`
            };
        }


        // ==========================================
        // ATUALIZA STATUS DO PAGAMENTO
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


            // ==========================================
            // AGENDAMENTO NÃO ENCONTRADO
            // ==========================================

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


            // ==========================================
            // CONFIRMA AGENDAMENTO
            // ==========================================

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


        // ==========================================
        // FINAL
        // ==========================================

        console.log(
            "========================================"
        );

        console.log(
            "WEBHOOK FINALIZADO COM SUCESSO"
        );

        console.log(
            "PAYMENT ID:",
            paymentIdString
        );

        console.log(
            "STATUS FINAL:",
            pagamentoMP.status
        );

        console.log(
            "========================================"
        );


        return true;


    } catch (error) {

        console.error(
            "========================================"
        );

        console.error(
            "ERRO AO PROCESSAR WEBHOOK:",
            error
        );

        console.error(
            "========================================"
        );

        throw error;
    }
}


async listarAgendamentos() {

    const agendamentos =
        await Agendamento.findAll();

    return agendamentos;
}


async listarAgendamentosPorBarbeiro(barbeiroId) {
    const barbeiro = await Barbeiro.findById(barbeiroId);
    if (!barbeiro) {
        throw {
            status: 404,
            message: "Barbeiro não encontrado"
        };
    }
    const agendamentos =
        await Agendamento.findPorBarbeiro(barbeiroId);

    return agendamentos;
}

async buscarIndicadoresPorBarbeiro(barbeiroId) {
    return await Agendamento.buscarIndicadoresPorBarbeiro(barbeiroId);
}
async buscarFaturamentoPorBarbeiro(
    barbeiroId,
    dataInicio,
    dataFim
) {
    return await Agendamento.buscarFaturamentoPorBarbeiro(
        barbeiroId,
        dataInicio,
        dataFim
    );
}

async listarAgendamentosPorCliente(clienteId) {
    const cliente = await Cliente.findById(clienteId);

    if (!cliente) {
        const erro = new Error("Cliente não encontrado");
        erro.status = 404;
        throw erro;
    }

    return await Agendamento.findPorCliente(clienteId);
}
}

export default new AgendamentoService();