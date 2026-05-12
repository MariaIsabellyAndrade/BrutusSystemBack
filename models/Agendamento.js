import AgendamentoModel from "./AgendamentoSchema.js";


class Agendamento{

        constructor(Usuario, Cliente, Barbeiro, Servicos, data, hora, status){
            this.Usuario = Usuario; 
            this.Cliente = Cliente; 
            this.Barbeiro = Barbeiro; 
            this.Servicos = Servicos; 
            this.data = data;
            this.hora= hora; 
            this.status = status;
        }



        
                async save(){
                    const novoAgendamento = new AgendamentoModel({
                        Usuario: this.Usuario,
                        Cliente: this.Cliente,
                        Barbeiro: this.Barbeiro, 
                        Servicos: this.Servicos, 
                        data: this.data, 
                        hora: this.hora, 
                        status: this.status
                    });
                    return await novoAgendamento.save();
                }
    
                static async findAll() {
                    return await AgendamentoModel.find();
                }
            
                static async findById(id) {
                    return await AgendamentoModel.findById(id);
                }
            

                static async update(id, dadosAtualizados) {
                    return await AgendamentoModel.findByIdAndUpdate(id, dadosAtualizados, { new: true });
                }
            
                static async delete(id) 
                {
                    return await AgendamentoModel.findByIdAndDelete(id);
                }

}export default Agendamento; 