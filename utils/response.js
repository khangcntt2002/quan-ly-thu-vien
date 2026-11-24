// Định dạng response chung cho API (giống MSHV)
// Thành công: { success: true, data }
// Thất bại:   { success: false, message, errors? }

exports.ok = (res, data) => {
    return res.status(200).json({ success: true, data });
}

exports.create = (res, data) => {
    return res.status(201).json({ success: true, data });
}

exports.fail = (res, status, message, errors) => {
    return res.status(status).json({ success: false, message, ...(errors && { errors }) });
}
