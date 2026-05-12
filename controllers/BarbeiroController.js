import Barbeiro from "../models/Barbeiro.js";
import path from 'path';
import __dirname from '../utils/pathUtils.js';
import bcrypt from "bcrypt";
import Usuario from "../models/Usuario.js";
class BarbeiroController{
static async createBarbeiro(req, res) {
  let usuarioCriado = null;

  try {
    const {
      nome,
      sobrenome,
      dataNascimento,
      dataAdmissao,
      email,
      senha,
      cnpj,
      endereco,
      ativo,
      telefone
    } = req.body;

    const foto = req.file ? req.file.filename : null;

            const barbeiroExistente = await Barbeiro.findByCnpj(cnpj);
     
    
            if (barbeiroExistente) {
        
                return res.status(400).json({ message: 'Barbeiro já cadastrado.' });
            }
    
            if (!foto) {
                return res.status(400).json({ message: 'Foto é obrigatória.' });
            }

    // 🔐 CRIAR USUARIO PRIMEIRO
    const senhaHash = await bcrypt.hash(senha, 10);
    console.log("ANTES DE CRIAR USUARIO");

    usuarioCriado = await Usuario.create({
      email,
      senha: senhaHash,
      tipo: "BARBEIRO"
    });
    console.log("USUARIO CRIADO:", usuarioCriado);

    // 💈 CRIAR BARBEIRO
    const novoBarbeiro = new Barbeiro(
      nome,
      sobrenome,
      dataNascimento,
      dataAdmissao,
      email,
      senha,
      cnpj,
      endereco,
      ativo === "true",
      telefone, 
      foto, 
      usuarioCriado._id

      
    );



    await novoBarbeiro.save();

    return res.status(201).json({
      message: "Barbeiro criado com sucesso"
    });

  } catch (error) {
    console.error("Erro ao cadastrar barbeiro:", error);

    // 🔥 rollback
    if (usuarioCriado) {
      await Usuario.delete(usuarioCriado._id);
    }

    return res.status(500).json({
      erro: error.message
    });
  }
}
    static async getAllBarbeiro(req, res) {
        try {
            const barbeiro = await Barbeiro.findAll();
            res.json(barbeiro);
        } catch (error) {
            console.error('Erro ao carregar os barbeiro:', error);
            res.status(500).json({message: 'Erro interno ao buscar barbeiro'})
        }
    }

   
static async updateBarbeiro(req, res) {
  try {
    const { id } = req.params;

    const dados = { ...req.body };

    if (req.file) {
      dados.foto = req.file.filename;
    }

    if (!dados.senha) {
        delete dados.senha;
    }

    await Barbeiro.update(id, dados);

    const barbeiroAtualizado = await Barbeiro.findById(id);

    return res.json(barbeiroAtualizado);

  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao atualizar barbeiro');
  }
}

static async deleteBarbeiro(req, res) {
  try {
    const { id } = req.params;

    const barbeiroAtualizado = await Barbeiro.update(id, {
      ativo: false
    });

    return res.json(barbeiroAtualizado);

  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao deletar barbeiro");
  }
}

} export default BarbeiroController;