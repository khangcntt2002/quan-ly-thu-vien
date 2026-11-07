<<<<<<< HEAD
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
=======
const express = require('express')
const app = express()
const path = require('path');
const books = require('./data/books.json');
const morgan = require('morgan');
const helmet = require('helmet');
const bodyParser = require('body-parser');

// Load environment variables from .env file
const dotenv = require('dotenv');
dotenv.config();

const cookieParser = require('cookie-parser');
const User = require('./models/mongoUser');
const { loadUser } = require('./middlewares/auth');

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('✅ Connected to MongoDB');
}).catch(err => {
    console.error('❌ Error connecting to MongoDB', err);
});

const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '/uploads'))
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});
const upload = multer({ storage: storage });


// Middleware
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(loadUser);

// View engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(morgan('combined'));

// === Cấu hình Helmet ĐÚNG ===
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      styleSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

app.use(bodyParser.urlencoded({ extended: true }));

// === ROUTES ===
const userRoute = require('./routes/userRoute');
app.use('/user', userRoute);

const bookRoute = require('./routes/bookRoute');
app.use('/book', bookRoute);

const auth = require('./routes/auth.routes');
// ⚠️ Tắt CSRF tạm cho Postman: bỏ csrfProtection ra khỏi app.use
app.use('/', auth);

// === Trang Chủ ===
app.get('/', (req, res) => {
    res.render('index', { title: 'Trang chủ' });
});

// === Trang About === ✅ ĐÃ THÊM
app.get('/about', (req, res) => {
    res.render('about', { title: 'Giới thiệu dự án' });
});
app.get('/muon-sach', (req, res) => {
  res.render('muon-sach', { title: 'Mượn sách' });
});

app.get('/tra-sach', (req, res) => {
  res.render('tra-sach', { title: 'Trả sách' });
});
// Trang chi tiết sách
app.get('/book/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.send('Không tìm thấy sách');
    res.render('book-detail', { 
      title: book.title, 
      book,
      user: req.session.user || undefined
    });
  } catch (err) {
    res.send('Lỗi: ' + err.message);
  }
});

// Xử lý mượn sách
app.get('/muon-sach/:bookId', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('muon-sach', { 
    title: 'Mượn sách', 
    bookId: req.params.id,
    user: req.session.user 
  });
});

// Xử lý trả sách
app.get('/tra-sach/:bookId', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('tra-sach', { 
    title: 'Trả sách', 
    bookId: req.params.id,
    user: req.session.user 
  });
});



// === 404 & Xử lý lỗi ===
app.use((req, res) => {
    res.status(404).render('error');
});

app.use((err, req, res, next) => {
    console.log(err.message);
    res.status(500).send(err.message);
});

app.listen(3000, () => {
    console.log('🚀 Server is running on port 3000');
});
>>>>>>> a217276ab276069c824ff82f497054eae34deaf0
