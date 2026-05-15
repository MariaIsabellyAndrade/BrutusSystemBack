import Agendamento from "../models/Agendamento.js";
import Cliente from "../models/Cliente.js";
import Barbeiro from "../models/Barbeiro.js";
import Servico from "../models/Servico.js";
import AgendaServ from "../models/AgendaServ.js";

class AgendamentoController {
async cadastrar(req, res) {

    try {

        const {
            Cliente: clienteBody,
            Barbeiro: barbeiroBody,
            Servicos,
            data,
            hora
        } = req.body;

        let clienteId;
        let barbeiroId;

        if (req.tipo === "CLIENTE") {

            const clienteEncontrado =
                await Cliente.findOne({
                    Usuario: req.usuarioId
                });

            if (!clienteEncontrado) {

                return res.status(404).json({
                    erro: "Cliente não encontrado"
                });
            }

            clienteId = clienteEncontrado._id;
            barbeiroId = barbeiroBody;

        }
        else if (req.tipo === "BARBEIRO") {

            const barbeiroEncontrado =
                await Barbeiro.findOne({
                    Usuario: req.usuarioId
                });

            if (!barbeiroEncontrado) {

                return res.status(404).json({
                    erro: "Barbeiro não encontrado"
                });
            }

            barbeiroId = barbeiroEncontrado._id;
            clienteId = clienteBody;
        }

        const horarioExistente =
            await Agendamento.verificarHorario(
                barbeiroId,
                data,
                hora
            );

        if (horarioExistente) {

            return res.status(400).json({
                erro: "Já existe um agendamento para este horário"
            });
        }

        const valorTotal =
            await Servico.calcularValorTotal(
                Servicos
            );

        const novoAgendamento =
            new Agendamento(

                req.usuarioId,
                clienteId,
                barbeiroId,
                data,
                hora,
                "Agendado",
                valorTotal

            );

        const resultado =
            await novoAgendamento.save();

        try {

            await AgendaServ.vincularServicos(
                resultado._id,
                Servicos
            );

        } catch (error) {

            await AgendaServ.deletarPorAgendamento(
                resultado._id
            );

            await Agendamento.deletar(
                resultado._id
            );

            throw error;
        }

        return res.status(201).json({

            mensagem: "Agendamento realizado",
            agendamento: resultado

        });

    } catch (error) {

        return res.status(500).json({
            erro: error.message
        });
    }
}
}

export default new AgendamentoController();