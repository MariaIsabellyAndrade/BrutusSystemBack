import UsuarioModel from "./UsuarioSchema.js";

class Usuario{
    constructor(email,senha,tipo, ativo){
        this.email = email; 
        this.senha = senha; 
        this.tipo=tipo; 
        this.ativo = ativo; 

    }

    async save(){
            const novoUsuario = new UsuarioModel({
                email: this.email, 
                senha: this.senha, 
                tipo:this.tipo, 
                ativo: this.ativo
            });
            return await novoUsuario.save();
        }

          static async findOne(filtro) {
    return await UsuarioModel.findOne(filtro);
  }

  static async findById(id) {
    return await UsuarioModel.findById(id);
  }

  static async create(dados) {
    return await UsuarioModel.create(dados);
  }
static async findByEmail(email) {
  return await UsuarioModel.findOne({ email });
}

static async delete(id) {
  return await UsuarioModel.findByIdAndDelete(id);
}




}export default Usuario; 