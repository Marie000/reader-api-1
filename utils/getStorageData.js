const { Storage } = require('@google-cloud/storage')
const storage = new Storage()

exports.getStorageData = async readerId => {
  const files = await storage
    .bucket(process.env.GOOGLE_STORAGE_BUCKET)
    .getFiles({
      prefix: `${readerId}`
    })

  const filesSizes = files[0].map(file => file.metadata.size)
  if (filesSizes.length === 0) return 0
  if (filesSizes.length === 1) return parseInt(filesSizes[0])
  let totalSize = filesSizes.reduce((a, b) => {
    return parseInt(a) + parseInt(b)
  })

  return totalSize
}
