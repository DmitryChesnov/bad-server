import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import fs from 'fs'
import path from 'path'
import BadRequestError from '../errors/bad-request-error'

// ✅ Максимальный размер файла - 1MB
const MAX_FILE_SIZE = 1 * 1024 * 1024 // 1 MB

// ✅ Разрешенные MIME-типы
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']

// ✅ Разрешенные расширения файлов
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp']

// ✅ Безопасная генерация имени файла (не содержит оригинальное имя)
function generateSafeFilename(originalName: string): string {
    // Извлекаем расширение из оригинального имени
    const ext = path.extname(originalName).toLowerCase()
    const validExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : '.png'
    
    // Генерируем полностью новое имя (не содержащее оригинальное)
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    
    return `${timestamp}_${random}${validExt}`
}

export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.file) {
        return next(new BadRequestError('Файл не загружен'))
    }

    try {
        // ✅ 1. Проверка MIME-типа
        if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path)
            }
            return next(new BadRequestError(
                `Неподдерживаемый тип файла. Разрешены: ${ALLOWED_MIME_TYPES.join(', ')}`
            ))
        }

        // ✅ 2. Проверка расширения файла
        const fileExt = path.extname(req.file.originalname).toLowerCase()
        if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path)
            }
            return next(new BadRequestError(
                `Неподдерживаемое расширение файла. Разрешены: ${ALLOWED_EXTENSIONS.join(', ')}`
            ))
        }

        // ✅ 3. Проверка соответствия MIME-типа и расширения
        const isPng = req.file.mimetype === 'image/png' && fileExt === '.png'
        const isJpeg = (req.file.mimetype === 'image/jpeg' || req.file.mimetype === 'image/jpg') && (fileExt === '.jpeg' || fileExt === '.jpg')
        const isGif = req.file.mimetype === 'image/gif' && fileExt === '.gif'
        const isWebp = req.file.mimetype === 'image/webp' && fileExt === '.webp'

        if (!(isPng || isJpeg || isGif || isWebp)) {
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path)
            }
            return next(new BadRequestError('MIME-тип файла не соответствует его расширению'))
        }

        // ✅ 4. Проверка максимального размера файла
        if (req.file.size > MAX_FILE_SIZE) {
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path)
            }
            return next(new BadRequestError(`Файл слишком большой. Максимальный размер ${MAX_FILE_SIZE / 1024 / 1024}MB`))
        }

        // ✅ 5. Проверка минимального размера файла (защита от пустых/битых файлов)
        const MIN_FILE_SIZE = 100 // 100 байт (для небольших изображений)
        if (req.file.size < MIN_FILE_SIZE) {
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path)
            }
            return next(new BadRequestError(`Файл слишком маленький или поврежден. Минимальный размер ${MIN_FILE_SIZE} байт`))
        }

        // ✅ 6. Безопасное имя файла (НЕ содержит оригинальное имя)
        const safeFilename = generateSafeFilename(req.file.originalname)
        
        // ✅ 7. Переименовываем загруженный файл в безопасное имя
        const newFilePath = path.join(path.dirname(req.file.path), safeFilename)
        fs.renameSync(req.file.path, newFilePath)
        req.file.filename = safeFilename
        req.file.path = newFilePath

        // ✅ 8. Формируем путь для ответа (без оригинального имени)
        const uploadPath = process.env.UPLOAD_PATH || 'images'
        const fileName = `/${uploadPath}/${safeFilename}`

        // ✅ 9. Безопасное оригинальное имя (только для отображения, не влияет на путь)
        const safeOriginalName = req.file.originalname
            .replace(/[^a-zA-Z0-9а-яА-Я.\s]/g, '_')
            .slice(0, 100)

        return res.status(constants.HTTP_STATUS_CREATED).send({
            success: true,
            fileName,                    // ✅ Путь к файлу (не содержит оригинальное имя)
            originalName: safeOriginalName, // Оригинальное имя (только для информации)
            size: req.file.size,
            mimeType: req.file.mimetype,
        })
    } catch (error) {
        // Очистка временного файла при ошибке
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path)
            } catch (unlinkError) {
                console.error('Ошибка при удалении временного файла:', unlinkError)
            }
        }
        return next(error)
    }
}

export default {}