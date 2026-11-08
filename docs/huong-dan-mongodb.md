# Kết nối dự án MSHV với MongoDB Atlas bằng Mongoose

Hướng dẫn nhánh books và bài tập nhánh user

Ngày biên soạn 12 tháng 10 năm 2026

Tài liệu hướng dẫn chuyển danh sách sách từ data/books.json sang MongoDB Atlas, sau đó tổ chức nhánh books thành route, controller và model. Người học làm theo lời giải books trước, rồi tự áp dụng cấu trúc tương tự cho nhánh user.

Dự án hiện vẫn chạy bằng JSON. Những đoạn mã trong tài liệu là các bước bạn sẽ thực hiện, chưa được tự động áp dụng vào app.js. Bạn cần tự tạo tài khoản Atlas và điền thông tin kết nối riêng.

## Kết quả cần đạt

- Collection books thuộc database mshv có 20 sách mẫu.
- Mỗi sách có id dạng chuỗi riêng biệt; URL chi tiết hiện tại không thay đổi.
- Máy chủ chỉ mở cổng sau khi kết nối MongoDB thành công.
- Chạy lại script nhập dữ liệu không tạo thêm sách trùng và không ghi đè sách đang có.
- Lỗi không tìm thấy sách trả HTTP 404; lỗi truy vấn được xử lý riêng.

## Lộ trình thực hành

1. Chuẩn bị dự án và hiểu cấu trúc dữ liệu.
2. Tạo cluster, tài khoản database và quyền truy cập mạng trên Atlas.
3. Cài thư viện, cấu hình biến môi trường và bảo vệ mật khẩu.
4. Tạo model Book và hàm kết nối.
5. Nhập dữ liệu mẫu, tách bookRoute và bookController dùng model Book.
6. Khởi động, kiểm thử và xử lý các lỗi thường gặp.
7. Tự xây dựng nhánh user theo đề bài và tiêu chí nghiệm thu.

Trong tài liệu, “nhánh” nghĩa là nhóm chức năng /books hoặc /user, không phải nhánh Git. Bài user quản lý hồ sơ người dùng; đăng nhập, đăng ký tài khoản và upload không thuộc phạm vi bắt buộc.

---PAGE---
# 1 Chuẩn bị dự án và dữ liệu

Mở terminal tại thư mục MSHV, nơi có app.js và package.json. Dự án sử dụng CommonJS với require, Express 5 và Pug. Không chuyển sang import hoặc sửa type trong package.json khi làm theo tài liệu.

Kiểm tra Node trước khi cài thư viện. Mongoose 9 yêu cầu Node từ 20.19.0 trở lên [1]. Chọn bản Node còn được hỗ trợ và tương thích với phiên bản pnpm trên máy.

~~~sh
node -v
pnpm -v
~~~

## Các tệp liên quan

- app.js đăng ký middleware, route và lắng nghe cổng 4000.
- data/books.json chứa 20 object sách, được giữ lại làm nguồn nhập dữ liệu.
- views/books.pug render danh sách sách.
- views/mixins/book-card.pug dùng book.id để tạo URL chi tiết.
- views/book-detail.pug hiển thị một sách và liên kết tới nguồn.
- views/error.pug nhận status và message để hiển thị lỗi.

## Quy ước dữ liệu cần giữ

Mỗi sách có tám trường chuỗi: id, title, author, category, edition, description, url và image. Không cần đổi tên trường hoặc sửa giao diện khi chuyển sang Mongoose.

id là mã đọc được, ví dụ eloquent-javascript. MongoDB có thêm _id kiểu ObjectId để định danh document. Hai trường khác nhau; khi người dùng mở /books/eloquent-javascript, phải truy vấn theo id, không dùng findById.

url là trang giới thiệu hoặc nguồn sách; image là đường dẫn ảnh bìa. MongoDB chỉ lưu chuỗi URL, không tự tải hoặc lưu tệp ảnh. Một số nguồn chỉ cung cấp thông tin sách, không cho đọc toàn bộ miễn phí.

Sao lưu app.js và dữ liệu trước khi sửa. Nếu dùng Git, tạo commit hoặc nhánh riêng cho bài thực hành; không đưa tệp .env vào bản sao được chia sẻ.

---PAGE---
# 2 Tạo cơ sở dữ liệu trên MongoDB Atlas

Truy cập https://cloud.mongodb.com và đăng nhập hoặc tạo tài khoản. Nhãn menu có thể thay đổi; mục tiêu là có một cluster, một database user và IP Access List cho phép máy chạy Node kết nối [2].

## Tạo project và cluster

