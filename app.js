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