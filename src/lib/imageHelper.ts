export function getOptimizedImageUrl(url: string | null | undefined) {
  if (!url) return null;
  let cleanUrl = url.trim();

  // 1. Deteksi dan ubah link Google Drive menjadi link thumbnail
  if (cleanUrl.includes('drive.google.com')) {
    let fileId = '';
    
    // Pola 1: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    const match1 = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match1 && match1[1]) {
      fileId = match1[1];
    } 
    // Pola 2: https://drive.google.com/open?id=FILE_ID
    // Pola 3: https://drive.google.com/uc?id=FILE_ID
    else {
      const match2 = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match2 && match2[1]) {
        fileId = match2[1];
      }
    }

    if (fileId) {
      // Format thumbnail Drive yang paling andal untuk ditampilkan di web
      cleanUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }
  }

  // 2. Gunakan Image Proxy (wsrv.nl) untuk mengecilkan, mengonversi ke WebP, 
  //    dan mengatasi masalah CORS/hotlink.
  //    Parameter: w=800 (lebar maks), output=webp (format ringan)
  return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&w=800&output=webp&q=85`;
}
