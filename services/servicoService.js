import Servico from "../models/Servico.js";

class ServicoService {
    async criarServico(dados, nomeFoto) {
        // Regra de negócio: Verificar se já existe
        const servicoExistente = await Servico.findOneByProcura(dados.nome, dados.valor);
        if (servicoExistente) throw { status: 400, message: 'Serviço já cadastrado.' };
        if (!nomeFoto) throw { status: 400, message: 'Foto é obrigatória.' };

        const novoServico = new Servico(
            dados.nome,
            dados.descricao,
            dados.valor,
            dados.ativo,
            dados.duracao,
            nomeFoto
        );

        return await novoServico.save();
    }

    async buscarTodos() {
        return await Servico.findAll();
    }

    async atualizarServico(id, dados, nomeFoto) {
        const dadosAtualizados = { ...dados };
        if (nomeFoto) dadosAtualizados.foto = nomeFoto;
        
        return await Servico.update(id, dadosAtualizados);
    }

    async deletarServico(id) {
        return await Servico.delete(id);
    }
}

export default new ServicoService();