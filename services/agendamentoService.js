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
    async criarAgendamento({ usuarioId, tipoUsuario, clienteBody, barbeiroBody, servicos, data, hora }) {
        let clienteId;
        let barbeiroId;


        if (tipoUsuario === "CLIENTE") {
            const clienteEncontrado = await Cliente.findOne({ Usuario: usuarioId });
            if (!clienteEncontrado) {
                throw { status: 404, message: "Cliente não encontrado" };
            }
            clienteId = clienteEncontrado._id;
            barbeiroId = barbeiroBody;
        } else if (tipoUsuario === "BARBEIRO") {
            const barbeiroEncontrado = await Barbeiro.findOne({ Usuario: usuarioId });
            if (!barbeiroEncontrado) {
                throw { status: 404, message: "Barbeiro não encontrado" };
            }
            barbeiroId = barbeiroEncontrado._id;
            clienteId = clienteBody;
        }

        const horarioExistente = await Agendamento.verificarHorario(barbeiroId, data, hora);
        if (horarioExistente) {
            throw { status: 400, message: "Já existe um agendamento para este horário" };
        }

    
        const valorTotal = await Servico.calcularValorTotal(servicos);
        const usuario = await Usuario.findById(usuarioId);
        if (!usuario) {
            throw { status: 404, message: "Usuário não encontrado" };
        }

     
        const payment = new Payment(client);
        const pagamentoPix = await payment.create({
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

        const novoAgendamento = new Agendamento(
            usuarioId,
            clienteId,
            barbeiroId,
            data,
            hora,
            "Pendente",
            valorTotal
        );
        const resultado = await novoAgendamento.save();

      
        try {
            await AgendaServ.vincularServicos(resultado._id, servicos);
        } catch (error) {
            await AgendaServ.deletarPorAgendamento(resultado._id);
            await Agendamento.deletar(resultado._id);
            throw error;
        }

        const novoPagamento = new Pagamento(
            resultado._id,
            pagamentoPix.status,
            pagamentoPix.point_of_interaction.transaction_data.qr_code,
            15,
            pagamentoPix.id.toString(),
            new Date()
        );
        const pagamentoSalvo = await novoPagamento.save();

 
        return {
            agendamento: resultado,
            pagamento: {
                id: pagamentoSalvo._id,
                status: pagamentoSalvo.status,
                paymentId: pagamentoSalvo.paymentId,
                qrCode: pagamentoPix.point_of_interaction.transaction_data.qr_code,
                qrCodeBase64: pagamentoPix.point_of_interaction.transaction_data.qr_code_base64
            }
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