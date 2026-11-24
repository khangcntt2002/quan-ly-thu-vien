// Trạng thái đơn hàng và luồng chuyển hợp lệ, dùng chung cho người mua và admin.
// pending → confirmed → shipping → completed; hủy được từ pending hoặc confirmed.
const STATUSES = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'];

const LABELS = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy'
};

// Màu badge Bootstrap cho từng trạng thái
const BADGES = {
  pending: 'bg-warning text-dark',
  confirmed: 'bg-info text-dark',
  shipping: 'bg-primary',
  completed: 'bg-success',
  cancelled: 'bg-secondary'
};

// Trạng thái hiện tại => các trạng thái được phép chuyển tới
const NEXT = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['completed'],
  completed: [],
  cancelled: []
};

const label = (s) => LABELS[s] || s;
const badge = (s) => BADGES[s] || 'bg-secondary';
const canMove = (from, to) => (NEXT[from] || []).includes(to);
const nextOf = (s) => NEXT[s] || [];

module.exports = { STATUSES, LABELS, label, badge, canMove, nextOf };
