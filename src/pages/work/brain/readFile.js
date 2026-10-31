// Read a picked document into the base64 the API takes (POST /api/work/me/
// brain/learn { name, mime, dataBase64 }). Browser-only (FileReader); kept out
// of brainModel.js so the rules stay pure and testable under node.
export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => {
      const s = String(fr.result || '')
      const comma = s.indexOf(',')
      resolve(comma >= 0 ? s.slice(comma + 1) : s)
    }
    fr.onerror = () => reject(Object.assign(new Error('read failed'), { status: 400 }))
    fr.readAsDataURL(file)
  })
}
