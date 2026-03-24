import BarbeiroModel from "./BarbeiroSchema.js";

class Barbeiro{
    constructor(nome,sobrenome,dataNascimento,dataAdmissao,email,senha,cnpj,endereco,ativo, telefone, foto){
        this.nome=nome; 
        this.sobrenome = sobrenome; 
        this.dataNascimento=dataNascimento;
        this.dataAdmissao=dataAdmissao; 
        this.email=email; 
        this.senha=senha;
        this.foto=foto;
        this.cnpj= cnpj;
        this.endereco=endereco; 
        this.ativo= ativo;
        this.telefone=telefone;
    }


    
    async save(){
        const novoBarbeiro = new BarbeiroModel({
        nome: this.nome,
        sobrenome:this.sobrenome, 
        dataNascimento:this.dataNascimento,
        dataAdmissao:this.dataAdmissao,
        email:this.email,
        senha: this.senha,
        cnpj: this.cnpj,
        endereco: this.endereco,
        ativo:this.ativo ,
        telefone:this.telefone,
         foto:this.foto,
        });
        return await novoBarbeiro.save();
    }

    
    static async findAll() {
        return await BarbeiroModel.find();
    }

    static async findById(id) {
        return await BarbeiroModel.findById(id);
    }

    static async update(id, dadosAtualizados) {
        return await BarbeiroModel.findByIdAndUpdate(id, dadosAtualizados, { new: true });
    }

        static async findByCnpj(cnpj) {
        return await BarbeiroModel.findOne({ cnpj: cnpj });
    }
    static async delete(id) 
    {
        return await BarbeiroModel.findByIdAndDelete(id);
    }

} export default Barbeiro;