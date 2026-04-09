import Cliente from '../models/Cliente.js';
import path from 'path';
import __dirname from '../utils/pathUtils.js';

class ClienteController{
    
    static async createCliente(req,res){
        try{
                const {
                    nome,
                    sobrenome, 
                    telefone,
                    cpf, 
                    rg, 
                    endereco,
                    email,
                    senha,
                    ativo,
                    dataNascimento } = req.body;


        const clienteExistente = await Cliente.findByCPF(cpf);
        const foto = req.file ? req.file.filename : null;

        if (clienteExistente) {
    
            return res.status(400).json({ message: 'Barbeiro já cadastrado.' });
        }

        if (!foto) {
            return res.status(400).json({ message: 'Foto é obrigatória.' });
        }

        const novoCliente = new Cliente(
                    nome,
                    sobrenome, 
                    telefone,
                    cpf, 
                    rg, 
                    endereco,
                    email,
                    senha,
                    ativo,
                    foto, 
                    dataNascimento
        );

        await novoCliente.save();

        return res.status(201).json({
            message: 'Barbeiro cadastrado com sucesso'
        });
   
        }catch(error){
            if (error.code === 11000) {
              return res.status(400).json({
                error: "CPF já cadastrado"
              });
            }

            console.error('Erro ao cadastrar cliente', error);
            return res.status(500).send('Erro interno');
        }
    }

    static async getAllCliente(req, res) {
        try {
            const cliente = await Cliente.findAll();
            res.json(cliente);
        } catch (error) {
            console.error('Erro ao carregar os clientes:', error);
            res.status(500).json({message: 'Erro interno ao buscar cliente'})
        }
    }

   
static async updateCliente(req, res) {
  try {
    const { id } = req.params;

    const dados = { ...req.body };

    if (req.file) {
      dados.inputFoto = req.file.filename;
    }

    if (!dados.senha) {
        delete dados.senha;
    }

    await Cliente.update(id, dados);

    const clienteAtualizado = await Cliente.findById(id);

    return res.json(clienteAtualizado);

  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao atualizar cliente');
  }
}

static async deleteCliente(req, res) {
  try {
    const { id } = req.params;

    const cliente = await Cliente.update(id, {
      ativo: false
    });

    return res.json(cliente);

  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao deletar cliente");
  }
}

} export default  ClienteController