1. Tạo project, ví dụ MSHV.
2. Chọn tạo database deployment hoặc cluster. Nếu tài khoản có lựa chọn Free phù hợp bài học thì chọn lựa chọn đó; xem kỹ chi phí hiển thị trước khi xác nhận.
3. Chọn nhà cung cấp và khu vực phù hợp; đặt tên cluster như mshv-cluster.
4. Chờ trạng thái cluster sẵn sàng. Không cần tự cài MongoDB Server trên máy để kết nối Atlas.

## Tạo tài khoản database

Vào phần Security và tìm Database Access hoặc Database Users, rồi thêm database user. Chọn xác thực bằng mật khẩu, đặt username như mshv_app và mật khẩu mạnh riêng.

Tài khoản này khác tài khoản đăng nhập website Atlas. Với bài thực hành nhập dữ liệu, cấp quyền readWrite trên database mshv. Tránh cấp quyền quản trị toàn hệ thống khi không cần [3]. Không đưa mật khẩu vào ảnh chụp, bài nộp hoặc đoạn chat.

## Cho phép địa chỉ mạng của máy

Tìm Network Access hoặc IP Access List, chọn Add IP Address rồi Add Current IP Address. Chỉ thêm địa chỉ IP công cộng của máy hoặc mạng đang chạy Node. Không dùng 127.0.0.1 cho kết nối Atlas.

Khi đổi Wi-Fi, VPN hoặc máy chủ triển khai, kiểm tra lại IP. Không chọn 0.0.0.0/0 cho bài học thông thường vì lựa chọn đó cho phép mọi địa chỉ Internet thử kết nối; vẫn cần mật khẩu nhưng phạm vi truy cập bị mở rộng [4].

## Lấy chuỗi kết nối

Tại cluster, chọn Connect, rồi Drivers và Node.js. Sao chép URI do Atlas cung cấp. Giữ nguyên hostname và các tham số của URI; thay username, password và thêm tên database mshv trước dấu hỏi nếu chưa có [5].

---PAGE---
# 3 Cài thư viện và bảo vệ thông tin kết nối

Tại thư mục MSHV, cài Mongoose và dotenv. Các lệnh dưới đây dùng pnpm. Nếu chuyển từ lockfile npm đang có, có thể chạy pnpm import trước để tạo pnpm-lock.yaml; sau đó thống nhất dùng một trình quản lý gói trong nhóm.

~~~sh
pnpm import
pnpm add mongoose@9 dotenv
~~~

Chỉ chạy pnpm import khi còn package-lock.json và chưa có pnpm-lock.yaml cần giữ. Commit lockfile pnpm theo quy ước của nhóm; không chỉnh tay phiên bản trong node_modules.

## Tạo tệp môi trường

Tạo .env ở cùng cấp app.js. Dòng sau chỉ là mẫu, không phải thông tin kết nối hoạt động:

~~~env
MONGODB_URI="mongodb+srv://<user>:<pass>@<host>/mshv"
PORT=4000
~~~

Thay URI mẫu bằng URI thật từ Atlas. Giữ các tham số như retryWrites, w và appName nếu Atlas cung cấp. Không giữ nguyên dấu < > trong giá trị thật.

Nếu username hoặc password chứa ký tự đặc biệt như @, :, /, # hoặc %, phải percent-encode riêng thành phần đó. Ví dụ ký tự @ trong mật khẩu thành %40. Không encode toàn bộ URI và không encode lại mật khẩu đã được encode. Dấu ngoặc kép của .env không thay thế bước này.

## Tạo hoặc cập nhật gitignore

Thêm các dòng sau vào .gitignore ở thư mục gốc. Nếu tệp đã có nội dung thì bổ sung, không ghi đè toàn bộ:

~~~text
node_modules/
.env
.env.*
!.env.example
~~~

Tạo .env.example với URI mẫu không có thông tin thật để hướng dẫn người khác. dotenv nạp biến từ .env vào process.env [6]. Nếu bí mật đã từng bị commit hoặc chia sẻ, cần đổi mật khẩu Atlas; thêm .gitignore không xóa bí mật khỏi lịch sử Git.

---PAGE---
# 4 Tạo model Book

Tạo thư mục models, sau đó tạo models/Book.js với toàn bộ mã sau. Model mô tả cấu trúc sách và ánh xạ rõ tới collection books [7].

~~~js
const mongoose = require('mongoose');

const text = { type: String, required: true, trim: true };
const httpsUrl = {
    ...text,
    validate: {
        validator(value) {
            try {
                return new URL(value).protocol === 'https:';
            } catch {
                return false;
            }
        },
        message: 'URL phai la dia chi HTTPS hop le'
    }
};

