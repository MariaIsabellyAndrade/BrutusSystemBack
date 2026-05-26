import ServicoModel from "./ServicoSchema.js";

class Servico{

    constructor(nome,descricao, valor,ativo,duracao, foto){
        this.nome = nome; 
        this.descricao= descricao;
        this.valor = valor; 
        this.ativo = ativo; 
        this.duracao = duracao; 
        this.foto = foto; 
    }

      async save(){
            const novoServico = new ServicoModel({
                nome: this.nome ,
                descricao:this.descricao,
                valor:this.valor,
                ativo: this.ativo,
                duracao: this.duracao,
                foto:this.foto
            });
            return await novoServico.save();
        }


            static async countAll() {
                return await ServicoModel.countDocuments();
            }
        
            static async countAtivos() {
                return await ServicoModel.countDocuments({ ativo: true });
            }
        
            static async countInativos() {
                return await ServicoModel.countDocuments({ ativo: false });
            }

        static async findAll() {
            return await ServicoModel.find();
        }
    
        static async findById(id) {
            return await ServicoModel.findById(id);
        }
        static async buscarPorIds(ids) {
            return await ServicoModel.find({
                _id: { $in: ids }
            });
        }

        static async findOneByProcura(nome, valor) {
            return await ServicoModel.findOne({
                nome: nome,
                valor: valor 
            });
        }
        static async update(id, dadosAtualizados) {
            return await ServicoModel.findByIdAndUpdate(id, dadosAtualizados, { new: true });
        }
    
        static async delete(id) 
        {
            return await ServicoModel.findByIdAndDelete(id);
        }


    static async calcularValorTotal(servicos) {

            let valorTotal = 0;

            for (const idServico of servicos) {

                const servicoEncontrado =
                    await ServicoModel.findById(idServico);

                if (!servicoEncontrado) {
                    throw new Error("Serviço não encontrado");
                }

                valorTotal += servicoEncontrado.valor;
            }

            return valorTotal;
    }


} export default Servico; 