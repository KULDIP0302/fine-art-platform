require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const connectDB = require('./config/db');
const seedAdmin = require('./scripts/seedAdmin');
const seedData = require('./scripts/seedData');

const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const artworkRoutes = require('./routes/artworkRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const disputeRoutes = require('./routes/disputeRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const authMiddleware = require('./middleware/authMiddleware');
const upload = require('./middleware/multer');
const paymentController = require('./controllers/paymentController');
const orderController = require('./controllers/orderController');
const disputeController = require('./controllers/disputeController');
const { runAutoDelivery } = require('./jobs/autoDelivery');

const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
  });
  socket.on('disconnect', () => {});
});

const start = async () => {
  try {
    await connectDB();
    if (process.env.NODE_ENV !== 'production') {
      await seedAdmin();
      await seedData();
    }

    app.set('io', io);

    app.use(cors());
    app.use(
      express.json({
        verify: (req, res, buf) => {
          req.rawBody = buf;
        },
      })
    );

    // Spec-friendly aliases (same handlers as /api/payments and /api/orders)
    app.post('/api/create-order', authMiddleware, paymentController.createRazorpayOrder);
    app.post('/api/verify-payment', authMiddleware, paymentController.verifyRazorpayPayment);
    app.put(
      '/api/order/ship',
      authMiddleware,
      upload.array('proofImages', 12),
      orderController.shipOrder
    );
    app.put('/api/order/confirm-delivery/:orderId', authMiddleware, orderController.confirmDelivery);
    app.post('/api/dispute', authMiddleware, upload.array('images', 8), disputeController.createDispute);

    app.use('/api/user', userRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/artworks', artworkRoutes);
    app.use('/api/categories', categoryRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/disputes', disputeRoutes);
    app.use('/api/payments', paymentRoutes);

    app.use('/uploads', express.static('uploads'));

    app.get('/api/health', (req, res) => {
      res.json({ ok: true });
    });

    cron.schedule('*/15 * * * *', () => {
      runAutoDelivery().catch((e) => console.error('autoDelivery', e));
    });

    const PORT = process.env.PORT || 5000;
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Error: port ${PORT} is already in use. Stop the other process or set a different PORT.`);
      } else {
        console.error('Server error:', error);
      }
      process.exit(1);
    });

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

start();
