const Voucher = require('../models/Voucher');

exports.listAllVoucher = async (req, res) => {
    try {
        const vouchers = await Voucher.find().sort({ expiresAt: -1 });

        res.status(200).json({
            message: 'List success',
            success: true,
            data: vouchers
        });
    } catch (error) {
        console.log(error.message)

        res.status(500).json({
            message: 'Internal Server Error',
            success: false,
        });
    }
}

exports.getVoucherByCode = async (req, res) => {
    try {
        const { code } = req.params;
        
        const currentDate = new Date();

        const voucher = await Voucher.findOne({
            code: code,
            isUsed: false,
            expiresAt: { $gt: currentDate }
        }).populate('userId', 'username email');

        if (!voucher) {
            const expiredVoucher = await Voucher.findOne({
                code: code,
                expiresAt: { $lte: currentDate }
            });

            if (expiredVoucher) {
                return res.status(400).json({
                    success: false,
                    message: 'Voucher code has expired',
                    expiredAt: expiredVoucher.expiresAt
                });
            }

            return res.status(404).json({
                success: false,
                message: 'Voucher code is invalid or has already been used'
            });
        }

        res.status(200).json({
            message: 'Get voucher success',
            success: true,
            data: voucher
        });
    } catch (error) {
        console.log(error.message)

        res.status(500).json({
            message: 'Internal Server Error',
            success: false,
        });
    }
}

exports.addVoucher = async (req, res) => {
    try {
        const { userId, code, discount, expiresAt } = req.body;

        if (!code || !discount || !expiresAt) {
            return res.status(400).json({
                message: 'Missing required field: code, discount, expiresAt',
                success: false
            });
        }

        const existingVoucher = await Voucher.findOne({ code });
        if (existingVoucher) {
            return res.status(400).json({
                message: `Voucher '${code}' already exists`,
                success: false
            });
        }

        const newVoucher = new Voucher({
            userId,
            code,
            discount,
            expiresAt: new Date(expiresAt),
            isUsed: false
        });

        const savedVoucher = await newVoucher.save();

        res.status(200).json({
            message: 'Add success',
            success: true,
            data: savedVoucher
        });
    } catch (error) {
        console.log(error.message)

        res.status(500).json({
            message: 'Internal Server Error',
            success: false,
        });
    }
}

exports.updateVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (updateData.code) {
            const existingVoucher = await Voucher.findOne({
                code: updateData.code,
                _id: { $ne: id }
            });

            if (existingVoucher) {
                return res.status(400).json({
                    success: false,
                    message: 'Voucher code already exists'
                });
            }
        }

        const updatedVoucher = await Voucher.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedVoucher) {
            return res.status(404).json({
                success: false,
                message: 'Voucher not found'
            });
        }

        res.status(200).json({
            message: "Update success",
            success: true,
            data: updatedVoucher
        });
    } catch (error) {
        console.log(error.message)

        res.status(500).json({
            message: 'Internal Server Error',
            success: false,
        });
    }
}

exports.updateVoucherStatus = async (req, res) => {
    try {
        const { id } = req.params;
        console.log("Updating voucher with ID:", id);

        const voucher = await Voucher.findById(id)
        if (!voucher) {
            return res.status(404).json({
                message: 'Voucher not found',
                success: false
            });
        }

        voucher.isUsed = true;
        await voucher.save();

        return res.status(200).json({
            success: true,
            message: `Voucher status update successful`,
            data: voucher,
        });
    } catch (error) {
        console.log(error.message)

        res.status(500).json({
            message: 'Internal Server Error',
            success: false,
        });
    }
}