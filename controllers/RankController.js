const Rank = require("../models/Rank");
const Order = require("../models/Order");
const User = require("../models/User");
const Voucher = require("../models/Voucher");
const jwt = require("jsonwebtoken");
const mongoose = require('mongoose');

const SECRET_KEY = process.env.SECRET_KEY;

const generateVoucherCode = () => {
    return 'RANKUP-' + Math.random().toString(36).substr(2, 8).toUpperCase();
};

exports.viewRank = async (req, res) => {
    try {
        const authHeader = req.headers["authorization"];
        if (!authHeader) {
            return res.status(401).json({ success: false, message: "Access denied. No token provided." });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, SECRET_KEY);
        const userId = decoded.id;

        const user = await User.findById(userId).populate('rankId').lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const totalSpending = user.totalSpending || 0;

        let userRank = user.rankId;
        if (!userRank) {
            userRank = await Rank.findOne({
                minSpending: { $lte: totalSpending }
            })
                .sort({ minSpending: -1 })
                .lean();

            if (!userRank) {
                userRank = await Rank.findOne()
                    .sort({ minSpending: 1 })
                    .lean();
            }

            await User.findByIdAndUpdate(userId, {
                rankId: userRank._id
            });
        }

        const voucher = await Voucher.findOne({
            userId: userId,
            isUsed: false,
            expiresAt: { $gt: new Date() }
        }).lean();

        return res.status(200).json({
            success: true,
            message: `Your current rank is ${userRank.rankName}.`,
            totalSpending,
            rank: userRank,
            voucher: voucher ? {
                code: voucher.code,
                discount: voucher.discount
            } : "No available voucher"
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


exports.checkAndUpdateRank = async (req, res) => {
    try {
        const { userId, newSpending } = req.body;

        const user = await User.findById(userId).populate('rankId');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        user.totalSpending = user.totalSpending + newSpending;
        await user.save();

        const ranks = await Rank.find().sort({ minSpending: 1 });

        const currentRank = user.rankId;
        let newRank = null;

        for (const rank of ranks) {
            if (user.totalSpending >= rank.minSpending) {
                newRank = rank;
            } else {
                break;
            }
        }

        if (!newRank) {
            user.rankId = currentRank;
            await user.save();
            return { rankUpdated: false, user };
        }

        if (!currentRank || currentRank._id.toString() !== newRank._id.toString()) {
            user.rankId = newRank._id;
            await user.save();

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            const newVoucher = new Voucher({
                userId: user._id,
                code: generateVoucherCode(),
                discount: 10,
                isUsed: false,
                expiresAt,
            });

            await newVoucher.save();

            return res.status(200).json({
                message: "Update successfully",
                newRank: newRank.rankName,
                success: true
            })
        }
    } catch (error) {
        console.log(error.message)

        res.status(500).json({
            message: 'Internal Server Error',
            success: false,
        });
    }
}


exports.getAllRanks = async (req, res) => {
    try {
        const ranks = await Rank.find();

        const ranksWithTotalSpending = await Promise.all(
            ranks.map(async (rank) => {
                const totalSpending = await User.aggregate([
                    { $match: { rankId: rank._id } },
                    { $group: { _id: null, totalSpending: { $sum: "$totalSpending" } } }
                ]);

                const spendingAmount = totalSpending.length > 0 ? totalSpending[0].totalSpending : 0;

                return {
                    _id: rank._id,
                    rankName: rank.rankName,
                    minSpending: rank.minSpending,
                    benefits: rank.benefits,
                    totalSpending: spendingAmount,
                };
            })
        );

        ranksWithTotalSpending.sort((a, b) => a.minSpending - b.minSpending);

        res.json(ranksWithTotalSpending);
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error });
    }
};


exports.createRank = async (req, res) => {
    try {
        const { rankName, minSpending, benefits } = req.body;


        const existingRank = await Rank.findOne({ rankName });
        if (existingRank) {
            return res.status(400).json({
                message: "Rank name already exists",
                success: false,
            });
        }


        const newRank = await Rank.create({
            rankName,
            minSpending,
            benefits,
        });


        res.status(201).json({
            message: "Rank created successfully",
            rank: newRank,
            success: true,
        });
    } catch (error) {
        console.error("Error creating rank:", error);
        res.status(500).json({ message: "Error creating rank", error });
    }
};


exports.updateRank = async (req, res) => {
    try {
        const { id } = req.params;
        const { rankName, minSpending, benefits } = req.body;

        const updatedRank = await Rank.findByIdAndUpdate(
            id,
            { rankName, minSpending, benefits },
            { new: true }
        );

        if (!updatedRank) {
            return res.status(404).json({ message: "Rank not found" });
        }

        res.json({ message: "Rank updated successfully", rank: updatedRank });
    } catch (error) {
        res.status(500).json({ message: "Error updating rank", error });
    }
};
