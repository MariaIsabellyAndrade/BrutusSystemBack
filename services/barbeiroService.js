import Barbeiro from "../models/Barbeiro.js";
import Usuario from "../models/Usuario.js";
import bcrypt from "bcrypt";
import NotificacaoHorario from "../models/NotificacaoHorarioSchema.js";

class BarbeiroService {
    async criarBarbeiro(dados, nomeFoto) {
        const {
            nome,
            sobrenome,
            dataNascimento,
            dataAdmissao,
            email,
            senha,
            cnpj,
            endereco,
            ativo,
            telefone
        } = dados;

        // 1. Validações de Regra de Negócio
        const barbeiroExistente = await Barbeiro.findByCnpj(cnpj);
        if (barbeiroExistente) {
            throw { status: 400, message: "Barbeiro já cadastrado." };
        }

        if (!nomeFoto) {
            throw { status: 400, message: "Foto é obrigatória." };
        }

        let usuarioCriado = null;

        try {
            // 2. Criação do Usuário de acesso
            const senhaHash = await bcrypt.hash(senha, 10);
            
            usuarioCriado = await Usuario.create({
                email,
                senha: senhaHash,
                tipo: "BARBEIRO"
            });

            // 3. Criação do perfil do Barbeiro vinculado ao Usuário
            const novoBarbeiro = new Barbeiro(
                nome,
                sobrenome,
                dataNascimento,
                dataAdmissao,
                email,
                senha, // Mantendo o padrão do seu construtor original
                cnpj,
                endereco,
                ativo === "true" || ativo === true,
                telefone,
                nomeFoto,
                usuarioCriado._id
            );

            await novoBarbeiro.save();
            return { message: "Barbeiro criado com sucesso" };

        } catch (error) {
            // 🔥 Rollback: Se o usuário foi criado, mas o barbeiro falhou, desfaz a operação
            if (usuarioCriado) {
                await Usuario.delete(usuarioCriado._id);
            }
            throw error;
        }
    }

    async buscarTodos() {
        return await Barbeiro.findAll();
    }

    async atualizarBarbeiro(id, dados, nomeFoto) {
        const dadosAtualizacao = { ...dados };

        // Se veio uma foto nova, adiciona aos dados de atualização
        if (nomeFoto) {
            dadosAtualizacao.foto = nomeFoto;
        }

        // Se a senha veio vazia, remove para não sobreescrever com valor em branco
        if (!dadosAtualizacao.senha) {
            delete dadosAtualizacao.senha;
        }

        await Barbeiro.update(id, dadosAtualizacao);
        return await Barbeiro.findById(id);
    }

    async deletarBarbeiro(id) {
        // Soft delete: Apenas desativa o barbeiro no sistema
        return await Barbeiro.update(id, { ativo: false });
    }

    /*
     * Salva os slots bloqueados de um dia específico para um barbeiro.
     * Se já existe uma entrada para aquela data, substitui.
     * Se slots for vazio, remove a entrada do dia.
     */
    async salvarHorariosBloqueados(id, data, slots, motivos = [], usuarioId) {
        const barbeiro = await Barbeiro.findById(id);
        if (!barbeiro) throw { status: 404, message: "Barbeiro não encontrado" };
        if (!usuarioId || String(barbeiro.Usuario) !== String(usuarioId)) {
            throw { status: 403, message: "Você só pode alterar os seus próprios horários" };
        }

        const motivosPorHorario = new Map((Array.isArray(motivos) ? motivos : []).map((item) => [
            item.horario,
            String(item.motivo || "").trim()
        ]));
        const horariosNovos = [...new Set((Array.isArray(slots) ? slots : []).map((slot) =>
            typeof slot === "string" ? slot : slot?.horario
        ).filter(Boolean))];
        const entradaAnterior = (barbeiro.horariosBloqueados || []).find((item) => item.data === data);
        const slotsAntigos = (entradaAnterior?.slots || []).map((slot) =>
            typeof slot === "string" ? slot : slot?.horario
        ).filter(Boolean);
        const motivosAntigos = new Map((entradaAnterior?.motivos || []).map((item) => [item.horario, item.motivo || ""]));
        if (horariosNovos.some((horario) => !slotsAntigos.includes(horario) && !motivosPorHorario.get(horario))) {
            throw { status: 400, message: "Informe o motivo de cada novo horário bloqueado" };
        }

        const alteracoes = [];
        for (const horario of new Set([...slotsAntigos, ...horariosNovos])) {
            const estavaBloqueado = slotsAntigos.includes(horario);
            const ficaraBloqueado = horariosNovos.includes(horario);
            const motivoAntigo = motivosAntigos.get(horario) || "";
            const motivoNovo = motivosPorHorario.get(horario) || "";
            if (!estavaBloqueado && ficaraBloqueado) {
                alteracoes.push({ horario, acao: "bloqueado", motivo: motivoNovo });
            } else if (estavaBloqueado && !ficaraBloqueado) {
                alteracoes.push({ horario, acao: "liberado", motivo: motivoAntigo });
            } else if (estavaBloqueado && ficaraBloqueado && motivoAntigo !== motivoNovo) {
                alteracoes.push({ horario, acao: "motivo_alterado", motivo: motivoNovo });
            }
        }

        barbeiro.horariosBloqueados = (barbeiro.horariosBloqueados || []).filter((item) => item.data !== data);
        if (horariosNovos.length > 0) {
            barbeiro.horariosBloqueados.push({
                data,
                slots: horariosNovos,
                motivos: horariosNovos
                    .filter((horario) => motivosPorHorario.get(horario))
                    .map((horario) => ({ horario, motivo: motivosPorHorario.get(horario) }))
            });
        }
        await barbeiro.save();

        if (alteracoes.length > 0) {
            await NotificacaoHorario.create({
                barbeiroId: barbeiro._id,
                barbeiroNome: (barbeiro.nome + " " + (barbeiro.sobrenome || "")).trim(),
                data,
                mensagem: barbeiro.nome + " alterou " + alteracoes.length + " horário(s) em " + data + ".",
                alteracoes
            });
        }

        return {
            mensagem: "Horários bloqueados salvos com sucesso",
            data,
            slots: horariosNovos,
            motivos: horariosNovos
                .filter((horario) => motivosPorHorario.get(horario))
                .map((horario) => ({ horario, motivo: motivosPorHorario.get(horario) })),
            horariosBloqueados: barbeiro.horariosBloqueados
        };
    }

