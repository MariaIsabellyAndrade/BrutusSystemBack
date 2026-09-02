import AgendamentoService from "../services/AgendamentoService.js";

class AgendamentoController {

    static async horariosDisponiveis(req, res) {

    try {

        const {
            barbeiroId,
            data
        } = req.params;

        const {
            servicos
        } = req.query;

        let servicosIds = [];

        if (servicos) {

            servicosIds =
                servicos.split(",");
        }

        const horarios =
            await AgendamentoService.buscarHorariosDisponiveis(
                barbeiroId,
                data,
                servicosIds
            );

        return res.status(200).json({
            barbeiroId,
            data,
            horarios
        });

    } catch (error) {

        console.error(
            "Erro ao buscar horários disponíveis:",
            error
        );

        return res.status(
            error.status || 500
        ).json({
            erro:
                error.message ||
                "Erro ao buscar horários disponíveis"
        });
    }
}


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
            usuarioId: req.usuario.id,
            tipoUsuario: req.usuario.tipo,
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
 console.log("🔥🔥🔥 WEBHOOK RECEBIDO 🔥🔥🔥");

    console.log("BODY:", req.body);
    console.log("QUERY:", req.query);

    try {

        console.log("========== WEBHOOK MERCADO PAGO ==========");

        const paymentId =
            req.body?.data?.id ||
            req.query?.["data.id"];

        console.log(
            "PAYMENT ID RECEBIDO:",
            paymentId
        );

        if (!paymentId) {

            console.log(
                "Webhook recebido sem paymentId"
            );

            return res.sendStatus(200);
        }

        await AgendamentoService.processarWebhook(
            paymentId.toString()
        );

        console.log(
            "WEBHOOK PROCESSADO COM SUCESSO"
        );

        return res.sendStatus(200);

    } catch (error) {

        console.error(
            "ERRO NO WEBHOOK:",
            error
        );

        return res.status(
            error.status || 500
        ).json({
            erro:
                error.message ||
                "Erro ao processar webhook"
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

static async listarAgendamentos(req, res) {
    try {

        const agendamentos =
            await AgendamentoService.listarAgendamentos();

        return res.status(200).json(agendamentos);

    } catch (error) {

        console.error(
            "Erro ao listar agendamentos:",
            error
        );

        return res.status(error.status || 500).json({
            erro:
                error.message ||
                "Erro ao listar agendamentos"
        });
    }
}



}

export default AgendamentoController;