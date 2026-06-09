/** Web: standard file input — no extra native modules. */

export type PickedVerificationImage = { uri: string; mimeType: string };

export function isVerificationPhotoPickAvailable(): boolean {
  return typeof document !== 'undefined';
}

export async function pickVerificationImage(): Promise<PickedVerificationImage | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/heic,image/heif';
    input.style.display = 'none';

    input.onchange = () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) {
        resolve(null);
        return;
      }
      resolve({
        uri: URL.createObjectURL(file),
        mimeType: file.type || 'image/jpeg',
      });
    };

    input.oncancel = () => {
      input.remove();
      resolve(null);
    };

    document.body.appendChild(input);
    input.click();
  });
}