    /*
     * Retorna os slots bloqueados de um barbeiro para uma data.
     */
    async buscarHorariosBloqueados(id, data) {
        const barbeiro = await Barbeiro.findById(id);

        if (!barbeiro) {
            throw { status: 404, message: "Barbeiro não encontrado" };
        }

        const entrada = (barbeiro.horariosBloqueados || []).find((h) => h.data === data);
        const diaSemana = new Date(data + "T00:00:00Z").getUTCDay();
        const regrasDoDia = (barbeiro.bloqueiosRecorrentes || []).filter((regra) =>
            regra.ativo !== false &&
            (regra.diasSemana || []).includes(diaSemana) &&
            data >= regra.dataInicio &&
            (!regra.dataFim || data <= regra.dataFim)
        );
        const slotsPontuais = (entrada?.slots || []).map((slot) =>
            typeof slot === "string" ? slot : slot?.horario
        ).filter(Boolean);
        const motivos = new Map((entrada?.motivos || []).map((item) => [item.horario, item.motivo]));
        const recorrentes = new Set();
        for (const regra of regrasDoDia) {
            const inicioRegra = Number(regra.horaInicio.slice(0, 2)) * 60 + Number(regra.horaInicio.slice(3, 5));
            const fimRegra = Number(regra.horaFim.slice(0, 2)) * 60 + Number(regra.horaFim.slice(3, 5));
            for (let minuto = 8 * 60; minuto < 21 * 60 + 30; minuto += 30) {
                if (minuto < fimRegra && minuto + 30 > inicioRegra) {
                    const horario = String(Math.floor(minuto / 60)).padStart(2, "0") + ":" + String(minuto % 60).padStart(2, "0");
                    recorrentes.add(horario);
                    const motivoAtual = motivos.get(horario);
                    motivos.set(horario, motivoAtual ? motivoAtual + " · " + regra.motivo : regra.motivo);
                }
            }
        }

        return {
            barbeiroId: id,
            data,
            slots: [...new Set([...slotsPontuais, ...recorrentes])],
            motivos: [...motivos].map(([horario, motivo]) => ({ horario, motivo })),
            recorrencias: regrasDoDia
        };
    }

    async listarBloqueiosParaAdmin() {
        const barbeiros = await Barbeiro.findAll();
        const bloqueios = barbeiros.flatMap((barbeiro) => (barbeiro.horariosBloqueados || [])
            .filter((dia) => (dia.slots || []).length > 0)
            .map((dia) => ({
                barbeiroId: barbeiro._id,
                barbeiroNome: (barbeiro.nome + " " + (barbeiro.sobrenome || "")).trim(),
                data: dia.data,
                slots: (dia.slots || []).map((slot) => {
                    const horario = typeof slot === "string" ? slot : slot?.horario;
                    const motivo = (dia.motivos || []).find((item) => item.horario === horario)?.motivo || "";
                    return { horario, motivo };
                })
            })));
        const recorrencias = barbeiros.flatMap((barbeiro) => (barbeiro.bloqueiosRecorrentes || [])
            .filter((regra) => regra.ativo !== false)
            .map((regra) => ({
                ...regra.toObject(),
                barbeiroId: barbeiro._id,
                barbeiroNome: (barbeiro.nome + " " + (barbeiro.sobrenome || "")).trim()
            })));
        return { bloqueios, recorrencias };
    }

