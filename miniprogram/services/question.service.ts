import { publishQuestion } from '../api/question'
import { uploadImage } from '../api/upload'
import type { PublishQuestionPayload } from '../types/question'

export const publishQuestionWithImages = async (
  payload: Omit<PublishQuestionPayload, 'images'> & { localImages: string[] },
): Promise<void> => {
  const uploadedImages = await Promise.all(payload.localImages.map(uploadImage))
  await publishQuestion({
    title: payload.title,
    content: payload.content,
    categoryId: payload.categoryId,
    images: uploadedImages,
  })
}
