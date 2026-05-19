import PagamentoModel from "./PagamentoSchema.js";

class Pagamento{
    
    constructor(Agendamento, status, qrCode, valor, paymentId,dataPagamento)
    {
        this.Agendamento = Agendamento; 
        this.status = status; 
        this.qrCode = qrCode; 
        this.valor = valor; 
        this.paymentId = paymentId; 
        this.dataPagamento = dataPagamento;
    }

    async save(){
                const novoPagamento = new PagamentoModel({
                    Agendamento:  this.Agendamento, 
                    status: this.status, 
                    qrCode: this.qrCode, 
                    valor: this.valor, 
                    paymentId: this.paymentId, 
                    dataPagamento:this.dataPagamento
                });
                return await novoPagamento.save();
    }


    static async findOne(filtro){
        return await PagamentoModel.findOne(
            filtro
        );
}

    
    


} export default Pagamento; 