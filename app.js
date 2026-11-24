const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

// Một số mạng/máy dùng DNS nội bộ không tra được địa chỉ mongodb+srv của Atlas.
// Đặt DNS_SERVERS=8.8.8.8,1.1.1.1 trong .env nếu gặp lỗi "querySrv ECONNREFUSED".
if (process.env.DNS_SERVERS) {
  require('dns').setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean));
}

const app = express();
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const { loadUser, requireAuth, requireRole } = require('./middlewares/auth');
const orderStatus = require('./utils/order-status');

// Kết nối MongoDB. Server vẫn khởi động để báo lỗi cấu hình rõ ràng trong terminal.
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch((err) => console.error('❌ Error connecting to MongoDB:', err.message));
} else {
  console.warn('⚠️ Chưa cấu hình MONGO_URI trong file .env');
}

// Dùng chung trong mọi view (nhãn và màu trạng thái đơn hàng).
app.locals.orderStatus = orderStatus;

app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));
app.use(helmet({
  // Mặc định của helmet là no-referrer: khi đó trình duyệt gửi "Origin: null" cho form POST cùng trang
  // và làm hỏng kiểm tra Origin (lỗi 403 "Nguồn gửi biểu mẫu không hợp lệ").
  referrerPolicy: { policy: 'same-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:'],
      // Mặc định của helmet ép nâng cấp http -> https, làm hỏng CSS/JS khi chạy http://localhost.
      upgradeInsecureRequests: null
    }
  }
}));
app.use(loadUser);

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Routes chính của dự án.
app.use('/', require('./routes/auth.routes'));
app.use('/admin', require('./routes/admin.routes'));
// Route cũ dùng MySQL: chỉ admin được truy cập.
app.use('/user', requireAuth, requireRole('admin'), require('./routes/userRoute'));
app.use('/book', require('./routes/bookRoute'));
app.use('/borrow', require('./routes/borrowRoute'));
app.use('/cart', require('./routes/cart.routes'));
app.use('/orders', require('./routes/order.routes'));
// API JSON (đăng nhập bằng Bearer token): /api/v1/...
app.use('/api/v1', require('./routes/api'));

// Trang chủ và trang giới thiệu.
app.get('/', async (req, res) => {
  try {
    const Book = require('./models/book');
    const featuredBooks = await Book.find().sort({ createdAt: -1 }).limit(4).lean();
    return res.render('index', {
      title: 'Trang chủ',
      activePage: 'home',
      user: req.user,
      featuredBooks
    });
  } catch (err) {
    console.error('Không tải được sách nổi bật:', err.message);
    return res.render('index', {
      title: 'Trang chủ',
      activePage: 'home',
      user: req.user,
      featuredBooks: []
    });
  }
});
app.get('/about', (req, res) => res.render('about', { title: 'Giới thiệu dự án', user: req.user }));

// Trang hướng dẫn là trang nội dung tĩnh, không cần truy vấn database.
app.get('/muon-sach', (req, res) => res.render('muon-sach', {
  title: 'Hướng dẫn mượn sách', user: req.user
}));
app.get('/tra-sach', (req, res) => res.render('tra-sach', {
  title: 'Hướng dẫn trả sách', user: req.user
}));

// 404: chỉ chạy khi không route nào phía trên khớp.
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Khong tim thay API' });
  }
  res.status(404).render('error', {
    status: 404,
    title: 'Không tìm thấy trang',
    message: 'Trang bạn yêu cầu không tồn tại.'
  });
});

// Xử lý lỗi chung. Lỗi có err.expose (ví dụ cart.invalid) được hiện đúng mã và nội dung.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500) console.error('❌ Lỗi ứng dụng:', err);
  const message = err.expose && status < 500
    ? err.message
    : 'Máy chủ gặp lỗi. Vui lòng thử lại.';
  if (req.path.startsWith('/api/')) {
    return res.status(status).json({ success: false, message });
  }
  res.status(status).render('error', {
    status,
    title: status >= 500 ? 'Đã xảy ra lỗi' : 'Yêu cầu không hợp lệ',
    message
  });
});

const PORT = Number(process.env.PORT) || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`));
}

module.exports = app;
