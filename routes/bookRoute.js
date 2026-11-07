const express = require("express");
const router = express.Router();
const bookController = require("../controller/bookController");
// Nhận ảnh bìa (field cover) bằng Multer memoryStorage, render lại form nếu upload lỗi
const bookUpload = require("../middlewares/bookUpload");
const { requireAuth, requireRole } = require('../middlewares/auth');
const adminOnly = [requireAuth, requireRole('admin')];

// API lấy tất cả sách localhost:4000/book/getAll
router.get("/getAll", bookController.getAllBooks);



// API lấy theo id localhost:4000/book/getById/:id
router.get("/getById/:id", bookController.getBookById);

// Trang danh sách sách localhost:4000/book
router.get("/", bookController.getBookPage);

// Form thêm sách và xử lý thêm sách kèm ảnh bìa
router.get("/add", ...adminOnly, bookController.AddBookPage);
router.post("/add", ...adminOnly, bookUpload, bookController.AddBook);

// Tìm sách theo tên hoặc tác giả localhost:4000/book/search?q=...
router.get("/search", bookController.searchBooks);

// Sửa sách (ảnh mới là tùy chọn) và xóa sách kèm dọn ảnh Cloudinary
router.get("/:id/edit", ...adminOnly, bookController.EditBookPage);
router.post("/:id/update", ...adminOnly, bookUpload, bookController.UpdateBook);
router.post("/:id/delete", ...adminOnly, bookController.DeleteBook);

// Các route tĩnh ở trên route động này.
router.get("/:id", bookController.getBookDetailPage);

module.exports = router;
