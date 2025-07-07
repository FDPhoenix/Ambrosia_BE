const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');
const path = require('path');
const BookingDish = require("../models/BookingDish");
const Dish = require("../models/Dish");

require('dotenv').config();

const projectId = 'restaurantchatbot-rw9q';
const keyPath = path.join(__dirname, '../dialogflow-key.json');
const sessionClient = new dialogflow.SessionsClient({ keyFilename: keyPath });

const isValidImageUrl = (url) => {
    if (!url) return false;
    return url.match(/\.(jpeg|jpg|png|gif)$/i) && url.startsWith('http');
};

exports.sendMessage = async (req, res) => {
    const { message } = req.body;
    const sessionId = uuid.v4();
    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: message,
                languageCode: "vi,en",
            },
        },
    };

    try {
        const [response] = await sessionClient.detectIntent(request);
        const result = response.queryResult;

        console.log("Dialogflow Response:", JSON.stringify(result, null, 2));

        let reply = "";
        let buttons = [];

        if (result.intent.displayName === 'SuggestDishes') {
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();

            const bestSellersResponse = await exports.getBestSellersInternal({ limit: 3, month, year });

            if (bestSellersResponse.success) {
                const bestSellers = bestSellersResponse.data;

                reply = `List of best-selling dishes for ${month}/${year}:\n`;
                buttons = bestSellers.map((dish) => ({
                    dishId: dish.dishId.toString(),
                    title: dish.name,
                    price: `${dish.price.toLocaleString('en-US')} USD`,
                    image: isValidImageUrl(dish.imageUrl) ? dish.imageUrl : 'https://via.placeholder.com/150'
                }));

                if (bestSellers.length === 0) {
                    reply = "No best-selling dishes available this month.";
                    buttons = [];
                }
            } else {
                reply = "Sorry, I couldn't retrieve the list of best-selling dishes at this time.";
            }
        } else {
            result.fulfillmentMessages.forEach((message) => {
                if (message.text) {
                    reply = message.text.text[0] || "";
                }

                if (message.payload?.fields?.richContent) {
                    const richContent = message.payload.fields.richContent.listValue.values || [];
                    buttons = richContent.flatMap((outerItem) =>
                        (outerItem.listValue?.values || []).map((innerItem) => {
                            const structFields = innerItem.structValue?.fields || {};
                            return {
                                dishId: structFields.dishId?.stringValue || "",
                                title: structFields.title?.stringValue || "",
                                price: structFields.price?.stringValue || "",
                                image: structFields.image?.stringValue || "https://via.placeholder.com/150"
                            };
                        })
                    );
                }
            });
        }

        return res.json({ reply, buttons });
    } catch (err) {
        console.error("Dialogflow Error:", err);
        return res.status(500).json({ reply: "Sorry, I didn't understand your request." });
    }
};

exports.getBestSellersInternal = async ({ limit = 10, month, year }) => {
    try {
        let dateFilter = {};
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59, 999);
            dateFilter = {
                "booking.createdAt": {
                    $gte: startDate,
                    $lte: endDate,
                },
            };
        }

        const bestSellers = await BookingDish.aggregate([
            { $lookup: { from: "bookings", localField: "bookingId", foreignField: "_id", as: "booking" } },
            { $unwind: "$booking" },
            { $match: dateFilter },
            { $group: { _id: "$dishId", totalQuantity: { $sum: "$quantity" } } },
            { $sort: { totalQuantity: -1 } },
            { $limit: parseInt(limit) },
            { $lookup: { from: "dishes", localField: "_id", foreignField: "_id", as: "dishDetails" } },
            { $unwind: "$dishDetails" },
            {
                $project: {
                    dishId: "$_id",
                    name: "$dishDetails.name",
                    imageUrl: "$dishDetails.imageUrl",
                    price: "$dishDetails.price",
                    totalQuantity: 1,
                },
            },
        ]);

        const filterMessage = month && year
            ? `List of best-selling dishes for ${month}/${year}`
            : "List of all-time best-selling dishes";

        return { success: true, message: filterMessage, data: bestSellers };
    } catch (error) {
        console.error("Error fetching bestsellers:", error.message);
        return { success: false, message: "Error fetching bestsellers!", error: error.message };
    }
};

exports.getBestSellers = async (req, res) => {
    const { limit, month, year } = req.query;

    try {
        const result = await exports.getBestSellersInternal({ limit, month, year });
        res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching bestsellers:", error.message);
        return res.status(500).json({
            success: false,
            message: "Error fetching bestsellers!",
            error: error.message,
        });
    }
};