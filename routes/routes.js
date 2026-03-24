import express from 'express';
import BarbeiroController from '../controllers/BarbeiroController.js'
import upload from "../config/multer.js";
import ServicoController from '../controllers/ServicoController.js';

const router = express.Router();

router.post('/barbeiros',upload.single('foto'), BarbeiroController.createBarbeiro);
router.get('/barbeiros', BarbeiroController.getAllBarbeiro);
router.put('/barbeiros/:id',upload.single('inputFoto'), BarbeiroController.updateBarbeiro);
router.delete('/barbeiros/:id',BarbeiroController.deleteBarbeiro);



router.post('/servicos',upload.single('inputFoto'), ServicoController.createServico);
router.get('/servicos', ServicoController.getAllServico);
router.put('/servicos/:id',upload.single('inputFoto'), ServicoController.updateServico);
router.delete('/servicos/:id',ServicoController.deleteServico);


export default router;