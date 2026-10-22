import Agendamento from "../models/Agendamento.js";
import Cliente from "../models/Cliente.js";
import Barbeiro from "../models/Barbeiro.js";
import Servico from "../models/Servico.js";
import AgendaServ from "../models/AgendaServ.js";
import Pagamento from "../models/Pagamento.js";
import Usuario from "../models/Usuario.js";
import client from "../config/mercadoPago.js";
import pkg from "mercadopago";
import ServicoModel from "../models/ServicoSchema.js";
import AgendaServModel from "../models/AgendaServSchema.js";
import ComissaoModel from "../models/ComissaoSchema.js"; 
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
    // SLOTS BLOQUEADOS PELO ADMIN
    // ==========================================

    const slotsBloqueados = (() => {
        const entrada = (barbeiro.horariosBloqueados || []).find(
            (h) => h.data === data
        );
        return (entrada ? entrada.slots : []).map((slot) => typeof slot === "string" ? slot : slot?.horario).filter(Boolean);
    })();

    const diaSemanaAgenda = new Date(data + "T00:00:00Z").getUTCDay();
    const recorrenciasDoDia = (barbeiro.bloqueiosRecorrentes || []).filter((regra) =>
        regra.ativo !== false && regra.diasSemana.includes(diaSemanaAgenda) &&
        data >= regra.dataInicio && (!regra.dataFim || data <= regra.dataFim)
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
        // NÃO MOSTRA SLOTS BLOQUEADOS PELO ADMIN
        // ==========================================

        const horasStr = String(inicioNovo.getHours()).padStart(2, "0");
        const minutosStr = String(inicioNovo.getMinutes()).padStart(2, "0");
        const slotStr = `${horasStr}:${minutosStr}`;

        const inicioMinutos = inicioNovo.getHours() * 60 + inicioNovo.getMinutes();
        const fimMinutos = fimNovo.getHours() * 60 + fimNovo.getMinutes();
        const bloqueadoPorRecorrencia = recorrenciasDoDia.some((regra) => {
            const inicioRegra = Number(regra.horaInicio.slice(0, 2)) * 60 + Number(regra.horaInicio.slice(3, 5));
            const fimRegra = Number(regra.horaFim.slice(0, 2)) * 60 + Number(regra.horaFim.slice(3, 5));
            return inicioMinutos < fimRegra && fimMinutos > inicioRegra;
        });

        if (slotsBloqueados.includes(slotStr) || bloqueadoPorRecorrencia) {

            horarioAtual.setMinutes(
                horarioAtual.getMinutes() +
                intervaloMinutos
            );

            continue;
        }

        // ==========================================
        // VERIFICA SE BATE COM ALGUM AGENDAMENTO
        // ==========================================

        // Encontra o intervalo que está bloqueando este slot (se existir)
        const intervaloConflitante = intervalosOcupados.find(intervalo => {
            return (
                inicioNovo < intervalo.fim &&
                fimNovo > intervalo.inicio
            );
        });

        if (intervaloConflitante) {
            // Pula direto para o fim do intervalo que conflita,
            // arredondando para o próximo múltiplo de 30 min
            // caso o fim caia em um horário quebrado (ex: 20:40 → 20:40,
            // 20:55 → 21:00).
            const fimConflito = intervaloConflitante.fim;

            const minutosFim =
                fimConflito.getHours() * 60 + fimConflito.getMinutes();

            // Arredonda para cima para o próximo múltiplo de intervaloMinutos
            const proximoMultiplo =
                Math.ceil(minutosFim / intervaloMinutos) * intervaloMinutos;

            horarioAtual = new Date(dataBase);
            horarioAtual.setHours(
                Math.floor(proximoMultiplo / 60),
                proximoMultiplo % 60,
                0,
                0
            );

            continue;
        }

        // ==========================================
        // SE NÃO TIVER CONFLITO, DISPONÍVEL
        // ==========================================

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

        // Próximo horário
        horarioAtual.setMinutes(
            horarioAtual.getMinutes() +
            intervaloMinutos
        );
    }

    return horariosDisponiveis;
}

    async validarHorarioBloqueado(barbeiroId, data, hora, duracao) {
        const barbeiro = await Barbeiro.findById(barbeiroId);
        if (!barbeiro) throw { status: 404, message: "Barbeiro não encontrado" };
        const [horaInicio, minutoInicio] = hora.split(":").map(Number);
        const inicio = horaInicio * 60 + minutoInicio;
        const fim = inicio + Number(duracao || 0);
        const entrada = (barbeiro.horariosBloqueados || []).find((item) => item.data === data);
        const conflitoPontual = (entrada?.slots || []).some((slot) => {
            const horario = typeof slot === "string" ? slot : slot?.horario;
            const [h, m] = String(horario || "").split(":").map(Number);
            const minuto = h * 60 + m;
            return inicio < minuto + 30 && fim > minuto;
        });
        const diaSemana = new Date(data + "T00:00:00Z").getUTCDay();
        const conflitoRecorrente = (barbeiro.bloqueiosRecorrentes || []).some((regra) => {
            if (regra.ativo === false || !regra.diasSemana.includes(diaSemana) || data < regra.dataInicio || (regra.dataFim && data > regra.dataFim)) return false;
            const inicioRegra = Number(regra.horaInicio.slice(0, 2)) * 60 + Number(regra.horaInicio.slice(3, 5));
            const fimRegra = Number(regra.horaFim.slice(0, 2)) * 60 + Number(regra.horaFim.slice(3, 5));
            return inicio < fimRegra && fim > inicioRegra;
        });
        if (conflitoPontual || conflitoRecorrente) {
            throw { status: 400, message: "Este horário está bloqueado pelo barbeiro" };
        }
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
await this.validarHorarioBloqueado(barbeiroId, data, hora, duracaoTotal);

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
    novaHora,
    novosServicosIds
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
        (dataAtualAgendamento.getTime() -
            agora.getTime()) /
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

    // ==============================
    // ATUALIZAÇÃO DOS SERVIÇOS
    // ==============================

    if (
        !Array.isArray(novosServicosIds) ||
        novosServicosIds.length === 0
    ) {
        throw {
            status: 400,
            message:
                "É necessário selecionar pelo menos um serviço"
        };
    }

    const servicosEncontrados =
        await ServicoModel.find({
            _id: {
                $in: novosServicosIds
            }
        });

    if (
        servicosEncontrados.length !==
        novosServicosIds.length
    ) {
        throw {
            status: 404,
            message:
                "Um ou mais serviços não foram encontrados"
        };
    }

    const duracaoNova = servicosEncontrados.reduce((total, servico) => total + Number(servico.duracao || 0), 0);
    await this.validarHorarioBloqueado(agendamento.Barbeiro, novaData, novaHora, duracaoNova);

    // Remove os serviços antigos
    await AgendaServ.deletarPorAgendamento(
        agendamentoId
    );

    // Adiciona os novos serviços
    await AgendaServ.vincularServicos(
        agendamentoId,
        novosServicosIds
    );

    // Soma o valor de TODOS os serviços
    const novoValorTotal =
        servicosEncontrados.reduce(
            (total, servico) => {
                return total + Number(servico.valor || 0);
            },
            0
        );

    agendamento.valorTotal =
        novoValorTotal;

    // Atualiza data e horário
    agendamento.data = novaData;
    agendamento.hora = novaHora;

    await agendamento.save();

    return {
        message:
            "Agendamento reagendado com sucesso",

        agendamento
    };
}


