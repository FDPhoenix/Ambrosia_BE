const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');
const path = require('path');
const BookingDish = require("../models/BookingDish");
const Dish = require("../models/Dish");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });


require('dotenv').config();

const projectId = 'restaurantchatbot-rw9q';

let sessionClient;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    sessionClient = new dialogflow.SessionsClient({ credentials });
} else {
    const keyPath = path.join(__dirname, '../dialogflow-key.json');
    sessionClient = new dialogflow.SessionsClient({ keyFilename: keyPath });
}

const isValidImageUrl = (url) => {
    if (!url) return false;
    return url.match(/\.(jpeg|jpg|png|gif|webp)$/i) && url.startsWith('http');
};

async function getSmartReplyFromGemini(message) {
  try {
    const result = await geminiModel.generateContent(message);
    const response = result.response;
    return response.text();
  } catch (err) {
    return null;
  }
}

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

        let reply = "";
        let buttons = [];

        if (result.intent.displayName === 'AskAddress') {
            reply = "Địa chỉ nhà hàng Ambrosia: 600 Nguyễn Văn Cừ, An Bình, Bình Thủy, Cần Thơ.";
            buttons = [
              {
                dishId: "",
                title: "Xem bản đồ",
                price: "",
                image: "https://dummyimage.com/150",
                link: "https://yourdomain.com/address"
              }
            ];
            console.log("[LOG] Trả về button cho intent AskAddress:", buttons);
            return res.json({ reply, buttons });
        }

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
                    image: isValidImageUrl(dish.imageUrl) ? dish.imageUrl : 'https://dummyimage.com/150'
                }));

                if (bestSellers.length === 0) {
                    reply = "No best-selling dishes available this month.";
                    buttons = [];
                }
            } else {
                reply = "Sorry, I couldn't retrieve the list of best-selling dishes at this time.";
            }
            console.log("[LOG] Trả về buttons cho SuggestDishes:", buttons);
        }
        if (result.intent.isFallback) {
            reply = await getSmartReplyFromGemini(message) || "Sorry, I don't understand your request.";
            return res.json({ reply, buttons: [] });
        }
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
                            image: structFields.image?.stringValue,
                            link: structFields.link?.stringValue || undefined,
                            text: structFields.text?.stringValue || ""
                        };
                    })
                );
                console.log("[LOG] Trả về buttons từ Dialogflow richContent:", buttons);
            }
        });
        return res.json({ reply, buttons });
    } catch (err) {

        const geminiReply = await getSmartReplyFromGemini(req.body.message);
        if (geminiReply) {
            return res.json({ reply: geminiReply, buttons: [] });
        }
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