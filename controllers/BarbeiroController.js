import BarbeiroService from "../services/BarbeiroService.js";

class BarbeiroController {
    
    static async createBarbeiro(req, res) {
        try {
            const foto = req.file ? req.file.filename : null;
            const resultado = await BarbeiroService.criarBarbeiro(req.body, foto);
            return res.status(201).json(resultado);
        }catch (error) {
            console.error("Erro ao cadastrar barbeiro:", error);
            const status = error.status || 500;
            return res.status(status).json({
                erro: error.message || "Erro interno ao cadastrar barbeiro"
            });
        }
    }

    static async getAllBarbeiro(req, res) {
        try {
            const barbeiros = await BarbeiroService.buscarTodos();
            return res.json(barbeiros);
        } catch (error) {
            console.error('Erro ao carregar os barbeiros:', error);
            return res.status(500).json({ message: 'Erro interno ao buscar barbeiros' });
        }
    }

    static async updateBarbeiro(req, res) {
        try {
            const { id } = req.params;
            const foto = req.file ? req.file.filename : null;

            const barbeiroAtualizado = await BarbeiroService.atualizarBarbeiro(id, req.body, foto);

            return res.json(barbeiroAtualizado);
        } catch (error) {
            console.error("Erro ao atualizar barbeiro:", error);
            const status = error.status || 500;
            return res.status(status).send(error.message || 'Erro ao atualizar barbeiro');
        }
    }

    static async deleteBarbeiro(req, res) {
        try {
            const { id } = req.params;
            
            const barbeiroDesativado = await BarbeiroService.deletarBarbeiro(id);

            return res.json(barbeiroDesativado);
        } catch (error) {
            console.error("Erro ao deletar barbeiro:", error);
            return res.status(500).send("Erro ao deletar barbeiro");
        }
    }

    static async salvarHorariosBloqueados(req, res) {
        try {
            const { id } = req.params;
            const { data, slots, motivos } = req.body;

            if (!data) {
                return res.status(400).json({ erro: "Data não informada" });
            }

            const resultado = await BarbeiroService.salvarHorariosBloqueados(id, data, slots || [], motivos || [], req.usuario?.id);
            return res.json(resultado);
        } catch (error) {
            console.error("Erro ao salvar horários bloqueados:", error);
            return res.status(error.status || 500).json({
                erro: error.message || "Erro ao salvar horários bloqueados"
            });
        }
    }

    static async buscarHorariosBloqueados(req, res) {
        try {
            const { id } = req.params;
            const { data } = req.query;

            if (!data) {
                return res.status(400).json({ erro: "Data não informada" });
            }

            const resultado = await BarbeiroService.buscarHorariosBloqueados(id, data);
            return res.json(resultado);
        } catch (error) {
            console.error("Erro ao buscar horários bloqueados:", error);
            return res.status(error.status || 500).json({
                erro: error.message || "Erro ao buscar horários bloqueados"
            });
        }
    }

    static async listarBloqueiosParaAdmin(req, res) {
        try {
            const dados = await BarbeiroService.listarBloqueiosParaAdmin();
            return res.json(dados);
        } catch (error) {
            return res.status(500).json({ erro: error.message || "Erro ao listar horários bloqueados" });
        }
    }

    static async listarNotificacoesHorarios(req, res) {
        try {
            const notificacoes = await BarbeiroService.listarNotificacoesHorarios(req.query.naoLidas === "true");
            return res.json({ notificacoes });
        } catch (error) {
            return res.status(500).json({ erro: error.message || "Erro ao listar notificações" });
        }
    }

    static async marcarNotificacaoHorarioLida(req, res) {
        try {
            const notificacao = await BarbeiroService.marcarNotificacaoHorarioLida(req.params.id);
            if (!notificacao) return res.status(404).json({ erro: "Notificação não encontrada" });
            return res.json({ notificacao });
        } catch (error) {
            return res.status(500).json({ erro: error.message || "Erro ao atualizar notificação" });
        }
    }

    static async listarBloqueiosRecorrentes(req, res) {
        try {
            const regras = await BarbeiroService.listarBloqueiosRecorrentes(req.params.id, req.usuario?.id);
            return res.json({ regras });
        } catch (error) {
            return res.status(error.status || 500).json({ erro: error.message || "Erro ao buscar regras recorrentes" });
        }
    }

    static async salvarBloqueiosRecorrentes(req, res) {
        try {
            const regras = await BarbeiroService.salvarBloqueiosRecorrentes(req.params.id, req.body.regras, req.usuario?.id);
            return res.json({ mensagem: "Regras recorrentes salvas", regras });
        } catch (error) {
            return res.status(error.status || 500).json({ erro: error.message || "Erro ao salvar regras recorrentes" });
        }
    }
}

export default BarbeiroController;