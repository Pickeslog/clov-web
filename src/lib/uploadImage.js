// R2(오브젝트 스토리지) 이미지 업로드 공통 흐름: presign → R2로 PUT → imageUrl 반환.
//
// R2로의 PUT은 반드시 순수 fetch로 한다. api(axios) 인스턴스는 Authorization 주입 +
// 응답 봉투 언래핑 인터셉터가 걸려 있어 R2에 Authorization을 보내거나 응답을 오해한다.
// presign/commit만 api를 통하고, 실제 바이트 PUT은 여기서 처리한다.

const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5MB

// 업로드 전 클라 검증. 실패 시 사용자에게 보여줄 메시지를 담은 Error를 던진다.
export function assertImageFile(file, maxBytes = MAX_IMAGE_BYTES) {
  if (!file) {
    throw new Error('이미지를 선택해 주세요.')
  }
  if (!file.type?.startsWith('image/')) {
    throw new Error('이미지 파일만 올릴 수 있어요.')
  }
  if (file.size > maxBytes) {
    throw new Error(`파일이 너무 커요 (최대 ${Math.floor(maxBytes / 1024 / 1024)}MB).`)
  }
}

// presignFn: ({ contentType, fileSize }) => Promise<{ uploadUrl, imageUrl, expiresIn }>
// 도메인별 presign 엔드포인트를 감싼 함수를 넘긴다(plan은 stage를 클로저로 고정).
export async function uploadImage(presignFn, file) {
  assertImageFile(file)
  const { uploadUrl, imageUrl } = await presignFn({ contentType: file.type, fileSize: file.size })
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!res.ok) {
    // 대개 R2 버킷 CORS 미설정(브라우저 PUT 차단) 또는 서명 만료.
    throw new Error(`이미지 업로드에 실패했어요 (${res.status}). 잠시 후 다시 시도해 주세요.`)
  }
  return imageUrl
}