const bookSchema = new mongoose.Schema({
    id: {
        ...text,
        unique: true,
        match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    },
    title: { ...text },
    author: { ...text },
    category: { ...text },
    edition: { ...text },
    description: { ...text },
    url: { ...httpsUrl },
    image: { ...httpsUrl }
}, {
    collection: 'books',
    id: false
});

module.exports = mongoose.model('Book', bookSchema);
~~~

Tùy chọn id: false tắt virtual id mặc định của Mongoose; trường id thật trong schema vẫn được lưu. _id vẫn được MongoDB/Mongoose tạo bình thường. Không dùng tùy chọn _id: false.

unique: true khai báo unique index, không phải validator. Ở các bước sau, await Book.init() đợi index sẵn sàng trước khi ghi dữ liệu [8]. Quy tắc HTTPS kiểm tra định dạng URL, không bảo đảm máy chủ ảnh luôn hoạt động.

---PAGE---
# 5 Tạo hàm kết nối MongoDB

Tạo thư mục config và tệp config/db.js. Hàm này được dùng chung cho ứng dụng và script nhập dữ liệu.

~~~js
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({
    path: path.join(__dirname, '..', '.env'),
    quiet: true
});

mongoose.set('bufferCommands', false);

async function connectDB() {
    if (!process.env.MONGODB_URI) {
        throw new Error('Thieu MONGODB_URI trong .env');
    }
    await mongoose.connect(process.env.MONGODB_URI, {
        dbName: 'mshv',
        serverSelectionTimeoutMS: 10000
    });
    console.log('Da ket noi MongoDB database mshv');
}

module.exports = connectDB;
~~~

dbName cố định đích đến là mshv, kể cả khi URI ghi một database khác. Khi đổi tên database, phải sửa đồng bộ dbName, quyền database user và hướng dẫn nhập dữ liệu.

serverSelectionTimeoutMS giới hạn thời gian chọn máy chủ khoảng 10 giây; đây không phải cơ chế thử kết nối vô hạn hoặc giới hạn thời gian cho mọi loại truy vấn. Không thêm các tùy chọn cũ useNewUrlParser và useUnifiedTopology vào ví dụ Mongoose hiện hành [9].

## Nguyên tắc sử dụng kết nối

Gọi connectDB một lần lúc khởi động. Không mở rồi đóng kết nối trong mỗi request /books. Ứng dụng cần giữ connection pool để phục vụ nhiều request; script seed riêng sẽ đóng kết nối sau khi hoàn tất.

Không in MONGODB_URI hoặc toàn bộ đối tượng cấu hình ra console. Khi cần hỗ trợ, chỉ cung cấp tên lỗi và mô tả đã loại bỏ mật khẩu, hostname riêng và thông tin nhạy cảm.

---PAGE---
# 6 Nhập sách mẫu vào Atlas

Tạo scripts/seed-books.js. Script kiểm tra dữ liệu trước khi kết nối và dùng $setOnInsert để chỉ thêm sách chưa tồn tại. Nó không xóa collection và không cập nhật sách có cùng id.

~~~js
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Book = require('../models/Book');
const books = require('../data/books.json');