    async listarBloqueiosRecorrentes(id, usuarioId) {
        const barbeiro = await Barbeiro.findById(id);
        if (!barbeiro) throw { status: 404, message: "Barbeiro não encontrado" };
        if (!usuarioId || String(barbeiro.Usuario) !== String(usuarioId)) throw { status: 403, message: "Você só pode consultar as suas próprias regras" };
        return barbeiro.bloqueiosRecorrentes || [];
    }

    async salvarBloqueiosRecorrentes(id, regras, usuarioId) {
        const barbeiro = await Barbeiro.findById(id);
        if (!barbeiro) throw { status: 404, message: "Barbeiro não encontrado" };
        if (!usuarioId || String(barbeiro.Usuario) !== String(usuarioId)) {
            throw { status: 403, message: "Você só pode alterar as suas próprias regras" };
        }
        if (!Array.isArray(regras)) throw { status: 400, message: "Lista de regras inválida" };

        const normalizadas = regras.map((regra) => {
            const diasSemana = [...new Set((regra.diasSemana || []).map(Number))];
            const motivo = String(regra.motivo || "").trim();
            if (!diasSemana.length || diasSemana.some((dia) => !Number.isInteger(dia) || dia < 0 || dia > 6)) {
                throw { status: 400, message: "Selecione ao menos um dia válido da semana" };
            }
            if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(regra.horaInicio) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(regra.horaFim) || regra.horaFim <= regra.horaInicio) {
                throw { status: 400, message: "Faixa de horário inválida" };
            }
            if (!/^\d{4}-\d{2}-\d{2}$/.test(regra.dataInicio) || (regra.dataFim && regra.dataFim < regra.dataInicio)) {
                throw { status: 400, message: "Período da regra inválido" };
            }
            if (!motivo || motivo.length > 300) throw { status: 400, message: "Informe um motivo com até 300 caracteres" };
            return {
                ...(regra._id ? { _id: regra._id } : {}),
                diasSemana,
                horaInicio: regra.horaInicio,
                horaFim: regra.horaFim,
                dataInicio: regra.dataInicio,
                dataFim: regra.dataFim || "",
                motivo,
                ativo: true
            };
        });

        const anteriores = (barbeiro.bloqueiosRecorrentes || []).map((regra) => regra.toObject());
        const anterioresPorId = new Map(anteriores.map((regra) => [String(regra._id), regra]));
        const novasPorId = new Set(normalizadas.filter((regra) => regra._id).map((regra) => String(regra._id)));
        const alteracoes = [];
        for (const regra of normalizadas) {
            const anterior = regra._id ? anterioresPorId.get(String(regra._id)) : null;
            const descricao = "Recorrência · " + regra.diasSemana.join(",") + " · " + regra.horaInicio + "–" + regra.horaFim;
            const assinatura = (item) => JSON.stringify({ diasSemana: [...item.diasSemana].sort(), horaInicio: item.horaInicio, horaFim: item.horaFim, dataInicio: item.dataInicio, dataFim: item.dataFim || "", motivo: item.motivo });
            if (!anterior) alteracoes.push({ horario: descricao, acao: "bloqueado", motivo: regra.motivo });
            else if (assinatura(anterior) !== assinatura(regra)) alteracoes.push({ horario: descricao, acao: "regra_alterada", motivo: regra.motivo });
        }
        for (const anterior of anteriores) {
            if (!novasPorId.has(String(anterior._id))) {
                alteracoes.push({ horario: "Recorrência · " + anterior.diasSemana.join(",") + " · " + anterior.horaInicio + "–" + anterior.horaFim, acao: "liberado", motivo: anterior.motivo });
            }
        }

        barbeiro.bloqueiosRecorrentes = normalizadas;
        await barbeiro.save();
        if (alteracoes.length) {
            await NotificacaoHorario.create({
                barbeiroId: barbeiro._id,
                barbeiroNome: (barbeiro.nome + " " + (barbeiro.sobrenome || "")).trim(),
                data: normalizadas[0]?.dataInicio || new Date().toISOString().slice(0, 10),
                mensagem: barbeiro.nome + " alterou " + alteracoes.length + " regra(s) de bloqueio recorrente.",
                alteracoes
            });
        }
        return barbeiro.bloqueiosRecorrentes;
    }

    async listarNotificacoesHorarios(naoLidas = false) {
        return NotificacaoHorario.find(naoLidas ? { lida: false } : {})
            .sort({ createdAt: -1 }).limit(100).lean();
    }

    async marcarNotificacaoHorarioLida(id) {
        return NotificacaoHorario.findByIdAndUpdate(id, { lida: true }, { new: true });
    }
}

export default new BarbeiroService();