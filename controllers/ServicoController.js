import path from 'path';
import __dirname from '../utils/pathUtils.js';
import Servico from '../models/Servico.js';

class ServicoController{

      static async createServico(req,res){
            try{
                    const {
                            nome,
                            descricao,
                            valor,
                            ativo,
                            duracao,
                        } = req.body;
            const servicoExistente = await Servico.findOneByProcura(nome, valor)
            const foto = req.file ? req.file.filename : null;
    
            if (servicoExistente) {
                return res.status(400).json({ message: 'Servico já cadastrado.' });
            }
    
            if (!foto) {
                return res.status(400).json({ message: 'Foto é obrigatória.' });
            }
    
            const novoServico = new Servico(
                        nome,
                        descricao,
                        valor,
                        ativo,
                        duracao,
                        foto
            );
    
            await novoServico.save();
    
            return res.status(201).json({
                message: 'Servico cadastrado com sucesso'
            });
           // return res.redirect('/clientes-list');
    
            }catch(error){
                 console.error('Erro ao cadastrar servico', error);
                return res.status(500).send('Erro interno');
            }
        }
    
        static async getAllServico(req, res) {
            try {
                const servico = await Servico.findAll();
                res.json(servico);
            } catch (error) {
                console.error('Erro ao carregar os servico:', error);
                res.status(500).json({message: 'Erro interno ao buscar barbeiro'})
            }
        }
    
       static async updateServico(req, res) {
        try {
            const { id } = req.params;
    
                    const {
                        nome,
                        descricao,
                        valor,
                        ativo,
                        duracao
                    } = req.body;
    
            const dados = {
                nome,
                descricao,
                valor,
                ativo,
                duracao
            };
    
            if (req.file) {
                dados.inputFoto = req.file.filename;
            }
    
            await Servico.update(id, dados);
    
            //res.redirect('/clientes-list');
    
        } catch (error) {
            console.error(error);
            res.status(500).send('Erro ao atualizar servico');
        }
    }
    
        static async deleteServico(req, res) {
            try {
                const { id } = req.params;
                await Servico.delete(id);
               // res.redirect('/clientes-list');
           
    
            } catch (error) {
                res.status(500).json({ message: 'Erro ao deletar' });
            }
        }


} export default ServicoController; 