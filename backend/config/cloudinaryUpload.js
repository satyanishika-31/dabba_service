// Simple stub for uploading to cloudinary; returns a placeholder URL and id
export const uploadToCloudinary = async (buffer) => ({
  secure_url: 'https://placehold.co/600x400',
  public_id: `local_${Date.now()}`
})

export default uploadToCloudinary