async concluirAgendamento(agendamentoId, usuarioId, tipoUsuario) {
    const agendamento = await Agendamento.findById(agendamentoId);
    if (!agendamento) throw { status: 404, message: "Agendamento não encontrado" };
    if (tipoUsuario === "BARBEIRO") {
        const barbeiro = await Barbeiro.findOne({ Usuario: usuarioId });
        if (!barbeiro || String(agendamento.Barbeiro) !== String(barbeiro._id)) throw { status: 403, message: "Acesso permitido somente aos seus agendamentos" };
    } else if (tipoUsuario !== "ADMIN") {
        throw { status: 403, message: "Acesso permitido somente para barbeiros e administradores" };
    }
    if (agendamento.status === "CANCELADO" || agendamento.status === "PENDENTE") throw { status: 400, message: "Somente agendamentos confirmados podem ser concluídos" };
    if (agendamento.status === "CONCLUIDO") return { message: "Atendimento já concluído", agendamento };

    agendamento.status = "CONCLUIDO";
    await agendamento.save();
    const itensServico = await AgendaServModel.find({ Agendamento: agendamento._id }).populate({ path: "Servico", select: "+comissaoPercentual valor" });
    for (const item of itensServico) {
        const servico = item.Servico;
        if (!servico) continue;
        const percentual = Number(servico.comissaoPercentual || 0);
        const valorBase = Number(item.valorCobrado ?? servico.valor ?? 0);
        await ComissaoModel.updateOne(
            { Agendamento: agendamento._id, Servico: servico._id },
            { $setOnInsert: { Barbeiro: agendamento.Barbeiro, Agendamento: agendamento._id, Servico: servico._id, valorBase, percentual, valor: Number((valorBase * percentual / 100).toFixed(2)), status: "PENDENTE", geradaEm: new Date() } },
            { upsert: true }
        );
    }
    return { message: "Atendimento concluído e comissão registrada", agendamento };
}

async processarWebhook(paymentId) {
    try {


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