import ClienteService from "../services/ClienteService.js";

class ClienteController {
    static async createCliente(req, res) {
        try {
            const foto = req.file ? req.file.filename : null;
            const resultado = await ClienteService.criarCliente(req.body, foto);
            return res.status(201).json(resultado);
        } catch (error) {
            console.error('Erro ao cadastrar cliente:', error);
            return res.status(error.status || 500).json({ 
                error: error.message || 'Erro interno ao cadastrar cliente' 
            });
        }
    }

    static async getAllCliente(req, res) {
        try {
            const clientes = await ClienteService.buscarTodos();
            return res.json(clientes);
        } catch (error) {
            return res.status(500).json({ message: 'Erro interno ao buscar clientes' });
        }
    }

    static async updateCliente(req, res) {
        try {
            const foto = req.file ? req.file.filename : null;
            const clienteAtualizado = await ClienteService.atualizarCliente(req.params.id, req.body, foto);
            return res.json(clienteAtualizado);
        } catch (error) {
            return res.status(500).send('Erro ao atualizar cliente');
        }
    }

    static async deleteCliente(req, res) {
        try {
            const cliente = await ClienteService.deletarCliente(req.params.id);
            return res.json(cliente);
        } catch (error) {
            return res.status(500).send("Erro ao deletar cliente");
        }
    }
}

export default ClienteController;