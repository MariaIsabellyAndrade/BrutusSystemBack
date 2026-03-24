import Barbeiro from "../models/Barbeiro.js";
import path from 'path';
import __dirname from '../utils/pathUtils.js';

class BarbeiroController{
    static async createBarbeiro(req,res){
        try{
                const {
                    nome,
                    sobrenome, 
                    dataNascimento,
                    dataAdmissao,
                    email,
                    senha,
                    cnpj,
                    endereco,
                    ativo ,
                    telefone
                    } = req.body;
        const barbeiroExistente = await Barbeiro.findByCnpj(cnpj);
        const foto = req.file ? req.file.filename : null;

        if (barbeiroExistente) {
            return res.status(400).json({ message: 'Barbeiro já cadastrado.' });
        }

        if (!foto) {
            return res.status(400).json({ message: 'Foto é obrigatória.' });
        }

        const novoBarbeiro = new Barbeiro(
                    nome,
                    sobrenome, 
                    dataNascimento,
                    dataAdmissao,
                    email,
                    senha,
                    cnpj,
                    endereco,
                    ativo ,
                    telefone,
                    foto
        );

        await novoBarbeiro.save();

        return res.status(201).json({
            message: 'Barbeiro cadastrado com sucesso'
        });
       // return res.redirect('/clientes-list');

        }catch(error){
             console.error('Erro ao cadastrar barbeiro', error);
            return res.status(500).send('Erro interno');
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
      dados.inputFoto = req.file.filename;
    }

    if (!dados.senha) {
        delete dados.senha;
    }
    // 🔥 ATUALIZA
    await Barbeiro.update(id, dados);

    // 🔥 BUSCA DE NOVO
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