import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  userRole?: string;
  restaurantId?: string;
}

/**
 * Middleware de validação de RBAC e resiliência para rotas sensíveis da API.
 */
export function rbacMiddleware(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const roleHeader = (req.headers['x-user-role'] as string) || 'admin';
    req.userRole = roleHeader;
    req.restaurantId = (req.headers['x-restaurant-id'] as string) || 'rest-brasa-botanica';

    if (!allowedRoles.includes(roleHeader) && roleHeader !== 'admin') {
      res.status(403).json({
        error: 'Acesso negado para o perfil atual.',
        requiredRoles: allowedRoles,
        currentRole: roleHeader,
      });
      return;
    }
    next();
  };
}

/**
 * Middleware centralizado de tratamento de erros.
 */
export function errorHandlerMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[NexoRestô API Error]:', err.message);
  res.status(500).json({
    error: 'Erro interno no servidor de gestão do restaurante.',
    message: err.message,
    offlineFallbackRecommended: true,
  });
}
