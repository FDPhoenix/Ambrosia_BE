require('./config/passportConfig');
require('./config/cronJob');
const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./utils/db");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require('./utils/swagger-output.json');
const dishRouter = require("./routes/DishRouter");
const cors = require("cors");
const authRouter = require("./routes/AuthRouter");
const oauth2 = require("./routes/oauth2");
const feedbackRouter = require("./routes/FeedbackRouter");
const historyRouter = require("./routes/HistoryRouter");
const user = require('./routes/UserRouter')
const cookieParser = require('cookie-parser');
const passport = require("passport");
const rankRouter = require("./routes/RankRouter");
const bookingRouter = require("./routes/BookingRouter");
const reviewRouter = require("./routes/ReviewRouter");
const categoryRouter = require('./routes/CategoryRouter');
const employeeRouter = require('./routes/EmployeeRouter');
const tableRouter = require("./routes/TableRouter");
const cartRouter = require('./routes/CartRouter');
const ingredientRouter = require('./routes/IngredientRouter');
const chatRouter = require('./routes/ChatbotRouter');
const revenueRouter = require('./routes/RevenueRouter');
const orderRouter = require("./routes/OrderRouter");
const paymentRouter = require("./routes/PaymentRouter");
const voucherRouter = require('./routes/VoucherRouter');
const bestsellerRouter = require("./routes/BestsellerRouter");
const reservationRouter = require('./routes/ReservationRouter');
const newsRouter = require('./routes/NewsRouter')
const session = require("express-session");

dotenv.config({});

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(
  session({
    secret: process.env.SECRET_KEY || "your_session_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/auth', authRouter);
app.use("", oauth2);
app.use("/dishes", dishRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/feedback', feedbackRouter);
app.use('/api/history', historyRouter);
app.use("/user", user);
app.use("/rank", rankRouter);
app.use("/bookings", bookingRouter);
app.use("/reviews", reviewRouter);
app.use('/category', categoryRouter);
app.use("/api/employees", employeeRouter);
app.use("/api/tables", tableRouter);
app.use('/cart', cartRouter);
app.use('/ingredients', ingredientRouter);
app.use('/api/chat', chatRouter);
app.use("/api/revenue", revenueRouter);
app.use("/", orderRouter);
app.use('/payment', paymentRouter);
app.use('/vouchers', voucherRouter);
app.use('/dish', bestsellerRouter);
app.use('/reservation', reservationRouter);
app.use("/news", newsRouter);

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.listen(process.env.PORT, () => {
  connectDB();
  console.log(`Server running on port: ${process.env.PORT}`);
  console.log(
    `Swagger Docs available at http://localhost:${process.env.PORT}/api-docs`
  );
});