async function seed() {
    try {
        if (new Set(books.map(b => b.id)).size !== books.length) {
            throw new Error('JSON co id trung');
        }
        for (const book of books) {
            const error = new Book(book).validateSync();
            if (error) throw error;
        }
        await connectDB();
        await Book.init();
        let inserted = 0;
        for (const book of books) {
            const result = await Book.updateOne(
                { id: book.id },
                { $setOnInsert: book },
                { upsert: true, runValidators: true }
            );
            inserted += result.upsertedCount;
        }
        console.log('So sach moi:', inserted);
        console.log('Tong sach:', await Book.countDocuments());
    } catch (error) {
        console.error('Nhap du lieu that bai:', error.name);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

seed();
~~~

Chạy từ thư mục gốc: node scripts/seed-books.js. Với collection trống, kết quả dự kiến là 20 sách mới và tổng 20. Chạy lần hai có 0 sách mới, tổng vẫn 20. Nếu collection đã có dữ liệu khác, tổng có thể lớn hơn 20.

Script không phải transaction cho toàn bộ 20 sách. Nếu mất mạng giữa chừng, một phần có thể đã được nhập; sửa kết nối và chạy lại an toàn. Để sửa nội dung sách đã tồn tại, cần thao tác cập nhật riêng có chủ đích; chạy seed lại không lấy nội dung mới từ JSON ghi đè dữ liệu đó.

---PAGE---
# 7 Tổ chức nhánh books theo từng trách nhiệm

Thay vì viết truy vấn và render ngay trong app.js, tách nhánh books thành các tệp sau. Model Book đã được tạo ở mục 4; không tạo thêm một model khác chứa mảng JSON.

~~~text
MSHV/
  app.js
  config/db.js
  models/Book.js
  controllers/bookController.js
  routes/bookRoute.js
  scripts/seed-books.js
  data/books.json
  views/books.pug
  views/book-detail.pug
  views/mixins/book-card.pug
~~~

## Vai trò của từng thành phần

- app.js cấu hình Express, mount router, kết nối database và mở cổng.
- routes/bookRoute.js ánh xạ HTTP method và đường dẫn tới controller.
- controllers/bookController.js nhận request, gọi model, chọn view và xử lý trường hợp không tìm thấy.
- models/Book.js khai báo schema, index và model để truy vấn MongoDB.
- View Pug nhận dữ liệu từ controller để dựng HTML; không truy vấn database.

Với GET /books/clean-code, app.js chuyển request vào bookRoute; route /:id gọi getBookById; controller tìm Book có id clean-code rồi render book-detail. Nếu truy vấn lỗi, controller chuyển lỗi tới middleware lỗi chung.

## Những phần phải giữ nguyên

Giữ model ở mục 4, kết nối ở mục 5 và seed ở mục 6. Giữ các trường dữ liệu, đường dẫn /books và /books/:id, cũng như locals books hoặc book gửi vào view. Vì vậy mixin bookCard và hai trang Pug không cần đổi.

Không chuyển res.render vào model, không gọi mongoose.connect trong controller và không để app.js tiếp tục chứa hai handler books cũ. Express.Router cho phép gom route theo nhóm và mount tại một tiền tố chung [12].

---PAGE---
# 7a Viết controller cho sách

Tạo thư mục controllers và tệp controllers/bookController.js. Dán toàn bộ mã sau. Hai hàm được export để router sử dụng; controller chỉ import model, không đọc JSON.

~~~js
const Book = require('../models/Book');

exports.getBooks = async (req, res, next) => {
    try {
        const books = await Book.find({})
            .sort({ title: 1 }).lean();
        res.render('books', {
            title: 'Danh sách sách',
            books,
            activePage: 'books'
        });
    } catch (error) {
        next(error);
    }
};

exports.getBookById = async (req, res, next) => {
    try {
        const book = await Book.findOne({
            id: req.params.id
        }).lean();
        if (!book) {
            return res.status(404).render('error', {
                title: 'Không tìm thấy sách',
                status: 404,
                message: 'Không tìm thấy sách bạn yêu cầu.',
                activePage: 'books'
            });
        }
        res.render('book-detail', {
            title: book.title, book, activePage: 'books'
        });
    } catch (error) {
        next(error);
    }
};
~~~

lean() trả object JavaScript thuần, phù hợp dữ liệu chỉ đọc đưa vào Pug [10]. Giữ nguyên các view và mixin. Thứ tự sách đổi sang sắp xếp theo title; đó không phải lỗi mất dữ liệu.

---PAGE---
# 7b Viết router và ghép vào ứng dụng

Tạo routes/bookRoute.js. Router chỉ đăng ký URL và chuyển việc xử lý sang các hàm đã export:

~~~js
const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

router.get('/', bookController.getBooks);
router.get('/:id', bookController.getBookById);

module.exports = router;
~~~

Trong app.js, xóa dòng require('./data/books.json') và xóa toàn bộ hai khối app.get('/books', ...) và app.get('/books/:id', ...) cũ. Thêm các import sau ở đầu tệp:

~~~js
const connectDB = require('./config/db');
const Book = require('./models/Book');
const bookRoute = require('./routes/bookRoute');
~~~

Sau middleware chung và trước middleware 404, mount router một lần:

~~~js
app.use('/books', bookRoute);
~~~

Giữ nguyên mount /user đang có, không khai báo lại userRoute. Import Book ở app.js chỉ phục vụ await Book.init() trong hàm start ở mục 8; mọi truy vấn sách cho request nằm trong controller.

## Các lỗi tách tệp thường gặp

- Trong bookRoute chỉ viết / và /:id. Viết lại /books sẽ tạo URL /books/books.
- Truyền bookController.getBooks, không gọi getBooks() khi đăng ký route.
- Đường dẫn từ controller sang model là ../models/Book, không phải ./models/Book.
- Đặt mount router trước middleware 404, nếu không request sẽ bị chặn trước.
- Tên export và tên gọi trong router phải khớp chính xác, kể cả chữ hoa.

Tiếp tục mục 8 để thêm xử lý lỗi và khởi động sau khi kết nối MongoDB. Chưa chạy app ngay nếu vẫn còn khối app.listen cũ hoặc thiếu connectDB.

---PAGE---
# 8 Xử lý lỗi và khởi động đúng thứ tự

Giữ middleware 404 hiện có gần cuối app.js. Ngay sau middleware 404, thêm middleware lỗi bốn tham số dưới đây. Không gửi chi tiết lỗi database hoặc URI ra trình duyệt [11].

~~~js
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    console.error('Loi xu ly request:', error.name);
    res.status(500).render('error', {
        title: 'Lỗi hệ thống',
        status: 500,
        message: 'Không thể tải dữ liệu. Vui lòng thử lại.'
    });
});
~~~

