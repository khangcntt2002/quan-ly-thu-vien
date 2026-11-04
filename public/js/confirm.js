// Hỏi xác nhận trước khi gửi form có thuộc tính data-confirm (ví dụ nút xóa sách).
// Viết trong file riêng vì CSP của helmet chặn script inline (onsubmit="...").
document.addEventListener("submit", (event) => {
  const message = event.target.dataset.confirm;
  if (message && !window.confirm(message)) {
    event.preventDefault();
  }
});
