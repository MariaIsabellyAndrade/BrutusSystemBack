import express from 'express';
import BarbeiroController from '../controllers/BarbeiroController.js'
import upload from "../config/multer.js";
import ServicoController from '../controllers/ServicoController.js';
import ClienteController from '../controllers/ClienteController.js';
import Barbeiro from '../models/Barbeiro.js';
import Servico from '../models/Servico.js';
import Cliente from '../models/Cliente.js';

const router = express.Router();

router.post('/barbeiros',upload.single('foto'), BarbeiroController.createBarbeiro);
router.get('/barbeiros', BarbeiroController.getAllBarbeiro);
router.put('/barbeiros/:id',upload.single('foto'), BarbeiroController.updateBarbeiro);
router.delete('/barbeiros/:id',BarbeiroController.deleteBarbeiro);

router.get("/barbeiros/resumo", async (req, res) => {
  try {
    const total = await Barbeiro.countAll();
    const ativos = await Barbeiro.countAtivos();
    const inativos = await Barbeiro.countInativos();

    res.json({ total, ativos, inativos });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/servicos',upload.single('foto'), ServicoController.createServico);
router.get('/servicos', ServicoController.getAllServico);
router.put('/servicos/:id',upload.single('foto'), ServicoController.updateServico);
router.delete('/servicos/:id',ServicoController.deleteServico);

router.get("/servicos/resumo", async (req, res) => {
  try {
    const total = await Servico.countAll();
    const ativos = await Servico.countAtivos();
    const inativos = await Servico.countInativos();

    res.json({ total, ativos, inativos });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/clientes',upload.single('foto'), ClienteController.createCliente);
router.get('/clientes', ClienteController.getAllCliente);
router.put('/clientes/:id',upload.single('foto'), ClienteController.updateCliente);
router.delete('/clientes/:id',ClienteController.deleteCliente);

router.get("/clientes/resumo", async (req, res) => {
  try {
    const total = await Cliente.countAll();
    const ativos = await Cliente.countAtivos();
    const inativos = await Cliente.countInativos();

    res.json({ total, ativos, inativos });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;