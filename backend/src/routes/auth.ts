import { Request, Response, Router } from 'express'
import {
    getCurrentUser,
    getCurrentUserRoles,
    login,
    logout,
    refreshAccessToken,
    register,
    updateCurrentUser,
} from '../controllers/auth'
import auth from '../middlewares/auth'
import {
    validateAuthentication,
    validateUserBody,
} from '../middlewares/validations'

const authRouter = Router()

// ❌ Удалён отдельный csrfProtection
// ❌ Удалён маршрут /csrf-token (он теперь в app.ts)

authRouter.get('/user', auth, getCurrentUser)
authRouter.patch('/me', auth, updateCurrentUser)
authRouter.get('/user/roles', auth, getCurrentUserRoles)

// CSRF проверяется глобально в app.ts, поэтому убираем csrfProtection из маршрутов
authRouter.post('/login', validateAuthentication, login)
authRouter.post('/register', validateUserBody, register)

authRouter.get('/token', refreshAccessToken)
authRouter.get('/logout', logout)

export default authRouter