Xóa khối app.listen(4000, ...) cũ ở cuối tệp và thay bằng khối sau. Trong toàn bộ app.js chỉ còn một chỗ gọi app.listen.

~~~js
async function start() {
    try {
        await connectDB();
        await Book.init();
        const port = Number(process.env.PORT || 4000);
        const server = app.listen(port, () => {
            console.log('Server dang chay tai cong', port);
        });
        server.on('error', () => {
            console.error('Khong the mo cong HTTP');
            process.exit(1);
        });
    } catch (error) {
        console.error('Khoi dong that bai:', error.name);
        process.exit(1);
    }
}

start();
~~~

## Thứ tự cuối cùng trong app

Khai báo thư viện và middleware chung; đăng ký các route; middleware 404; middleware lỗi; cuối cùng gọi start. Máy chủ không mở cổng nếu kết nối Atlas hoặc tạo index thất bại.

Giữ nguyên các phần upload, login, register và userRoute. Bài thực hành này chưa làm cho cơ chế xác thực mẫu trở thành hệ thống đăng nhập an toàn để triển khai công khai.

---PAGE---
# 9 Chạy thử và xác nhận dữ liệu thật

Hoàn thành model, config, seed và sửa app.js trước khi chạy kiểm tra. Không đưa tệp .env hoặc ảnh chứa URI thật vào bài nộp.

## Kiểm tra cú pháp và chạy seed

~~~sh
node --check app.js
node --check models/Book.js
node --check controllers/bookController.js
node --check routes/bookRoute.js
node --check config/db.js
node --check scripts/seed-books.js
node scripts/seed-books.js
~~~

Trong Atlas, mở Browse Collections hoặc Data Explorer. Chọn database mshv và collection books; refresh nếu cần. Kiểm tra có 20 document khi bắt đầu từ database trống, mỗi document có _id và id riêng.

## Khởi động ứng dụng

Dừng server demo cũ bằng Ctrl+C trong terminal đang chạy nó, rồi chạy:

~~~sh
pnpm start
~~~

Script start hiện có dùng nodemon app.js. Nếu không cần tự khởi động lại khi sửa tệp, chạy node app.js. Sau khi đổi .env, hãy khởi động lại server; không dựa vào việc trình duyệt tự tải lại.

## Kiểm tra từng tình huống

1. Mở http://localhost:4000/books và kiểm tra hiển thị 20 sách.
2. Chọn Xem chi tiết, ví dụ /books/eloquent-javascript; kiểm tra tên sách và ảnh đúng.
3. Mở /books/khong-ton-tai; kết quả phải là HTTP 404, không phải 500.
4. Chạy seed lần hai; số sách mới là 0 và số lượng không tăng.
5. Trong database bài tập, sửa description của một sách; refresh trang chi tiết. Nếu nội dung thay đổi mà không sửa JSON, ứng dụng đang đọc Atlas. Sau kiểm tra, khôi phục mô tả nếu cần.

Ảnh không tải nhưng chữ vẫn hiện thường là lỗi mạng hoặc nguồn ảnh bên ngoài. Kiểm tra image trực tiếp trong trình duyệt; đây không tự động là lỗi MongoDB.

---PAGE---
# 10 Xử lý lỗi thường gặp

## Sai tài khoản hoặc mật khẩu

Nếu gặp Authentication failed, kiểm tra database user thay vì tài khoản website Atlas. Kiểm tra mật khẩu, percent-encoding, dấu ngoặc nhọn còn sót và URI có bị thêm khoảng trắng. Chỉ đặt lại mật khẩu khi cần rồi cập nhật .env.

## Không tìm được máy chủ

MongooseServerSelectionError thường cần kiểm tra IP Access List, trạng thái cluster, DNS, VPN và firewall. Với lỗi querySrv hoặc ENOTFOUND, đối chiếu chính xác hostname trong URI do Atlas cung cấp. Không tắt kiểm tra chứng chỉ TLS để né lỗi kết nối.

## Kết nối được nhưng không có sách

