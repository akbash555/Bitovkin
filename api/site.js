const {handler} = require('../server.cjs');

module.exports = (request, response) => {
  const incoming = new URL(request.url, 'http://localhost');
  const route = incoming.searchParams.get('__bytovkin_route');
  if (route !== null) {
    incoming.pathname = '/' + route.replace(/^\/+/, '');
    incoming.searchParams.delete('__bytovkin_route');
  }
  request.url = incoming.pathname + incoming.search;
  return handler(request, response);
};
