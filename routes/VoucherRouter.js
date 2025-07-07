const express = require('express');
const { listAllVoucher, getVoucherByCode, addVoucher, updateVoucher, updateVoucherStatus } = require('../controllers/VoucherController');
const voucherRouter = express.Router();

voucherRouter.use(express.json());

voucherRouter.get('/', listAllVoucher);
voucherRouter.get('/code/:code', getVoucherByCode);
voucherRouter.post('/', addVoucher);
voucherRouter.put('/:id', updateVoucher);
voucherRouter.put('/status/:id', updateVoucherStatus)

module.exports = voucherRouter;