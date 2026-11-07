-- Lab Buoi 08: BookStore, CRUD ho so users co ban
-- MySQL 8.0.16+; utf8mb4 ho tro tieng Viet.
-- Chay tren CSDL lab rieng. Khong co DROP DATABASE / DROP TABLE.
-- Chay mot lan tren CSDL lab moi. Ban nay co 5 bang va 2 procedure.
-- Neu da nhap ban cu, tao CSDL moi va doi ten o CREATE DATABASE / USE.
-- Tai khoan MySQL can quyen CREATE ROUTINE de tao procedure.
-- DDL (CREATE TABLE/PROCEDURE) nam ngoai transaction vi gay implicit commit.
CREATE DATABASE IF NOT EXISTS bookstore_user_lab
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bookstore_user_lab;
SET NAMES utf8mb4;

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  fullname VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE books (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  author VARCHAR(100) NOT NULL,
  price DECIMAL(12,0) NOT NULL DEFAULT 0 CHECK (price >= 0),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category_id INT UNSIGNED NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_book_category FOREIGN KEY (category_id)
    REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_book_creator FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- users 1---N loans; loans N---N books thong qua loan_items.
-- Xoa user van giu lich su muon; user_id cua phieu thanh NULL.
CREATE TABLE loans (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  borrowed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_at DATETIME NOT NULL,
  status ENUM('borrowing','returned') NOT NULL DEFAULT 'borrowing',
  CONSTRAINT fk_loan_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE loan_items (
  loan_id INT UNSIGNED NOT NULL,
  book_id INT UNSIGNED NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (loan_id, book_id),
  CONSTRAINT fk_item_loan FOREIGN KEY (loan_id)
    REFERENCES loans(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_book FOREIGN KEY (book_id)
    REFERENCES books(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Procedure seed du lieu: neu bat ky INSERT nao loi thi hoan tac toan bo.
DELIMITER $$
CREATE PROCEDURE lab_seed_data()
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;
  START TRANSACTION;
-- Ho so user mau; buoi nay chi quan ly username, fullname, email.
INSERT INTO users (username, fullname, email) VALUES
('phong', 'Đặng Quốc Phong', 'phong@example.com'),
('an', 'Nguyễn Văn An', 'an@example.com'),
('binh', 'Trần Thị Bình', 'binh@example.com');
INSERT INTO categories (name, slug) VALUES
('Lập trình', 'lap-trinh'), ('Văn học', 'van-hoc');
INSERT INTO books (title, author, price, stock, category_id, created_by) VALUES
('Thực hành Node.js', 'Nhóm giảng viên', 120000, 10, 1, 1),
('Tuyển tập truyện ngắn', 'Nhiều tác giả', 85000, 5, 2, 2);


-- Phieu mau dau tien: Binh muon 1 cuon Node.js trong 14 ngay.
INSERT INTO loans (user_id, due_at)
VALUES (3, DATE_ADD(NOW(), INTERVAL 14 DAY));
SET @seed_loan_id = LAST_INSERT_ID();
INSERT INTO loan_items (loan_id, book_id, quantity)
VALUES (@seed_loan_id, 1, 1);
UPDATE books SET stock = stock - 1 WHERE id = 1;
  COMMIT;
END$$
DELIMITER ;
CALL lab_seed_data();
-- Chi goi lab_seed_data mot lan; goi lai gap UNIQUE va rollback.

-- Transaction nghiep vu: tao phieu + them chi tiet + tru ton kho.
-- Procedure tu quan ly transaction; goi tren ket noi khong co transaction dang mo.
DELIMITER $$
CREATE PROCEDURE lab_borrow_book(
  IN p_user_id INT UNSIGNED,
  IN p_book_id INT UNSIGNED,
  IN p_quantity INT
)
BEGIN
  DECLARE v_stock INT DEFAULT NULL;
  DECLARE v_user_id INT UNSIGNED DEFAULT NULL;
  DECLARE v_loan_id INT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'So luong phai lon hon 0';
  END IF;

  -- Khoa user va sach den khi commit/rollback, tranh xoa user hay muon vuot ton.
  SELECT id INTO v_user_id FROM users
    WHERE id = p_user_id FOR UPDATE;
  IF v_user_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User khong ton tai';
  END IF;

  SELECT stock INTO v_stock FROM books
    WHERE id = p_book_id FOR UPDATE;
  IF v_stock IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sach khong ton tai';
  END IF;
  IF v_stock < p_quantity THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Khong du sach de muon';
  END IF;

  INSERT INTO loans (user_id, due_at)
  VALUES (p_user_id, DATE_ADD(NOW(), INTERVAL 14 DAY));
  SET v_loan_id = LAST_INSERT_ID();
  INSERT INTO loan_items (loan_id, book_id, quantity)
  VALUES (v_loan_id, p_book_id, p_quantity);
  UPDATE books SET stock = stock - p_quantity WHERE id = p_book_id;
  COMMIT;
  SELECT v_loan_id AS new_loan_id;
END$$
DELIMITER ;

-- Demo COMMIT: An muon 1 cuon truyen, tao phieu thu hai.
CALL lab_borrow_book(2, 2, 1);

-- Demo ROLLBACK chay duoc ngay: doi email va stock roi hoan tac.
-- Ket qua cuoi: email cua Binh van binh@example.com; stock sach 1 van 9.
START TRANSACTION;
UPDATE users SET email = 'binh.demo@example.com' WHERE id = 3;
UPDATE books SET stock = stock + 100 WHERE id = 1;
SELECT 'Trong transaction, chua luu' AS stage, id, email
FROM users WHERE id = 3;
ROLLBACK;
SELECT 'Sau rollback' AS stage, id, email FROM users WHERE id = 3;

-- Kiem tra CUOI SCRIPT: 3 users, 2 categories, 2 books, 2 loans, 2 loan_items.
-- stock sach 1 = 9; stock sach 2 = 4.
SELECT 'users' AS table_name, COUNT(*) AS total FROM users
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'books', COUNT(*) FROM books
UNION ALL SELECT 'loans', COUNT(*) FROM loans
UNION ALL SELECT 'loan_items', COUNT(*) FROM loan_items;
SELECT id, username, fullname, email FROM users;
SELECT b.id, b.title, b.stock, c.name AS category, u.fullname AS creator
FROM books b LEFT JOIN categories c ON c.id = b.category_id
LEFT JOIN users u ON u.id = b.created_by;

-- JOIN 4 bang: phieu muon cua user, sach, so luong va han tra.
SELECT l.id AS loan_id, u.username, u.fullname, b.title,
       li.quantity, l.borrowed_at, l.due_at, l.status
FROM loans l
LEFT JOIN users u ON u.id = l.user_id
JOIN loan_items li ON li.loan_id = l.id
JOIN books b ON b.id = li.book_id
ORDER BY l.id, b.id;

-- Kiem tra cac khoa ngoai da tao.
SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;

-- BAI THU LOI: chay RIENG tung CALL duoi day (bo --), du kien SIGNAL 45000.
-- So sanh COUNT(*) loans/loan_items va stock truoc/sau: khong thay doi.
-- CALL lab_borrow_book(2, 1, 99999);  -- Khong du sach
-- CALL lab_borrow_book(99999, 1, 1);  -- User khong ton tai
-- CALL lab_borrow_book(2, 99999, 1);  -- Sach khong ton tai
-- CALL lab_borrow_book(2, 1, 0);      -- So luong khong hop le

-- Xoa user an trong giao dien:
-- books.created_by va loans.user_id cua An thanh NULL;
-- sach, phieu muon, loan_items van con. CRUD users khong bi khoa ngoai chan.
-- Tai lieu MySQL: https://dev.mysql.com/doc/refman/8.4/en/resignal.html
