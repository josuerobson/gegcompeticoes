export function compressUploadImage(file: File, maxSize = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    // If file is already smaller than 150KB, read directly
    if (file.size < 150 * 1024) {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => resolve('');
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve((reader.result as string) || '');
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > height && width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve((reader.result as string) || '');
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (e) {
          console.warn('Compression failed fallback to original base64', e);
          resolve((reader.result as string) || '');
        }
      };
      img.src = (reader.result as string) || '';
    };
    reader.readAsDataURL(file);
  });
}
