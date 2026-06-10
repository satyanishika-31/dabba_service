// Minimal cloudinary stub for development
export const cloudinary = {
  uploader: {
    destroy: async (public_id) => ({ result: 'ok' })
  }
}

export default cloudinary