Kiểm tra đúng database mshv và collection books. Chạy seed rồi refresh Data Explorer. Kiểm tra route không còn đọc JSON, model có collection: 'books', và không có route cũ đăng ký trước route mới. Đảm bảo dùng await khi truy vấn.

## Trùng dữ liệu hoặc lỗi E11000

Unique index phát hiện trùng id. Kiểm tra các document liên quan và sao lưu trước khi chỉnh sửa. Không chạy deleteMany({}) để giải quyết nhanh. Nếu đã nhập JSON nhiều lần bằng công cụ khác trước khi tạo index, cần xử lý các bản ghi trùng có chủ đích rồi chạy lại Book.init.

## Lỗi CastError hoặc chi tiết sách luôn 404

URL hiện tại dùng chuỗi như clean-code, không phải ObjectId. Dùng findOne({ id: req.params.id }), không dùng findById(req.params.id). Kiểm tra document thật có trường id.

## Không mở được cổng hoặc thiếu thư viện

EADDRINUSE nghĩa là cổng 4000 đang được tiến trình khác sử dụng. Dừng đúng server cũ, hoặc đặt PORT=4001 rồi truy cập cổng mới. Với Cannot find module, kiểm tra đang ở đúng thư mục và đã cài mongoose, dotenv.

## Khi cần quay lại bản demo

Khôi phục app.js từ bản sao trước bài học để đọc JSON và dùng app.listen cũ. Không cần xóa database Atlas. Dữ liệu online vẫn còn để tiếp tục thực hành sau.

---PAGE---
# 11 Bài tập tự làm nhánh user

Sau khi nhánh books chạy đúng, áp dụng cùng cách tách route, controller và model cho /user. Phần này là đề bài có gợi ý, không cung cấp lời giải controller hoàn chỉnh.

## Khảo sát mã hiện tại

routes/userRoute.js đang chứa mảng userlist gồm ba người dùng và xử lý trực tiếp request. Mảng được gán mà thiếu const hoặc let; không giữ biến toàn cục này trong lời giải. views/user.pug mới có tiêu đề, chưa render danh sách.

Các GET hiện tại gồm /user, /user/getAll, /user/getById/:id và /user/getID?userId=1. Giữ các URL đó để tiếp tục dùng bài cũ. Bình luận nhắc cổng 3000 trong tệp cần sửa cho khớp cổng 4000.

POST /user/add hiện chỉ kiểm tra username, password, email và trả thông báo; chưa lưu database. Trong bài này, chủ động đổi hợp đồng endpoint thành tạo hồ sơ với id, name, email. Đây không phải endpoint đăng ký tài khoản.

## Sản phẩm phải tạo

- models/User.js ánh xạ collection users trong database mshv.
- controllers/userController.js chứa các hàm xử lý request.
- routes/userRoute.js chỉ còn đăng ký route và middleware của nhóm user.
- data/users.json chứa ít nhất 10 hồ sơ giả định, không dùng dữ liệu cá nhân thật.
- scripts/seed-users.js nhập lặp lại không trùng, không xóa dữ liệu cũ.
- views/user.pug hiển thị danh sách và trạng thái rỗng; thêm views/user-detail.pug.

## Quy ước model

Giữ id là số nguyên dương an toàn để /user/getById/1 vẫn hoạt động. Khai báo id kiểu Number, required và unique, kèm kiểm tra số nguyên; không đổi id thành ObjectId. _id vẫn do MongoDB tạo.

name là chuỗi bắt buộc sau trim, dài từ 2 đến 100 ký tự. email là chuỗi bắt buộc sau trim và lowercase, có kiểm tra định dạng cơ bản, đặt unique index. Kiểm tra định dạng không đồng nghĩa xác minh hộp thư có thật.

Tắt virtual id mặc định giống model Book. Không có password trong model, JSON, form hoặc response của bài hồ sơ. Chức năng đăng ký và đăng nhập hiện có giữ riêng, không dùng làm lời giải cho /user/add.

---PAGE---
# 11a Hợp đồng các chức năng user

Giữ app.use('/user', userRoute) một lần trong app.js. Trong router, đường dẫn không lặp lại tiền tố /user.

## Các chức năng bắt buộc

- GET /user gọi getUsersPage, render user với locals title và userlist; danh sách rỗng vẫn trả 200.
- GET /user/getAll gọi getAllUsers, trả 200 và mảng JSON; rỗng trả [].
- GET /user/getById/:id gọi getUserById, trả 200 và một object JSON.
- GET /user/getID?userId=1 gọi getUserByQuery, trả cùng object JSON như getById/1.
- GET /user/detail/:id gọi getUserDetailPage, render user-detail với local user.
- POST /user/add gọi createUser, lưu hồ sơ mới và trả 201 cùng object vừa tạo.

