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
}

export default BarbeiroController;