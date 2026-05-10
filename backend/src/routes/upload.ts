import { Router } from 'express'
import { uploadFile } from '../controllers/upload'
import fileMiddleware from '../middlewares/file'
import { validateImageMetadata } from '../middlewares/validateImageMetadata'

const uploadRouter = Router()

uploadRouter.post('/', fileMiddleware.single('file'), validateImageMetadata, uploadFile)

export default uploadRouter