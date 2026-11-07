const express = require("express");
const router = express.Router();
const bookController = require("../controller/bookController");
// Nhận ảnh bìa (field cover) bằng Multer memoryStorage, render lại form nếu upload lỗi
const bookUpload = require("../middlewares/bookUpload");
<<<<<<< HEAD
const { requireAuth, requireRole } = require('../middlewares/auth');
const adminOnly = [requireAuth, requireRole('admin')];
=======
>>>>>>> a217276ab276069c824ff82f497054eae34deaf0

// API lấy tất cả sách localhost:4000/book/getAll
router.get("/getAll", bookController.getAllBooks);



// API lấy theo id localhost:4000/book/getById/:id
router.get("/getById/:id", bookController.getBookById);

// Trang danh sách sách localhost:4000/book
router.get("/", bookController.getBookPage);

// Form thêm sách và xử lý thêm sách kèm ảnh bìa
<<<<<<< HEAD
router.get("/add", ...adminOnly, bookController.AddBookPage);
router.post("/add", ...adminOnly, bookUpload, bookController.AddBook);
=======
router.get("/add", bookController.AddBookPage);
router.post("/add", bookUpload, bookController.AddBook);
>>>>>>> a217276ab276069c824ff82f497054eae34deaf0

// Tìm sách theo tên hoặc tác giả localhost:4000/book/search?q=...
router.get("/search", bookController.searchBooks);

// Sửa sách (ảnh mới là tùy chọn) và xóa sách kèm dọn ảnh Cloudinary
<<<<<<< HEAD
router.get("/:id/edit", ...adminOnly, bookController.EditBookPage);
router.post("/:id/update", ...adminOnly, bookUpload, bookController.UpdateBook);
router.post("/:id/delete", ...adminOnly, bookController.DeleteBook);
=======
router.get("/:id/edit", bookController.EditBookPage);
router.post("/:id/update", bookUpload, bookController.UpdateBook);
router.post("/:id/delete", bookController.DeleteBook);
>>>>>>> a217276ab276069c824ff82f497054eae34deaf0

// Các route tĩnh ở trên route động này.
router.get("/:id", bookController.getBookDetailPage);

module.exports = router;
