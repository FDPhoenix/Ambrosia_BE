const cron = require('node-cron');
const Order = require('../models/Order');

cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();
        const expiryTime = new Date(now.getTime() - 15 * 60 * 1000);

        const ordersToFail = await Order.find({
            paymentStatus: { $eq: 'Pending' },
            createdAt: { $lt: expiryTime },
        });

        for (let order of ordersToFail) {
            order.paymentStatus = 'Failure';
            await order.save();
            console.log(`Order ${order._id} has been marked as failed due to timeout.`);
        }
    } catch (error) {
        console.error('Error while processing failed orders:', error);
    }
});