const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const { loadUser } = require('./middlewares/auth');

// Kết nối MongoDB. Server vẫn khởi động để báo lỗi cấu hình rõ ràng trong terminal.
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch((err) => console.error('❌ Error connecting to MongoDB:', err.message));
} else {
  console.warn('⚠️ Chưa cấu hình MONGO_URI trong file .env');
}

// Middleware phải đứng trước khai báo routes.
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:']
    }
  }
}));
app.use(loadUser);

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Routes chính của dự án.
app.use('/', require('./routes/auth.routes'));
app.use('/admin', require('./routes/admin.routes'));
app.use('/user', require('./routes/userRoute'));
app.use('/book', require('./routes/bookRoute'));
app.use('/borrow', require('./routes/borrowRoute'));

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
  res.status(404).render('error', {
    title: 'Không tìm thấy trang',
    message: 'Trang bạn yêu cầu không tồn tại.'
  });
});

// Xử lý lỗi chung.
app.use((err, req, res, next) => {
  console.error('❌ Lỗi ứng dụng:', err);
  if (res.headersSent) return next(err);
  res.status(500).render('error', {
    title: 'Đã xảy ra lỗi',
    message: 'Máy chủ gặp lỗi. Vui lòng thử lại.'
  });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`));
