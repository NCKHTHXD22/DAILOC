const cloudinary = require('cloudinary').v2;
const axios = require('axios');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload từ URL công khai (http/https)
async function uploadFromUrl(imageUrl) {
  const result = await cloudinary.uploader.upload(imageUrl, {
    folder: 'dailoc-goopy',
    resource_type: 'image',
  });
  return result.secure_url;
}

// Upload từ Buffer (ảnh Zalo gửi về, cần download trước)
async function uploadFromBuffer(buffer, filename) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'dailoc-goopy', resource_type: 'image', public_id: filename },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

// Download ảnh từ Zalo rồi upload lên Cloudinary
async function uploadFromZaloImageUrl(zaloUrl) {
  // Bước 1: Thử download qua Node.js (dùng cấu hình tránh lỗi nén và bot block)
  try {
    const res = await axios.get(zaloUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'Accept-Encoding': 'identity', // Tránh lỗi giải nén gzip của Axios đối với arraybuffer
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const buffer = Buffer.from(res.data);
    if (buffer && buffer.length > 0) {
      console.log(`[Cloudinary] Download Zalo OK — size: ${buffer.length} bytes`);
      const filename = `zalo-${Date.now()}`;
      return await uploadFromBuffer(buffer, filename);
    }
    console.warn('[Cloudinary] Download trả về 0 bytes, chuyển sang để Cloudinary tự fetch...');
  } catch (err) {
    console.warn(`[Cloudinary] Download qua Node thất bại (${err.message}), chuyển sang để Cloudinary tự fetch...`);
  }

  // Bước 2: Fallback — Để Cloudinary tự tải ảnh từ Zalo URL
  const result = await cloudinary.uploader.upload(zaloUrl, {
    folder: 'dailoc-goopy',
    resource_type: 'image',
  });
  return result.secure_url;
}

// Video Zalo có thể nặng -> để Cloudinary tự fetch từ URL (không buffer trong Node)
async function uploadFromZaloVideoUrl(zaloUrl) {
  const result = await cloudinary.uploader.upload(zaloUrl, {
    folder: 'dailoc-goopy',
    resource_type: 'video',
  });
  return result.secure_url;
}

module.exports = { uploadFromUrl, uploadFromBuffer, uploadFromZaloImageUrl, uploadFromZaloVideoUrl };

