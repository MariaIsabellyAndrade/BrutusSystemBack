import Agendamento from "../models/Agendamento.js";
import Cliente from "../models/Cliente.js";
import Barbeiro from "../models/Barbeiro.js";

class AgendamentoController {

async cadastrar(req, res) {

    try {

        const {
            Cliente,
            Barbeiro,
            Servicos,
            data,
            hora
        } = req.body;

        let clienteId;
        let barbeiroId;

        // =====================================
        // CLIENTE LOGADO
        // =====================================

        if (req.tipo === "CLIENTE") {

            const clienteEncontrado =
                await ClienteModel.findOne({
                    Usuario: req.usuarioId
                });

            if (!clienteEncontrado) {

                return res.status(404).json({
                    erro: "Cliente não encontrado"
                });
            }

            clienteId = clienteEncontrado._id;

            // barbeiro escolhido na tela
            barbeiroId = Barbeiro;
        }

        // =====================================
        // BARBEIRO LOGADO
        // =====================================

        else if (req.tipo === "BARBEIRO") {

            const barbeiroEncontrado =
                await BarbeiroModel.findOne({
                    Usuario: req.usuarioId
                });

            if (!barbeiroEncontrado) {

                return res.status(404).json({
                    erro: "Barbeiro não encontrado"
                });
            }

            barbeiroId = barbeiroEncontrado._id;

            // cliente escolhido
            clienteId = Cliente;
        }

        console.log(req.tipo);
console.log(req.usuarioId);

console.log(clienteId);
console.log(barbeiroId);

        // =====================================
        // CRIA OBJETO
        // =====================================

        const novoAgendamento =
            new Agendamento(

                req.usuarioId,

                clienteId,

                barbeiroId,

                Servicos,

                data,

                hora,

                "Agendado"
            );

        // =====================================
        // SALVA
        // =====================================

        const resultado =
            await novoAgendamento.save();

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


    async listar(req, res) {

        try {

            const agendamentos =
                await Agendamento.find()

                .populate("cliente")
                .populate("barbeiro")
                .populate("servicos");

            return res.status(200).json(
                agendamentos
            );

        } catch (error) {

            return res.status(500).json({
                erro: error.message
            });
        }
    }
}

export default new AgendamentoController();