Các object JSON chỉ cần chứa id, name, email. Dùng projection hoặc tạo object phản hồi rõ ràng, không trả nguyên req.body.

## Quy tắc dữ liệu đầu vào và lỗi

ID từ URL hoặc query phải là một chuỗi chỉ gồm chữ số và khi chuyển thành Number phải là số nguyên dương an toàn. Từ chối chuỗi rỗng, 0, số âm, 1abc, số thập phân, giá trị quá lớn và query lặp như userId=1&userId=2. Không dùng parseInt đơn lẻ vì parseInt('1abc') cho ra 1.

POST JSON yêu cầu id là số nguyên dương, name và email là chuỗi. Chỉ cho phép ba trường đó. Phản hồi 400 nếu thiếu trường, sai kiểu, sai định dạng hoặc có trường ngoài hợp đồng, kể cả password.

GET có ID sai định dạng trả 400; ID hợp lệ nhưng không tồn tại trả 404. Email hoặc id trùng trả 409. Lỗi database bất ngờ trả 500 và thông báo chung, không trả stack hoặc URI.

API trả lỗi dạng JSON, ví dụ {"message":"Dữ liệu không hợp lệ"}. Hai route trang HTML render views/error.pug với status tương ứng. Đây là hợp đồng bài tập; không phụ thuộc cấu hình Accept của công cụ gọi API.

## Kiểm tra thứ tự middleware

Thêm app.use(express.json()) trước mount /user để nhận POST JSON; giữ express.urlencoded hiện có. Gọi await User.init() sau connectDB để unique index sẵn sàng, và chỉ dùng chung một kết nối cho Book và User.

---PAGE---
# 11b Gợi ý triển khai và kiểm thử user

## Thứ tự thực hiện

1. Tạo schema User; kiểm tra mẫu hợp lệ và các trường sai bằng validateSync.
2. Tạo 10 user mẫu với id khác nhau và email khác nhau sau khi lowercase.
3. Viết seed-users theo mẫu books; kiểm tra schema trước khi ghi và dùng $setOnInsert theo id. Không dùng countDocuments() + 1 để cấp id.
4. Viết controller đọc danh sách và chi tiết trước; sau đó làm createUser.
5. Tách router, bổ sung view, rồi loại bỏ mảng userlist trong route.
6. Chạy seed, khởi động lại server và kiểm tra database thật.

Nếu một email đã thuộc id khác, seed phải báo lỗi và dừng; không tự ghi đè hồ sơ đó. Không xóa collection để làm cho bài kiểm thử vượt qua.

## Gợi ý controller và giao diện

Giữ nguyên tên local userlist khi render user để tránh lệch với view. Mỗi dòng trong danh sách cần hiển thị id, name, email và liên kết /user/detail/:id. Trang chi tiết có liên kết quay lại /user.

Chuẩn hóa email trước khi lưu. Dùng User.create với object chọn rõ ba trường; bắt ValidationError thành 400 và lỗi duplicate key có code 11000 thành 409. Không chỉ kiểm tra email tồn tại trước khi insert vì hai request đồng thời vẫn có thể bị trùng.

Lỗi ngoài dự kiến chuyển next(error). Có thể đặt middleware lỗi riêng ở cuối userRoute để trả JSON cho API và render error cho hai trang HTML; middleware phải có đủ bốn tham số và kiểm tra res.headersSent. Không để lỗi API rơi vào middleware chung chỉ render HTML.

## Bộ kiểm thử tối thiểu

Sau seed vào collection trống, GET /user/getAll phải có 10 hồ sơ. So sánh getById/1 với getID?userId=1; dữ liệu phải giống nhau. Kiểm tra trang danh sách và trang chi tiết hiển thị đúng.

Thử ID 1abc, 0, thiếu query, query lặp và ID vượt giới hạn số nguyên: trả 400. Thử ID hợp lệ chưa có: trả 404. Dùng dữ liệu giả định khi gửi yêu cầu tạo hồ sơ, ví dụ:

~~~json
{"id":101,"name":"Le Minh An","email":"an101@example.com"}
~~~

Gửi POST bằng Postman với Body, raw, JSON và Content-Type application/json. Lần đầu trả 201; gửi lại cùng id hoặc email trả 409. Thiếu name hoặc thêm password trả 400 và không tạo document.

---PAGE---
# 11c Yêu cầu nộp bài và thang điểm

## Kiểm thử tính bền vững

Sau khi tạo user 101, khởi động lại Node và đọc lại user này. Dữ liệu phải còn vì được lưu ở Atlas, không phải mảng trong bộ nhớ. Chạy seed-users hai lần không làm tăng số user mẫu; tổng collection có thể hơn 10 do hồ sơ đã tạo qua API.

