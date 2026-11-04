// === kết nối vs book.js  ===
const Book = require("../models/book"); // book chữ thường — khớp tên file

// Import model Borrow để kiểm tra trạng thái mượn
const Borrow = require("../models/borrow");

// MỤC 6: Dùng service đã tạo ở mục 5 để upload và dọn ảnh.
const { uploadImage, deleteImage } = require("../services/image.service");
const categories = [
    "Văn học",
    "Kinh tế",
    "Công nghệ",
    "Ngoại ngữ",
    "Giáo trình",
    "Kỹ năng sống",
    "Lịch sử",
    "Thiếu nhi"
];

// Chỉ lấy sáu ô chữ của form. URL và mã ảnh do server tự gán sau upload.
function readBookFields(body = {}) {
  const fields = [
    "title",
    "author",
    "category",
    "menuCategory",
    "edition",
    "description",
    "url",
  ];
  const data = {};

  for (const field of fields) {
    // Chỉ nhận chuỗi; thiếu ô hoặc gửi sai kiểu thì dùng chuỗi rỗng.
    data[field] = typeof body[field] === "string" ? body[field].trim() : "";
  }
  return data;
}

// Nếu đã upload nhưng lưu sách thất bại, xóa ảnh mới để tránh ảnh thừa.
async function cleanupUploaded(uploaded) {
  if (!uploaded) return;

  try {
    await deleteImage(uploaded.public_id);
  } catch (error) {
    // Giữ mã ảnh trong log để có thể xóa thủ công khi cần.
    console.error("Cần dọn ảnh thủ công:", uploaded.public_id, error.message);
  }
}

// book/getAll
exports.getAllBooks = async (_req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// book/getById/:id
exports.getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: "Không tìm thấy sách" });
    }
    res.json(book);
  } catch (err) {
    // id sai định dạng ObjectId thì báo 400 thay vì 500
    const status = err.name === "CastError" ? 400 : 500;
    res.status(status).json({ message: err.message });
  }
};

// bookPage -get localhost:3000/book
// Trang danh sách sách: lọc theo danh mục
exports.getBookPage = async (req, res) => {
    try {
        const selectedCategory =
            typeof req.query.category === "string"
                ? req.query.category.trim()
                : "";

        // Mặc định không lọc, hiển thị tất cả sách
        const filter = {};

        // Chỉ lọc nếu danh mục được chọn hợp lệ
        if (categories.includes(selectedCategory)) {
            filter.menuCategory = selectedCategory;
        }

        const books = await Book.find(filter)
            .sort({ createdAt: -1 });

        res.render("books", {
            title: selectedCategory || "Danh sách sách",
            activePage: "books",
            books,
            categories,
            selectedCategory,
            user: req.user // Truyền thông tin người dùng ra giao diện
        });

    } catch (err) {
        console.error("Lỗi lấy danh sách sách:", err);
        res.status(500).json({ message: err.message });
    }
};

// book/:id - trang chi tiết sách — ĐÃ CẬP NHẬT kiểm tra trạng thái mượn
exports.getBookDetailPage = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    // Không có sách thì trả trang 404, tránh lỗi khi Pug đọc book.title của null
    if (!book) {
      return res.status(404).render("error");
    }

    // === KIỂM TRA NGƯỜI DÙNG CÓ ĐANG MƯỢN SÁCH NÀY KHÔNG ===
    let isBorrowing = false;
    let activeBorrowId = null;

    if (req.user) {
      const borrow = await Borrow.findOne({
        user: req.user._id,
        book: book._id,
        status: "borrowing"
      });
      if (borrow) {
        isBorrowing = true;
        activeBorrowId = borrow._id;
      }
    }

    res.render("book-detail", {
      title: book.title,
      activePage: "books",
      book,
      user: req.user,           // Truyền thông tin người dùng
      isBorrowing,              // Đang mượn hay không
      activeBorrowId           // ID bản ghi mượn để trả sách
    });
  } catch (err) {
    // id sai định dạng ObjectId cũng coi như không tìm thấy
    if (err.name === "CastError") {
      return res.status(404).render("error");
    }
    res.status(500).json({ message: err.message });
  }
};

// MỤC 6: GET /book/add mở form trống để người dùng nhập sách mới.
exports.AddBookPage = (_req, res) => {
  res.render("addbook", {
    title: "Thêm sách",
    book: {},
    error: "",
  });
};

// MỤC 7: POST /book/add -> kiểm tra -> upload ảnh -> lưu sách -> chuyển trang.
exports.AddBook = async (req, res) => {
  const data = readBookFields(req.body);
  // Kiểm tra trước khi upload để không gửi ảnh cho một form còn thiếu dữ liệu.
  if (!data.title || !data.author) {
    return res.status(400).render("addbook", {
      title: "Thêm sách",
      book: data,
      error: "Vui lòng nhập tên sách và tác giả.",
    });
  }

  let uploaded; // Giữ kết quả upload để biết mã ảnh cần dọn khi có lỗi.
  let stage = "upload"; // Đánh dấu đang upload hay lưu database để báo đúng lỗi.
  let newBook; // Giữ sách đã lưu để lấy _id khi chuyển trang.

  try {
    // Có ảnh: upload trước, rồi lấy đường dẫn HTTPS và mã ảnh.
    if (req.file) {
      // await đợi upload xong rồi mới thực hiện các dòng tiếp theo.
      uploaded = await uploadImage(req.file.buffer);
      data.image = uploaded.secure_url;
      data.imagePublicId = uploaded.public_id;
    }

    // Không chọn ảnh thì schema tự dùng ảnh mặc định.
    stage = "database";
    newBook = await Book.create(data);
  } catch (err) {
    // Ảnh có thể đã lên Cloudinary dù MongoDB chưa lưu được sách.
    await cleanupUploaded(uploaded);

    // ValidationError là lỗi dữ liệu không đúng schema (ví dụ tên quá dài).
    // 400: dữ liệu sai; 502: upload thất bại; 500: lỗi lưu sách khác.
    const validation = err.name === "ValidationError";
    const status = validation ? 400 : stage === "upload" ? 502 : 500;
    const message = validation
      ? "Thông tin chưa hợp lệ. Kiểm tra độ dài các ô."
      : stage === "upload"
        ? "Không tải được ảnh. Kiểm tra ảnh hoặc thử lại."
        : "Chưa lưu được sách. Vui lòng thử lại.";

    console.error("Thêm sách thất bại:", err.message);
    // Chỉ hiện lại ô chữ, không dùng URL ảnh vừa được dọn.
    return res.status(status).render("addbook", {
      title: "Thêm sách",
      book: readBookFields(req.body),
      error: message,
    });
  }

  // 303 chuyển sang GET trang chi tiết, tránh gửi lại POST khi tải lại trang.
  return res.redirect(303, "/book/" + newBook._id);
};

