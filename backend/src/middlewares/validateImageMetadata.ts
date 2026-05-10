import { NextFunction, Request, Response } from 'express'
import sharp from 'sharp'

export function validateImageMetadata(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if (!req.file) {
        res.status(400).json({ error: 'Ошибка получения файла' })
        return
    }

    const filePath = req.file.path

    sharp(filePath)
        .metadata()
        .then((metadata) => {
            const width = metadata.width ?? 0
            const height = metadata.height ?? 0
            const minWidth = 50
            const minHeight = 50
            if (width < minWidth || height < minHeight) {
                res.status(400).json({
                    error: `Изображение слишком маленькое. Минимальный размер ${minWidth}x${minHeight}`,
                })
                return
            }
            next()
        })
        .catch(() => {
            res.status(500).json({ error: 'Передано не валидное изображение' })
        })
}