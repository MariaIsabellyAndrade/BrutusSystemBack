import AgendamentoService from "../services/AgendamentoService.js";

class AgendamentoController {

    static async cadastrar(req, res) {
        try {

            const {
                Cliente: clienteBody,
                Barbeiro: barbeiroBody,
                Servicos,
                data,
                hora
            } = req.body;

            const resultado = await AgendamentoService.criarAgendamento({
                usuarioId: req.usuarioId,
                tipoUsuario: req.tipo,
                clienteBody,
                barbeiroBody,
                servicos: Servicos,
                data,
                hora
            });

            return res.status(201).json({
                mensagem: "Agendamento criado. Realize o pagamento.",
                ...resultado
            });

        } catch (error) {

            console.error(error);

            const status = error.status || 500;

            return res.status(status).json({
                erro: error.message || "Erro interno do servidor"
            });
        }
    }

    static async webhook(req, res) {
        try {

            console.log(req.body);

            const paymentId = req.body?.data?.id;

            await AgendamentoService.processarWebhook(paymentId);

            return res.sendStatus(200);

        } catch (error) {

            console.error(error);

            const status = error.status || 500;

            return res.status(status).json({
                erro: error.message || "Erro ao processar webhook"
            });
        }
    }

    static async cancelarAgendamento(req, res) {
        //devolver pix 
        try {
            const { id } = req.params;
            const resultado = await AgendamentoService.cancelarAgendamento(id);
            return res.status(200).json(resultado);

        } catch (error) {

            console.error(error);

            return res.status(error.status || 500).json({
                message: error.message || "Erro ao cancelar agendamento"
            });
        }
    }

    static async reagendarAgendamento(req, res) {

    try {

        const { id } = req.params;

        const { data, hora } = req.body;

        const resultado =
            await AgendamentoService.reagendarAgendamento(
                id,
                data,
                hora
            );

        return res.status(200).json(resultado);

    } catch (error) {

        console.error(error);

        return res.status(error.status || 500).json({
            message:
                error.message ||
                "Erro ao reagendar agendamento"
        });
    }
}

}

export default AgendamentoController;