// GET /book/search?q=... - tìm sách theo tên hoặc tác giả (không phân biệt hoa thường)
exports.searchBooks = async (req, res) => {
  const keyword = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  if (!keyword) return res.redirect("/book");
  try {
    // Escape ký tự đặc biệt để từ khóa không bị hiểu thành regex
    const pattern = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = { $regex: pattern, $options: "i" };
    const books = await Book.find({ $or: [{ title: regex }, { author: regex }] });
    res.render("books", { title: "Tìm sách", activePage: "books", books, q: keyword, user: req.user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Render form sửa sách: dùng lại addbook.pug với isEdit = true
function renderEditForm(res, status, book, error = "") {
  return res.status(status).render("addbook", {
    title: "Sửa sách",
    isEdit: true,
    book,
    error,
  });
}

// GET /book/:id/edit - mở form sửa với dữ liệu hiện có
exports.EditBookPage = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).render("error");
    return renderEditForm(res, 200, book);
  } catch (err) {
    if (err.name === "CastError") return res.status(404).render("error");
    return res.status(500).json({ message: err.message });
  }
};

// MỤC 10: POST /book/:id/update -> upload ảnh mới (nếu có) -> lưu MongoDB -> xóa ảnh cũ.
exports.UpdateBook = async (req, res) => {
  let uploaded;
  let saved = false;
  let stage = "find";
  let oldImage; // Giữ ảnh cũ để hiện lại trên form khi lưu lỗi
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).render("error");
    oldImage = book.image;

    const data = readBookFields(req.body);
    // Kiểm tra trước khi upload để không upload ảnh cho form thiếu dữ liệu
    if (!data.title || !data.author) {
      return renderEditForm(
        res,
        400,
        { ...data, _id: book._id, image: oldImage },
        "Vui lòng nhập tên sách và tác giả.",
      );
    }

    const oldPublicId = book.imagePublicId;
    // Không chọn ảnh mới thì giữ nguyên image và imagePublicId hiện có
    if (req.file) {
      stage = "upload";
      uploaded = await uploadImage(req.file.buffer);
      data.image = uploaded.secure_url;
      data.imagePublicId = uploaded.public_id;
    }

    stage = "database";
    Object.assign(book, data);
    await book.save();
    saved = true;

    // Chỉ xóa ảnh cũ sau khi lưu thành công, tránh mất ảnh nếu save lỗi
    if (uploaded && oldPublicId) {
      try {
        await deleteImage(oldPublicId);
      } catch (error) {
        console.error("Cần dọn ảnh cũ:", oldPublicId, error.message);
      }
    }
    return res.redirect(303, "/book/" + book._id);
  } catch (err) {
    // Save lỗi thì xóa ảnh mới vừa upload, ảnh cũ vẫn còn nguyên
    if (!saved) await cleanupUploaded(uploaded);
    if (err.name === "CastError") return res.status(404).render("error");

    const validation = err.name === "ValidationError";
    const status = validation ? 400 : stage === "upload" ? 502 : 500;
    const message = validation
      ? "Thông tin chưa hợp lệ. Kiểm tra độ dài các ô."
      : stage === "upload"
        ? "Không tải được ảnh. Kiểm tra ảnh hoặc thử lại."
        : "Chưa sửa được sách. Vui lòng thử lại.";

    console.error("Sửa sách thất bại:", err.message);
    return renderEditForm(
      res,
      status,
      { ...readBookFields(req.body), _id: req.params.id, image: oldImage },
      message,
    );
  }
};

// MỤC 11: POST /book/:id/delete -> xóa bản ghi -> xóa ảnh riêng trên Cloudinary.
exports.DeleteBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).render("error");
    try {
      // imagePublicId rỗng (ảnh mặc định hoặc URL cũ) thì deleteImage tự bỏ qua
      await deleteImage(book.imagePublicId);
    } catch (error) {
      // MongoDB và Cloudinary không có giao dịch chung: giữ mã ảnh trong log để dọn thủ công
      console.error("Sách đã xóa, cần dọn ảnh:", book.imagePublicId, error.message);
      return res.status(502).render("error", {
        status: 502,
        message: "Sách đã xóa. Ảnh chờ quản trị viên dọn.",
      });
    }
    return res.redirect(303, "/book");
  } catch (err) {
    if (err.name === "CastError") return res.status(404).render("error");
    console.error("Xóa sách thất bại:", err.message);
    return res.status(500).render("error", {
      status: 500,
      message: "Chưa xóa được sách. Vui lòng thử lại.",
    });
  }
};
