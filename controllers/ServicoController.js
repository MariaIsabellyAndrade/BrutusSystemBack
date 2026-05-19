import ServicoService from "../services/ServicoService.js";

class ServicoController {
    static async createServico(req, res) {
        try {
            const foto = req.file ? req.file.filename : null;
            await ServicoService.criarServico(req.body, foto);
            
            return res.status(201).json({ message: 'Serviço cadastrado com sucesso' });
        } catch (error) {
            console.error('Erro ao cadastrar serviço:', error);
            return res.status(error.status || 500).json({ 
                message: error.message || 'Erro interno ao cadastrar serviço' 
            });
        }
    }

    static async getAllServico(req, res) {
        try {
            const servicos = await ServicoService.buscarTodos();
            return res.json(servicos);
        } catch (error) {
            return res.status(500).json({ message: 'Erro interno ao buscar serviços' });
        }
    }

    static async updateServico(req, res) {
        try {
            const foto = req.file ? req.file.filename : null;
            const servico = await ServicoService.atualizarServico(req.params.id, req.body, foto);
            return res.json(servico);
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao atualizar serviço' });
        }
    }

    static async deleteServico(req, res) {
        try {
            await ServicoService.deletarServico(req.params.id);
            return res.status(204).send(); 
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao deletar serviço' });
        }
    }
}

export default ServicoController;