Kiểm tra lỗi database trong môi trường thử riêng, không sửa quyền hoặc làm gián đoạn database dùng chung. API phải trả lỗi chung mà không lộ thông tin kết nối. Đồng thời kiểm tra /books và trang chi tiết sách vẫn hoạt động.

## Hồ sơ nộp

- Mã nguồn model, controller, router, view và script seed.
- data/users.json chứa dữ liệu giả định; .env.example không chứa bí mật.
- README mô tả cách cài, seed, chạy server và các endpoint.
- Bảng kết quả kiểm thử gồm request, dữ liệu gửi, status mong đợi và kết quả thực tế.
- Ảnh danh sách, chi tiết, dữ liệu Atlas đã che thông tin nhạy cảm, response 201 và response lỗi.

Không nộp node_modules, .env, mật khẩu database hoặc URI thật. Người chấm phải dùng tài khoản và môi trường riêng.

## Thang điểm đề xuất

- 2 điểm cho tách đúng route, controller, model; không truy vấn database trong route.
- 2 điểm cho schema, validation, unique index và seed lặp lại an toàn.
- 2 điểm cho các chức năng GET đúng URL, đúng định dạng HTML hoặc JSON.
- 2 điểm cho tạo user và xử lý chính xác 400, 404, 409, 500.
- 1 điểm cho giao diện danh sách, chi tiết và trạng thái rỗng.
- 1 điểm cho bằng chứng kiểm thử, hướng dẫn chạy và giữ nhánh books hoạt động.

Bài chưa đạt yêu cầu an toàn nếu đưa bí mật vào bài nộp hoặc lưu mật khẩu thô. Cần khắc phục trước khi nghiệm thu, không chỉ trừ điểm hình thức.

## Phần nâng cao không bắt buộc

Thêm chức năng sửa hồ sơ và xóa hồ sơ bằng controller riêng, giữ nguyên quy tắc id, email và lỗi. Thêm tìm kiếm, phân trang hoặc kiểm thử tự động. Chỉ thử trên dữ liệu giả định của bài tập.

Các endpoint quản lý hồ sơ ở đây chưa có xác thực và phân quyền. Chỉ dùng trong môi trường học tập cục bộ; không triển khai công khai với dữ liệu người dùng thật.

---PAGE---
# 12 Kiểm tra hoàn tất và tài liệu tham khảo

## Danh sách nghiệm thu

- .env nằm ngoài public, không xuất hiện trong Git hoặc ảnh chụp.
- User Atlas chỉ có quyền cần thiết; IP Access List giới hạn mạng sử dụng.
- Schema giữ đủ tám trường và unique index cho id.
- bookRoute chỉ định tuyến, bookController gọi model, view chỉ hiển thị.
- Hai route books đọc Mongoose, không còn đọc JSON khi phục vụ request.
- Seed chạy lặp lại không tăng số bản ghi và không ghi đè nội dung đang có.
- Trang danh sách, chi tiết và lỗi 404 hoạt động như mục kiểm thử.
- Database lỗi không làm lộ URI hoặc mật khẩu cho người dùng.

Khi triển khai thật, bổ sung phân trang, quy trình quản lý index, giám sát và sao lưu phù hợp. 20 sách mẫu là dữ liệu học tập; không dùng giá, tồn kho hoặc quyền phân phối giả định từ các đường dẫn nguồn.

## Nguồn chính thức

Các nguồn dưới đây được đối chiếu ngày 12 tháng 10 năm 2026. Giao diện Atlas và phiên bản thư viện có thể thay đổi.

[1] Mongoose 9 và yêu cầu Node
https://mongoosejs.com/docs/migrating_to_9.html

[2] Kết nối cluster Atlas
https://www.mongodb.com/docs/atlas/connect-to-database-deployment/

[3] Database users
https://www.mongodb.com/docs/atlas/security-add-mongodb-users/

[4] IP Access List
https://www.mongodb.com/docs/atlas/security/ip-access-list/

[5] Kết nối bằng thư viện client
https://www.mongodb.com/docs/atlas/driver-connection/

[6] dotenv
https://github.com/motdotla/dotenv

[7] Schema Mongoose
https://mongoosejs.com/docs/guide.html

[8] Validation và unique index
https://mongoosejs.com/docs/validation.html

[9] Quản lý kết nối
https://mongoosejs.com/docs/connections.html

[10] Truy vấn lean
https://mongoosejs.com/docs/tutorials/lean.html

[11] Xử lý lỗi Express
https://expressjs.com/en/guide/error-handling/

[12] Express Router và route parameters
https://expressjs.com/en/guide/routing/
