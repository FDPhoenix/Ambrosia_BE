//controllers/ReviewController.js
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const Guest = require("../models/Guest");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

exports.createReview = async (req, res) => {
    try {
        const { bookingId, rating, comment } = req.body;
        let userId = null;
        let guestId = null;

        if (!bookingId || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Missing bookingId or invalid rating!" });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found!" });
        }

        const existingReview = await Review.findOne({ bookingId });
        if (existingReview) {
            return res.status(400).json({ message: "You have already reviewed this booking!" });
        }

        if (booking.userId) {
            userId = booking.userId;
        } else {
            const guest = await Guest.findOne({ bookingId });

            if (!guest) {
                return res.status(400).json({ message: "Guest information not found!" });
            }

            guestId = guest._id;
        }

        const newReview = new Review({
            bookingId,
            userId,
            guestId,
            rating,
            comment,
        });

        await newReview.save();

        res.status(201).json({ message: "Review submitted successfully!", review: newReview });

    } catch (error) {
        console.error("Error creating review:", error.message);
        res.status(500).json({ message: "Error creating review!", error: error.message });
    }
};

//Admin Management
exports.getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate({
                path: "bookingId",
                select: "orderType bookingDate startTime endTime status",
            })
            .populate({
                path: "userId",
                select: "fullname email phoneNumber profileImage",
            })
            .populate({
                path: "guestId",
                select: "name email contactPhone",
            })
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Lấy danh sách đánh giá thành công!",
            totalReviews: reviews.length,
            reviews,
        });

    } catch (error) {
        console.error("Lỗi khi lấy danh sách đánh giá:", error.message);
        res.status(500).json({ message: "Lỗi khi lấy danh sách đánh giá!", error: error.message });
    }
};

exports.getReviews = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ message: "Đơn hàng không tồn tại!" });

        const reviews = await Review.find({ bookingId })
            .populate("userId", "fullname email") // Nếu là khách đăng nhập
            .populate("guestId", "name email") // Nếu là khách vãng lai
            .lean();

        res.status(200).json(reviews);
    } catch (error) {
        console.error("🚨 Lỗi khi lấy đánh giá:", error.message);
        res.status(500).json({ message: "Lỗi khi lấy đánh giá!", error: error.message });
    }
};



exports.replyToReview = async (req, res) => {
    try {
        const { reviewId, replyContent } = req.body;

        if (!replyContent) {
            return res.status(400).json({ message: "Reply content cannot be empty!" });
        }

        const review = await Review.findById(reviewId)
            .populate("userId", "email fullname")
            .populate("guestId", "email name");

        if (!review) {
            return res.status(404).json({ message: "Review not found!" });
        }

        let recipientEmail = null;
        let recipientName = "Customer";

        if (review.userId) {
            recipientEmail = review.userId.email;
            recipientName = review.userId.fullname;
        } else if (review.guestId) {
            recipientEmail = review.guestId.email;
            recipientName = review.guestId.name;
        }

        if (!recipientEmail) {
            return res.status(400).json({ message: "No email found for this review!" });
        }

        review.isReplied = true;
        await review.save();

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const getStarRating = (rating) => {
            return "⭐".repeat(rating);
        };
        const mailOptions = {
            from: `"Ambrosia" <${process.env.EMAIL_USER}>`,
            to: recipientEmail,
            subject: "Thank You for Your Review – Here's Our Response",
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px; background-color: #f9f9f9;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #007bff;">Response from Ambrosia</h1>
                <p style="color: #555;">We have received and responded to your review!</p>
            </div>
            <div style="padding: 15px; background-color: #ffffff; border-radius: 5px; border: 1px solid #ddd;">
                <p style="color: #333; font-size: 16px;"><strong>Hello ${recipientName},</strong></p>
                <p style="color: #555; line-height: 1.6;">Thank you for submitting your review. Here is our response:</p>
                <p style="color: #555; margin-top: 10px;"><strong>Your Review:</strong></p>
                 <div style="text-align: center; margin-top: 5px; margin-bottom: 6px;">
                    <span style="font-size: 32px; color: #f39c12; margin: 2px;">
                        ${getStarRating(review.rating)}
                    </span>
                </div>
                <blockquote style="background-color: #f1f8ff; padding: 15px; border-left: 4px solid #007bff; font-style: italic; margin: 10px 0;">
                    "${review.comment}"
                </blockquote>
                <p style="color: #555; padding-top: 16px; padding-bottom: 10px;"><strong>Ambrosia's Response:</strong></p>
                <blockquote style="background-color: #e6ffe6; padding: 15px; border-left: 4px solid #28a745; font-style: italic; margin: 10px 0;">
                    "${replyContent}"
                </blockquote>
                <p style="color: #555; line-height: 1.6; margin-top: 20px;">
                    If you have any questions, please feel free to contact us via email or click the button below to request support.
                </p>
                <div style="text-align: center; margin-top: 26px; margin-bottom: 20px;">
                    <a href="mailto:${process.env.EMAIL_USER}" style="background-color: #007bff; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;">Contact Us</a>
                </div>
            </div>
            <footer style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
                <p>© 2025 Ambrosia - Restaurant Management System. All rights reserved.</p>
                <p style="margin-top: 5px;">600 Nguyen Van Cu Extension, An Binh, Binh Thuy, Can Tho</p>
            </footer>
        </div>
    `,
        };


        const emailResult = await transporter.sendMail(mailOptions);
        console.log("📩 Email sent:", emailResult.response);

        res.status(200).json({ message: "Reply saved and email sent successfully!" });

    } catch (error) {
        console.error("🚨 Error responding to review:", error.message);
        res.status(500).json({ message: "Failed to send reply!", error: error.message });
    }
};


exports.filterReviews = async (req, res) => {
    try {
        let filter = {};

        // Lọc theo trạng thái đã phản hồi hay chưa
        if (req.query.isReplied) {
            filter.isReplied = req.query.isReplied === "true"; // Convert string to boolean
        }

        // Lọc theo số sao (rating)
        if (req.query.rating) {
            filter.rating = Number(req.query.rating); // Chuyển thành số
        }

        // Tìm kiếm và sắp xếp theo số sao từ 5 → 1
        let reviews = await Review.find(filter)
            .populate("bookingId userId guestId")
            .sort({ rating: -1 }); // Sắp xếp theo số sao giảm dần

        res.status(200).json({ success: true, data: reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi server", error });
    }
};
