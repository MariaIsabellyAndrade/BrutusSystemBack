import AgendamentoService from "../services/AgendamentoService.js";

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

            // Chama o serviço passando os parâmetros estruturados
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
            // Se o erro foi lançado com um status customizado no Service, usa ele. Caso contrário, 500.
            const status = error.status || 500;
            return res.status(status).json({
                erro: error.message || "Erro interno do servidor"
            });
        }
    }

    async webhook(req, res) {
        try {
            console.log(req.body);
            const paymentId = req.body?.data?.id;

            await AgendamentoService.processarWebhook(paymentId);

            // Webhooks do Mercado Pago precisam retornar status 200 rápido para evitar retentativas
            return res.sendStatus(200);

        } catch (error) {
            console.error(error);
            const status = error.status || 500;
            return res.status(status).json({
                erro: error.message || "Erro ao processar o webhook"
            });
        }
    }
}

export default new AgendamentoController();