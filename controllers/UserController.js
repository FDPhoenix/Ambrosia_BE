const jwt = require('jsonwebtoken');
const User = require("../models/User");
const bcrypt = require('bcrypt');
const cloudinary = require("../config/cloudinary");
const upload = require("../middlewares/multer");
const SECRET_KEY = process.env.SECRET_KEY;
const UserRole = require('../models/UserRole');

exports.getProfile = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ message: "Access denied. No token provided.", success: false });

        const decoded = jwt.verify(token, SECRET_KEY);
        const user = await User.findById(decoded.id).populate("rankId");

        if (!user) return res.status(404).json({ message: "User not found", success: false });

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                fullname: user.fullname,
                email: user.email,
                phoneNumber: user.phoneNumber,
                profileImage: user.profileImage,
                rank: user.rankId ? user.rankId.rankName : "N/A",
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(401).json({ message: "Access denied. No token provided.", success: false });

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, SECRET_KEY);
        const user = await User.findById(decoded.id);

        if (!user) return res.status(404).json({ message: "User not found", success: false });

        const { fullname, phoneNumber, profileImage } = req.body;
        let updated = false;

        if (fullname && fullname !== user.fullname) {
            user.fullname = fullname;
            updated = true;
        }
        if (phoneNumber && phoneNumber !== user.phoneNumber) {
            user.phoneNumber = phoneNumber;
            updated = true;
        }
        if (profileImage && profileImage !== user.profileImage) {
            user.profileImage = profileImage;
            updated = true;
        }

        // if (!updated) return res.status(400).json({ success: false, message: "No changes detected." });

        await user.save();
        res.status(200).json({ success: true, message: "Profile updated successfully", user });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(401).json({ message: "Access denied. No token provided.", success: false });

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, SECRET_KEY);
        const user = await User.findById(decoded.id);

        if (!user) return res.status(404).json({ message: "User not found", success: false });

        const { oldPassword, newPassword } = req.body;
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: "Incorrect current password", success: false });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.status(200).json({ message: "Password changed successfully", success: true });
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

exports.uploadProfileImage = async (req, res) => {
    try {
        const authHeader = req.headers["authorization"];
        if (!authHeader) {
            return res.status(401).json({ message: "Access denied. No token provided.", success: false });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, SECRET_KEY);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No image file provided", success: false });
        }

        const stream = cloudinary.uploader.upload_stream(
            { folder: "restaurant_images" },
            async (error, result) => {
                if (error) {
                    console.error("Error uploading to Cloudinary:", error);
                    return res.status(500).json({ message: "Upload failed", success: false });
                }
                user.profileImage = result.secure_url;
                await user.save();

                return res.status(200).json({
                    success: true,
                    message: "Profile image uploaded successfully",
                    profileImage: result.secure_url,
                });
            }
        );

        stream.end(req.file.buffer);
    } catch (error) {
        console.error("Error uploading profile image:", error);
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

exports.banUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({
            message: "User not found", success: false
        });

        user.isActive = !user.isActive;
        await user.save();

        const statusMessage = user.isActive ? "User Unband successfully " : "User Banned successfully";
        res.status(200).json({
            success: true,
            message: statusMessage
        });
    } catch (error) {
        console.error("Error toggling user status:", error);
        res.status(500).json({
            message: "Internal Server Error",
            success: false
        });
    }
};

exports.addUser = async (req, res) => {
    try {
        const { fullname, email, password, phoneNumber, rankId } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email already exists", success: false });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            fullname,
            email,
            password: hashedPassword,
            phoneNumber,
            rankId,
            profileImage: "https://example.com/default-profile.png",
        });

        await newUser.save();

        res.status(201).json({ success: true, message: "User added successfully", user: newUser });
    } catch (error) {
        console.error("Error adding user:", error);
        res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

exports.viewUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).populate("rankId");

        if (!user) return res.status(404).json({ message: "User not found", success: false });

        res.status(200).json({
            success: true,
            user: {
                fullname: user.fullname,
                email: user.email,
                phoneNumber: user.phoneNumber,
                profileImage: user.profileImage,
                rank: user.rankId ? user.rankId.rankName : "N/A",
                createdAt: user.createdAt,
                isActive: user.isActive,
            },
        });
    } catch (error) {
        console.error("Error viewing user profile:", error);
        res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const customerRoleId = '67ac64bbe072694cafa16e78';

        // Tìm tất cả userId có roleId là customerRoleId
        const userRoles = await UserRole.find({ 
            roleId: customerRoleId 
        }).lean();

        // Lấy danh sách userId từ userRoles
        const userIds = userRoles.map(userRole => userRole.userId);

        // Tìm tất cả user với userIds và populate rankId
        const users = await User.find({ 
            _id: { $in: userIds }
        })
        .populate('rankId')
        .lean();

        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No customers found'
            });
        }

        // Format dữ liệu trả về
        const customerList = users.map(user => ({
            id: user._id,
            email: user.email,
            fullname: user.fullname,
            phoneNumber: user.phoneNumber,
            profileImage: user.profileImage,
            createdAt: user.createdAt,
            isActive: user.isActive,
            totalSpending: user.totalSpending,
            rank: user.rankId ? {
                rankName: user.rankId.rankName,
                minSpending: user.rankId.minSpending,
                benefits: user.rankId.benefits
            } : null
        }));

        return res.status(200).json({
            success: true,
            message: 'Customers retrieved successfully',
            data: customerList,
            total: customerList.length
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

exports.editUserInfo = async (req, res) => {
    try {
        const { userId } = req.params;
        const { fullname, email, phoneNumber } = req.body;
        let imageUrl;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        console.log("User found:", user);

        if (req.file) {
            console.log("File received:", req.file);

            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "user_profile_images" },
                    (error, result) => {
                        if (error) {
                            console.error("Error uploading to Cloudinary:", error);
                            reject(error);
                        } else {
                            console.log("Cloudinary upload result:", result);
                            resolve(result);
                        }
                    }
                );
                stream.end(req.file.buffer);
            });

            imageUrl = result.secure_url;
            console.log("Image URL:", imageUrl);
        } else {
            console.log("No file uploaded.");
        }

        user.fullname = fullname || user.fullname;
        user.email = email || user.email;
        user.phoneNumber = phoneNumber || user.phoneNumber;
        if (imageUrl) user.profileImage = imageUrl;

        await user.save();

        console.log("User after update:", user);
        res.status(200).json({
            message: "User information updated successfully",
            user,
            success: true
        });
    } catch (error) {
        console.log("Error:", error);

        res.status(500).json({
            message: "Internal Server Error",
            success: false
        });
    }
};