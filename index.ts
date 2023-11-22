type Req = {
  query: Record<string, string>;
} & Request;

type Handler = (
  req: Req,
  next: () => Promise<Response> | Response
) => Promise<Response> | Response;

class Server {
  handlers: Map<string, Handler[]> = new Map();

  private method =
    (method: string) =>
    (path: string, ...handlers: Handler[]) => {
      this.handlers.set(`${method}:${path}`, handlers);
    };

  get = this.method("GET");
  post = this.method("POST");
  put = this.method("PUT");
  delete = this.method("DELETE");
  patch = this.method("PATCH");

  fetch = (req: Req) => {
    const url = new URL(req.url);
    const handlers = this.handlers.get(`${req.method}:${url.pathname}`) ?? [];

    function handle(...handlers: Handler[]): ReturnType<Handler> {
      const [handler, ...rest] = handlers;
      if (rest.length === 0) {
        return handler(req, () => new Response("404"));
      }
      return handler(req, () => handle(...rest));
    }

    return handle((req, next) => {
      req.query = Object.fromEntries(url.searchParams.entries());
      return next();
    }, ...handlers);
  };
}

const server = new Server();

server.get("/hello", () => new Response("hello"));

Bun.serve({
  port: 8080,
  fetch: server.fetch,
});
