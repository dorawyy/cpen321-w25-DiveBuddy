import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ParsedQs } from 'qs';


export const asyncHandler = <P = any, ResBody = any, ReqBody = any, ReqQuery = ParsedQs>(
  fn: (
    // any is mandatory here to ensure compatibility with both ParamsDictionary and unknown
    req: Request<P, any, ReqBody, ReqQuery>, // eslint-disable-line @typescript-eslint/no-explicit-any
    res: Response<ResBody>,
    next: NextFunction
  ) => Promise<void> | void
): RequestHandler<P, ResBody, ReqBody, ReqQuery> => {
  return (req, res, next): void => {
    const result = fn(req, res, next);
    if (result instanceof Promise) {
      result.catch((error: unknown) => {next(error as Error)});
    }
  };
}; 

