import Cliente from '../models/Cliente.js';
import path from 'path';
import __dirname from '../utils/pathUtils.js';
import Usuario from '../models/Usuario.js';
import bcrypt from "bcrypt";

class ClienteController{
    
static async createCliente(req, res) {
    let usuarioCriado = null;

    try {
        const {
            nome,
            sobrenome,
            telefone,
            cpf,
            rg,
            endereco,
            ativo,
            dataNascimento,
            email,
            senha
        } = req.body;

        console.log(req.body);

        const clienteExistente = await Cliente.findByCPF(cpf);
        const foto = req.file ? req.file.filename : null;

        if (clienteExistente) {
            return res.status(400).json({ message: 'Cliente já cadastrado.' });
        }

        if (!foto) {
            return res.status(400).json({ message: 'Foto é obrigatória.' });
        }

        // 🔐 cria usuário
        const senhaHash = await bcrypt.hash(senha, 10);

        usuarioCriado = await Usuario.create({
            email,
            senha: senhaHash,
            tipo: "CLIENTE",
            ativo: true
        });

        console.log("USUARIO CRIADO:", usuarioCriado);

        // 🔥 cria cliente (FORMA CORRETA)
        const novoCliente = new Cliente(
            nome,
            sobrenome,
            telefone,
            cpf,
            rg,
            endereco,
            ativo === "true", // ⚠️ converter string pra boolean
            foto,
            dataNascimento,
            usuarioCriado._id
        );

        await novoCliente.save();

        return res.status(201).json({
            message: 'Cliente cadastrado com sucesso'
        });

    } catch (error) {

        // 🔥 rollback se der erro
        if (usuarioCriado && usuarioCriado._id) {
            await Usuario.findByIdAndDelete(usuarioCriado._id);
        }

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
      dados.foto = req.file.filename;
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