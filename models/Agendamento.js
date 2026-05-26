import AgendamentoModel from "./AgendamentoSchema.js";


class Agendamento{

        constructor(Usuario, Cliente, Barbeiro, data, hora, status, valorTotal){
            this.Usuario = Usuario; 
            this.Cliente = Cliente; 
            this.Barbeiro = Barbeiro; 
            this.data = data;
            this.hora= hora; 
            this.status = status;
            this.valorTotal = valorTotal;
        }

                async save(){
                    const novoAgendamento = new AgendamentoModel({
                        Usuario: this.Usuario,
                        Cliente: this.Cliente,
                        Barbeiro: this.Barbeiro, 
                        data: this.data, 
                        hora: this.hora, 
                        status: this.status,
                        valorTotal: this.valorTotal
                    });
                    return await novoAgendamento.save();
                }
    

        static async verificarHorario(barbeiroId, data, hora) {

            return await AgendamentoModel.findOne({
                Barbeiro: barbeiroId,
                data: data,
                hora: hora,
                status: "Agendado"
            });
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

                static async findPorBarbeiroEData(barbeiroId, data) {

    const inicioDia = new Date(data);
    inicioDia.setHours(0, 0, 0, 0);

    const fimDia = new Date(data);
    fimDia.setHours(23, 59, 59, 999);

    return await AgendamentoModel.find({
        Barbeiro: barbeiroId,
        data: {
            $gte: inicioDia,
            $lte: fimDia
        }
    });
}
}export default Agendamento; 