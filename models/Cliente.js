import ClienteModel from "./ClienteSchema.js";

class Cliente{

    constructor(nome, sobrenome,  telefone, cpf, rg, endereco, email,senha,ativo, foto, dataNascimento){
        this.nome = nome; 
        this.sobrenome = sobrenome; 
        this.telefone = telefone; 
        this.cpf = cpf; 
        this.rg = rg; 
        this.endereco = endereco; 
        this.email = email;
        this.senha = senha; 
        this.ativo = ativo; 
        this.foto = foto; 
        this.dataNascimento = dataNascimento; 
    }

        async save(){
            const novoCliente = new ClienteModel({
            nome: this.nome,
            sobrenome:this.sobrenome, 
            telefone:this.telefone,
            cpf: this.cpf,
            rg: this.rg,
            endereco: this.endereco,
            email:this.email,
            senha: this.senha,
            ativo:this.ativo ,
            foto:this.foto,
            dataNascimento:this.dataNascimento,
            });
            return await novoCliente.save();
        }
    static async countAll() {
        return await ClienteModel.countDocuments();
    }

    static async countAtivos() {
        return await ClienteModel.countDocuments({ ativo: true });
    }

    static async countInativos() {
        return await ClienteModel.countDocuments({ ativo: false });
    }
    
        
        static async findAll() {
            return await ClienteModel.find();
        }
    
        static async findById(id) {
            return await ClienteModel.findById(id);
        }
    
        static async update(id, dadosAtualizados) {
            return await ClienteModel.findByIdAndUpdate(id, dadosAtualizados, { new: true });
        }
    
            static async findByCPF(cpf) {
            return await ClienteModel.findOne({ cpf: cpf });
        }
        static async delete(id) 
        {
            return await ClienteModel.findByIdAndDelete(id);
        }


} export default Cliente 